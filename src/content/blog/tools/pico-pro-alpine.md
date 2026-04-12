---
title: "Pico-Pro Platform on Alpine Linux - Buildroot-Free Implementation"
date: "2026-02-18"
categories:
  - Tools
tags:
  - Embedded Linux
  - Alpine Linux
  - Raspberry Pi
  - C++
  - USB Gadget
  - SPI
description: "Complete implementation guide for the Pico-Pro platform using Alpine Linux instead of Buildroot, featuring A/B partitioning, custom system controller, and SPI multi-processor architecture."
---

# Pico-Pro Platform on Alpine Linux: Buildroot-Free Implementation

This guide documents the Pico-Pro platform using **Alpine Linux** as the base OS instead of Buildroot. Alpine provides a production-ready embedded Linux experience with musl libc, OpenRC init system, and the apk package manager—all without the complexity of cross-compilation.

## Why Alpine Linux?

AspectBuildrootAlpine Linux**Build Time**30-90 minutesNone (pre-built)**Toolchain**Custom setup requiredPre-configured**Packages**Build from source17,000+ binary packages**Init System**Custom BusyBox initOpenRC (proven, minimal)**Security Updates**Full rebuild`apk upgrade`**Learning Curve**SteepModerate**Memory Overhead**~56 MB idle~78 MB idle
## System Architecture

graph TD
    subgraph "Alpine Linux Runtime"
        subgraph "System Controller Layer"
            SC[System Controller<br/>pico-pro-ctl] --> GPIO[GPIO Monitor<br/>detect_boot_mode]
            SC --> WD[Watchdog Manager<br/>watchdogd]
            SC --> USB[USB Gadget Control<br/>gadgetctl]
            SC --> HB[Heartbeat Monitor<br/>monitor_heartbeat]
        end
        
   plain     subgraph "A/B Partition Layer"
            PART[Partition Manager<br/>apk overlay] --> APP_A[App Partition A<br/>/alpine_a]
            PART --> APP_B[App Partition B<br/>/alpine_b]
            PART --> SHARED[/data/shared]
        end
    end
    
    subgraph "SPI Multi-Processor"
        SC -->|SPI Master| PICO[Pi Pico Slave<br/>Real-time I/O]
        SC -->|SPI Master| ESP32[ESP32 Slave<br/>Wi-Fi/IMU]
    end
    
    subgraph "Update Channel"
        USB -.->|Mass Storage| UPD[Update Partition<br/>/dev/mmcblk0p3]
        UPD --> PART
    end
## 1. Alpine Linux Installation

### 1.1 Initial Flash

# Download Alpine for Raspberry Pi Zero W (armv7/aarch64)
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/aarch64/alpine-rpi-3.19.0-aarch64.tar.gz

# Identify your SD card device (BE CAREFUL!)
lsblk
# sdc                  8:32   1  29.7G  0 disk
# ├─sdc1                8:33   1    47M  0 part  /boot
# └─sdc2                8:34   1   350M  0 part  /

# Flash to SD card
sudo tar -xzf alpine-rpi-3.19.0-aarch64.tar.gz -C /mnt/sdcard
sudo sync

# Mount partitions
sudo mount /dev/sdc1 /mnt/sdcard/boot
sudo mount /dev/sdc2 /mnt/sdcard
### 1.2 Configure A/B Partitions

# Create partition layout
# sdc1: boot (fat32, 47MB)
# sdc2: alpine_a (ext4, 350MB) - Active system
# sdc3: alpine_b (ext4, 350MB) - Inactive system  
# sdc4: data (ext4, remaining) - Shared data

# Format partitions
sudo mkfs.vfat -F 32 /dev/sdc1
sudo mkfs.ext4 -L alpine_a /dev/sdc2
sudo mkfs.ext4 -L alpine_b /dev/sdc3
sudo mkfs.ext4 -L data /dev/sdc4

# Mount and configure boot
sudo mount /dev/sdc2 /mnt/alpine_a
sudo mount /dev/sdc1 /mnt/alpine_a/boot
sudo mount /dev/sdc4 /mnt/alpine_a/data

# Copy Alpine root
sudo tar -xzf alpine-rpi-3.19.0-aarch64.tar.gz -C /mnt/alpine_a
### 1.3 Configure System for A/B Boot

# /mnt/alpine_a/etc/fstab
cat > /mnt/alpine_a/etc/fstab << 'EOF'
/dev/mmcblk0p2 / ext4 defaults,noatime 0 1
/dev/mmcblk0p1 /boot vfat defaults 0 2
/dev/mmcblk0p4 /data ext4 defaults,noatime 0 2
tmpfs /tmp tmpfs defaults,nosuid,nodev 0 0
EOF

# /mnt/alpine_a/etc/inittab
cat > /mnt/alpine_a/etc/inittab << 'EOF'
# Init process
::sysinit:/sbin/openrc sysinit
::wait:/sbin/openrc boot
::shutdown:/sbin/openrc shutdown
# Console getty
tty1::respawn:/sbin/getty 115200 tty1
ttyAMA0::respawn:/sbin/getty 115200 ttyAMA0
# System controller runs as service
::once:/usr/local/bin/pico-pro-ctl
EOF
## 2. System Controller Implementation

### 2.1 Main Controller (`/usr/local/bin/pico-pro-ctl`)

// pico-pro-ctl.cpp
// System controller for Pico-Pro running Alpine Linux
// Replaces Buildroot init with a proper watchdog/heartbeat system

#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <functional>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

// ============================================================================
// Constants
// ============================================================================
constexpr int GPIO_BOOT_PIN = 26;       // Boot mode select (mass storage)
constexpr int GPIO_LED_PIN = 47;        // Status LED
constexpr const char* HEARTBEAT_PIPE = "/tmp/app_heartbeat";
constexpr const int HEARTBEAT_TIMEOUT_MS = 5000;
constexpr const char* WATCHDOG_DEV = "/dev/watchdog0";
constexpr const int WATCHDOG_TIMEOUT = 30;
constexpr const char* BOOT_PARTITION_FILE = "/data/.boot_partition";
constexpr const char* CONSOLE_PORT = "/dev/ttyAMA0";
constexpr const char* DEBUG_PORT = "/dev/tty1";

// ============================================================================
// Boot Modes
// ============================================================================
enum class BootMode {
    MASS_STORAGE,  // USB mass storage mode for firmware update
    NORMAL         // Normal operation with user application
};

// ============================================================================
// System States
// ============================================================================
enum class SystemState {
    STARTING,      // Initial boot
    RUNNING,       // Normal operation
    ERROR,         // Error state
    UPDATING       // Firmware update in progress
};

// ============================================================================
// Partition Management
// ============================================================================
enum class Partition {
    SYSTEM,        // Alpine system partition
    APP_A,         // Application slot A
    APP_B          // Application slot B
};

// ============================================================================
// GPIO Control (using libgpiod on Alpine)
// ============================================================================
class GPIOControl {
private:
    struct gpiod_chip* chip = nullptr;
    struct gpiod_line* line = nullptr;
    int pin_number;

public:
    GPIOControl(int pin, const char* chip_path = "/dev/gpiochip0") {
        pin_number = pin;
        chip = gpiod_chip_open(chip_path);
        if (!chip) {
            std::cerr << "Failed to open GPIO chip" << std::endl;
            return;
        }
        
   plain     line = gpiod_chip_get_line(chip, pin);
        if (!line) {
            std::cerr << "Failed to get GPIO line " << pin << std::endl;
            return;
        }
    }

    ~GPIOControl() {
        if (line) gpiod_line_release(line);
        if (chip) gpiod_chip_close(chip);
    }

    int read() {
        if (!line) return -1;
        
        int ret = gpiod_line_request_input(line, "pico-pro");
        if (ret < 0) {
            std::cerr << "Failed to request GPIO as input" << std::endl;
            return -1;
        }
        
        return gpiod_line_get_value(line);
    }

    int write(int value) {
        if (!line) return -1;
        
        int ret = gpiod_line_request_output(line, "pico-pro");
        if (ret < 0) {
            std::cerr << "Failed to request GPIO as output" << std::endl;
            return -1;
        }
        
        return gpiod_line_set_value(line, value);
    }

    bool isValid() const { return line != nullptr; }
};

// ============================================================================
// LED Controller (Status indication)
// ============================================================================
class LEDController {
private:
    int led_pin;
    std::thread* blink_thread = nullptr;
    std::atomic<bool> running{false};
    std::atomic<SystemState> current_state{SystemState::STARTING};

public:
    LEDController(int pin) : led_pin(pin) {}
    
   plain ~LEDController() {
        stop();
    }

    void setState(SystemState state) {
        current_state = state;
    }

    void fastBlink() {
        // Implemented via hardware PWM or software toggle
        // See Section 2.3 for PWM configuration
    }

    void slowBlink() {
        // Slow blink pattern for normal operation
    }

    void solid() {
        // Solid on for error state
    }

    void off() {
        // LED off
    }

    void start() {
        running = true;
        blink_thread = new std::thread([this]() {
            while (running) {
                switch (current_state) {
                    case SystemState::STARTING:
                        fastBlink();
                        break;
                    case SystemState::RUNNING:
                        slowBlink();
                        break;
                    case SystemState::ERROR:
                        solid();
                        break;
                    case SystemState::UPDATING:
                        fastBlink();
                        break;
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        });
    }

    void stop() {
        running = false;
        if (blink_thread && blink_thread->joinable()) {
            blink_thread->join();
            delete blink_thread;
            blink_thread = nullptr;
        }
    }
};

// ============================================================================
// Watchdog Manager
// ============================================================================
class WatchdogManager {
private:
    int watchdog_fd = -1;
    int timeout_seconds;
    std::atomic<bool> enabled{false};

public:
    WatchdogManager(int timeout = WATCHDOG_TIMEOUT) : timeout_seconds(timeout) {}

   plain bool init() {
        watchdog_fd = open(WATCHDOG_DEV, O_WRONLY);
        if (watchdog_fd < 0) {
            std::cerr << "Failed to open watchdog device" << std::endl;
            return false;
        }
        
        // Set timeout (write to watchdog magic close timeout)
        std::ofstream timeout_file("/sys/class/watchdog/watchdog0/timeout");
        if (timeout_file.is_open()) {
            timeout_file << timeout_seconds;
            timeout_file.close();
        }
        
        enabled = true;
        return true;
    }

    void pet() {
        if (watchdog_fd >= 0 && enabled) {
            write(watchdog_fd, "1", 1);
        }
    }

    void disable() {
        if (watchdog_fd >= 0) {
            enabled = false;
            // Magic close - write 'V' to close cleanly
            write(watchdog_fd, "V", 1);
            close(watchdog_fd);
            watchdog_fd = -1;
        }
    }

    ~WatchdogManager() {
        disable();
    }
};

// ============================================================================
// Heartbeat Monitor
// ============================================================================
class HeartbeatMonitor {
private:
    std::string pipe_path;
    int timeout_ms;
    std::atomic<uint64_t> last_heartbeat{0};
    std::thread* monitor_thread = nullptr;
    std::atomic<bool> running{false};
    std::function<void()> on_timeout_callback;

public:
    HeartbeatMonitor(const std::string& pipe, int timeout)
        : pipe_path(pipe), timeout_ms(timeout) {}

   plain void setTimeoutCallback(std::function<void()> cb) {
        on_timeout_callback = cb;
    }

    void start() {
        running = true;
        monitor_thread = new std::thread([this]() {
            // Create named pipe if it doesn't exist
            mkfifo(pipe_path.c_str(), 0666);
            
            while (running) {
                auto now = std::chrono::steady_clock::now();
                auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                    now.time_since_epoch()).count() - last_heartbeat.load();
                
                if (last_heartbeat > 0 && elapsed > timeout_ms) {
                    std::cerr << "Heartbeat timeout detected!" << std::endl;
                    if (on_timeout_callback) {
                        on_timeout_callback();
                    }
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        });
    }

    void signal() {
        last_heartbeat = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count();
    }

    void stop() {
        running = false;
        if (monitor_thread && monitor_thread->joinable()) {
            monitor_thread->join();
            delete monitor_thread;
            monitor_thread = nullptr;
        }
        unlink(pipe_path.c_str());
    }
};

// ============================================================================
// Partition Manager
// ============================================================================
class PartitionManager {
private:
    std::string boot_partition_file;

public:
    PartitionManager(const std::string& boot_file) : boot_partition_file(boot_file) {}

   plain Partition getActivePartition() {
        std::ifstream file(boot_partition_file);
        std::string content;
        
        if (file.is_open()) {
            std::getline(file, content);
            file.close();
        }
        
        if (content.find("A") != std::string::npos) {
            return Partition::APP_A;
        } else if (content.find("B") != std::string::npos) {
            return Partition::APP_B;
        }
        
        return Partition::APP_A;  // Default to A
    }

    bool setActivePartition(Partition part) {
        std::ofstream file(boot_partition_file);
        if (!file.is_open()) {
            std::cerr << "Failed to open boot partition file" << std::endl;
            return false;
        }
        
        switch (part) {
            case Partition::APP_A:
                file << "A";
                break;
            case Partition::APP_B:
                file << "B";
                break;
            default:
                file << "A";
                break;
        }
        
        file.close();
        return true;
    }

    bool switchToNextPartition() {
        Partition current = getActivePartition();
        Partition next = (current == Partition::APP_A) ? Partition::APP_B : Partition::APP_A;
        return setActivePartition(next);
    }
};

// ============================================================================
// USB Gadget Controller
// ============================================================================
class USBGadgetController {
private:
    std::atomic<bool> mass_storage_enabled{false};

public:
    bool enableMassStorage(const std::string& device_path) {
        // Use configfs to configure USB gadget
        std::string gadget_dir = "/sys/kernel/config/usb_gadget/gadget";
        
   plain     // Create gadget directory
        mkdir(gadget_dir.c_str(), 0755);
        
        // Configure gadget properties
        std::ofstream idVendor(gadget_dir + "/idVendor");
        idVendor << "0x1d6b";  // Linux Foundation
        idVendor.close();
        
        std::ofstream idProduct(gadget_dir + "/idProduct");
        idProduct << "0x0104";  // Gadget Mass Storage
        idProduct.close();
        
        // Enable the gadget
        std::ofstreamUDC(gadget_dir + "/UDC");
        // UDC should contain the USB controller name
        mass_storage_enabled = true;
        
        return true;
    }

    void disableMassStorage() {
        mass_storage_enabled = false;
        // Remove gadget configuration
        std::string gadget_dir = "/sys/kernel/config/usb_gadget/gadget";
        rmdir(gadget_dir.c_str());
    }

    bool isMassStorageEnabled() const {
        return mass_storage_enabled;
    }
};

// ============================================================================
// Main Controller Class
// ============================================================================
class SystemController {
private:
    GPIOControl* boot_mode_gpio;
    LEDController* led;
    WatchdogManager* watchdog;
    HeartbeatMonitor* heartbeat;
    PartitionManager* partitions;
    USBGadgetController* usb_gadget;
    
   plain std::atomic<BootMode> current_boot_mode{BootMode::NORMAL};
    std::atomic<SystemState> current_state{SystemState::STARTING};

public:
    SystemController() {
        boot_mode_gpio = new GPIOControl(GPIO_BOOT_PIN);
        led = new LEDController(GPIO_LED_PIN);
        watchdog = new WatchdogManager();
        heartbeat = new HeartbeatMonitor(HEARTBEAT_PIPE, HEARTBEAT_TIMEOUT_MS);
        partitions = new PartitionManager(BOOT_PARTITION_FILE);
        usb_gadget = new USBGadgetController();
    }

   plain ~SystemController() {
        delete boot_mode_gpio;
        delete led;
        delete watchdog;
        delete heartbeat;
        delete partitions;
        delete usb_gadget;
    }

    bool initialize() {
        std::cout << "Initializing Pico-Pro System Controller..." << std::endl;
        
        // Detect boot mode from GPIO
        if (boot_mode_gpio->isValid()) {
            int boot_pin_value = boot_mode_gpio->read();
            if (boot_pin_value == 0) {
                current_boot_mode = BootMode::MASS_STORAGE;
                std::cout << "Boot mode: Mass Storage (firmware update)" << std::endl;
            } else {
                current_boot_mode = BootMode::NORMAL;
                std::cout << "Boot mode: Normal Operation" << std::endl;
            }
        }
        
        // Initialize watchdog
        if (!watchdog->init()) {
            std::cerr << "Warning: Watchdog initialization failed" << std::endl;
        }
        
        // Configure heartbeat timeout callback
        heartbeat->setTimeoutCallback([this]() {
            std::cerr << "Application heartbeat timeout - triggering failsafe" << std::endl;
            current_state = SystemState::ERROR;
        });
        
        // Start LED controller
        led->start();
        
        // Start heartbeat monitor
        heartbeat->start();
        
        // Check for pending firmware updates
        checkForUpdates();
        
        current_state = SystemState::RUNNING;
        led->setState(SystemState::RUNNING);
        
        std::cout << "System Controller initialized successfully" << std::endl;
        return true;
    }

    void checkForUpdates() {
        // Check update partition for new firmware
        std::string update_marker = "/mnt/update/.update_marker";
        std::ifstream update_file(update_marker);
        
        if (update_file.good()) {
            std::cout << "Firmware update detected!" << std::endl;
            current_state = SystemState::UPDATING;
            led->setState(SystemState::UPDATING);
            
            // Perform update (partition switch)
            if (partitions->switchToNextPartition()) {
                std::cout << "Partition switched. Rebooting..." << std::endl;
                system("reboot");
            }
        }
    }

    void run() {
        std::cout << "Starting main control loop..." << std::endl;
        
        while (current_state != SystemState::ERROR) {
            // Pet the watchdog
            watchdog->pet();
            
            // Check for heartbeat from main application
            // (Application should write to heartbeat pipe periodically)
            
            // Handle boot mode changes
            if (boot_mode_gpio->isValid()) {
                int value = boot_mode_gpio->read();
                if (value == 0 && current_boot_mode == BootMode::NORMAL) {
                    std::cout << "Switching to Mass Storage mode..." << std::endl;
                    current_boot_mode = BootMode::MASS_STORAGE;
                    usb_gadget->enableMassStorage("/dev/mmcblk0p3");
                } else if (value == 1 && current_boot_mode == BootMode::MASS_STORAGE) {
                    std::cout << "Disabling Mass Storage mode..." << std::endl;
                    current_boot_mode = BootMode::NORMAL;
                    usb_gadget->disableMassStorage();
                }
            }
            
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        // Error state - solid LED, wait for recovery
        std::cerr << "System in ERROR state. Awaiting recovery..." << std::endl;
        while (current_state == SystemState::ERROR) {
            watchdog->pet();
            std::this_thread::sleep_for(std::chrono::milliseconds(1000));
        }
    }

    void shutdown() {
        std::cout << "Shutting down System Controller..." << std::endl;
        current_state = SystemState::ERROR;  // Trigger immediate watchdog timeout
        heartbeat->stop();
        led->stop();
        watchdog->disable();
    }
};

// ============================================================================
// Signal Handlers
// ============================================================================
std::atomic<SystemController*> g_controller{nullptr};

void signal_handler(int signal) {
    std::cout << "Received signal " << signal << ", shutting down..." << std::endl;
    auto ctrl = g_controller.load();
    if (ctrl) {
        ctrl->shutdown();
    }
    exit(0);
}

// ============================================================================
// Main Entry Point
// ============================================================================
int main(int argc, char* argv[]) {
    std::cout << "========================================" << std::endl;
    std::cout << "   Pico-Pro System Controller v1.0" << std::endl;
    std::cout << "   Alpine Linux Runtime" << std::endl;
    std::cout << "========================================" << std::endl;

   plain // Set up signal handlers
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGSEGV, signal_handler);

    // Initialize and run controller
    SystemController controller;
    g_controller = &controller;

    if (!controller.initialize()) {
        std::cerr << "Failed to initialize system controller" << std::endl;
        return 1;
    }

    controller.run();

    return 0;
}
### 2.2 Building the Controller

# Install build dependencies on Alpine
apk add gcc g++ make musl-dev gpiod-dev

# Compile
aarch64-linux-gnu-g++ -o pico-pro-ctl pico-pro-ctl.cpp -lgpiod -lpthread -std=c++17 -O2

# Install
install -Dm755 pico-pro-ctl /usr/local/bin/pico-pro-ctl
install -Dm644 pico-pro-ctl.service /etc/init.d/pico-pro-ctl
rc-update add pico-pro-ctl default
### 2.3 LED PWM Configuration

# /etc/init.d/pico-pro-led
#!/sbin/openrc-run

name="pico-pro-led"
description="Pico-Pro status LED controller"
command="/usr/local/bin/pico-pro-led"
command_background=true
pidfile="/run/${RC_SVCNAME}.pid"

depend() {
    need localmount
    after bootmisc
}

start() {
    ebegin "Starting ${name}"
    
   plain # Configure LED pin for PWM
    echo "0" > /sys/class/gpio/export 2>/dev/null
    echo "out" > /sys/class/gpio/gpio47/direction
    
    # Create PWM device link
    [ -d /sys/class/pwm/pwmchip0 ] && echo "0" > /sys/class/pwm/pwmchip0/export
    
    eend $?
}
### 2.4 OpenRC Service Script

# /etc/init.d/pico-pro-ctl
#!/sbin/openrc-run

name="pico-pro-ctl"
description="Pico-Pro System Controller"
command="/usr/local/bin/pico-pro-ctl"
command_background=true
pidfile="/run/${RC_SVCNAME}.pid"
output_log="/var/log/pico-pro-ctl.log"
error_log="/var/log/pico-pro-ctl.err"

depend() {
    need localmount
    after bootmisc
    want gpiod
}

start_pre() {
    checkpath --directory --owner root:root --mode 0755 /run
    checkpath --directory --owner root:root --mode 0755 /var/log
}
## 3. SPI Multi-Processor Setup

### 3.1 SPI Device Configuration

# Load SPI device tree overlay (if not already loaded)
echo "dtoverlay=spi0-1cs" >> /mnt/alpine_a/boot/config.txt

# Install SPI tools
apk add spi-tools

# Test SPI connection
spidev_test -D /dev/spidev0.0 -s 1000000
### 3.2 SPI Driver for Pi Pico

See the [SPI Driver Documentation](/blog/tools/spi-drivers) for complete C++ driver implementation for communication between Alpine Linux and RP2040.

// pico-spi-client.cpp
// Lightweight SPI client for Alpine Linux

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <linux/spi/spidev.h>
#include <sys/ioctl.h>
#include <unistd.h>

class SPIClient {
private:
    int fd;
    uint8_t mode;
    uint8_t bits_per_word;
    uint32_t speed;

public:
    SPIClient(const char* device) {
        fd = open(device, O_RDWR);
        if (fd < 0) {
            perror("Can't open SPI device");
            return;
        }
        
   plain     mode = SPI_MODE_0;
        bits_per_word = 8;
        speed = 10000000;  // 10 MHz
        
        ioctl(fd, SPI_IOC_WR_MODE, &mode);
        ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits_per_word);
        ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed);
    }

    ~SPIClient() {
        if (fd >= 0) close(fd);
    }

    bool transfer(const uint8_t* tx, uint8_t* rx, size_t len) {
        struct spi_ioc_transfer tr = {
            .tx_buf = (unsigned long)tx,
            .rx_buf = (unsigned long)rx,
            .len = len,
            .speed_hz = speed,
            .delay_usecs = 0,
            .bits_per_word = bits_per_word,
        };

        int ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
        return ret >= 0;
    }

    // Send command to Pico
    bool ping() {
        uint8_t tx[] = {0x10};  // PING command
        uint8_t rx[1] = {0};
        return transfer(tx, rx, 1) && rx[0] == 0xAA;
    }

    // Read sensor data
    bool readSensors(uint8_t* buffer, size_t len) {
        uint8_t tx[] = {0x20};  // READ_SENSORS command
        return transfer(tx, buffer, len);
    }

    // Write motor values
    bool writeMotors(const uint16_t* motors, size_t count) {
        uint8_t tx[1 + count * 2];
        tx[0] = 0x30;  // WRITE_MOTORS command
        memcpy(&tx[1], motors, count * 2);
        uint8_t rx[1] = {0};
        return transfer(tx, rx, 1 + count * 2) && rx[0] == 0xAC;
    }
};
## 4. USB Gadget Configuration

### 4.1 Enable USB Gadget at Boot

# /etc/local.d/usb-gadget.start
#!/bin/sh
# Configure USB gadget mode at boot

# Load kernel modules
modprobe libcomposite

# Create gadget directory
mkdir -p /sys/kernel/config/usb_gadget/gadget
cd /sys/kernel/config/usb_gadget/gadget

# Set device properties
echo "0x1d6b" > idVendor  # Linux Foundation
echo "0x0104" > idProduct # Gadget Mass Storage
echo "0x0100" > bcdDevice
echo "0x0200" > bcdUSB     # USB 2.0

# English strings
mkdir -p strings/0x409
echo "1234567890abcdef" > strings/0x409/serialnumber
echo "Pico-Pro" > strings/0x409/manufacturer
echo "Pico-Pro USB Device" > strings/0x409/product

# Mass storage function
mkdir -p functions/mass_storage.0
echo 1 > functions/mass_storage.0/lun.0/removable
echo 0 > functions/mass_storage.0/lun.0/ro
echo "/dev/mmcblk0p3" > functions/mass_storage.0/lun.0/file

# Create configuration
mkdir -p configs/c.1
ln -s functions/mass_storage.0 configs/c.1/strings/0x409/configuration

# Bind gadget
UDC=$(ls /sys/class/udc | head -1)
echo $UDC > UDC

echo "USB Gadget configured"
### 4.2 Make Executable

`chmod +x /etc/local.d/usb-gadget.start`
## 5. Networking Setup

### 5.1 Configure Wi-Fi (if using Wi-Fi dongle)

# /etc/wpa_supplicant/wpa_supplicant.conf
ctrl_interface=/run/wpa_supplicant
update_config=1

network={
    ssid="YourNetwork"
    psk="YourPassword"
    key_mgmt=WPA-PSK
}

# Enable at boot
rc-update add wpa_supplicant boot
### 5.2 Static IP Configuration

# /etc/network/interfaces
auto lo
iface lo inet loopback

auto wlan0
iface wlan0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf
## 6. System Monitoring

### 6.1 Resource Monitoring Script

#!/bin/sh
# /usr/local/bin/pico-pro-monitor

while true; do
    # CPU Temperature
    temp=$(cat /sys/class/thermal/thermal_zone0/temp)
    temp=$((temp / 1000))
    
   plain # CPU Usage
    cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    # Memory Usage
    mem=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
    
    # Disk Usage
    disk=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    
    # Log
    logger -t pico-pro-monitor "CPU:${temp}C CPU:${cpu}% MEM:${mem}% DISK:${disk}%"
    
    sleep 60
done
### 6.2 Critical Temperature Shutdown

#!/bin/sh
# /usr/local/bin/pico-pro-temp-guard
# Emergency shutdown if temperature exceeds threshold

MAX_TEMP=80

while true; do
    temp=$(cat /sys/class/thermal/thermal_zone0/temp)
    temp=$((temp / 1000))
    
   plain if [ "$temp" -gt "$MAX_TEMP" ]; then
        logger -t pico-pro-temp "CRITICAL: Temperature ${temp}C exceeded ${MAX_TEMP}C, shutting down!"
        
        # Notify Pico to stop motors first
        # (implement SPI command to emergency stop)
        
        # Sync and shutdown
        sync
        poweroff
        exit 0
    fi
    
    sleep 10
done
## 7. Performance Tuning

### 7.1 CPU Governor

# Set performance mode
echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Add to boot
echo "echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor" >> /etc/local.d/cpu-tweak.start
### 7.2 Kernel Parameters

# /boot/cmdline.txt modifications
console=ttyAMA0,115200 elevator=noop root=/dev/mmcblk0p2 rootwait quiet logo.nologo
### 7.3 Disable Unneeded Services

# List services
rc-status

# Disable unnecessary services
rc-update del hwclock boot
rc-update del swclock boot
rc-update del bootmisc boot
rc-update del modules boot
rc-update del hostname boot
rc-update del bootlogd boot
rc-update del acpid default
## 8. Complete Startup Sequence

sequenceDiagram
    participant Boot as Bootloader
    participant Kernel as Linux Kernel
    participant RC as OpenRC Init
    participant USB as USB Gadget
    participant SC as System Controller
    participant HW as Hardware (Pico)
    
   plain Boot->>Kernel: Load kernel + DTB
    Kernel->>RC: Start init
    RC->>RC: Run sysinit scripts
    RC->>USB: Configure USB gadget
    Note over USB: Wait for mode selection
    RC->>SC: Start pico-pro-ctl
    SC->>HW: Initialize SPI
    SC->>SC: Check update partition
    alt Update Available
        SC->>SC: Switch partition
        SC->>Kernel: Reboot
    else Normal Boot
        SC->>SC: Enter main loop
        SC->>HW: Start heartbeat
        Note over HW: Pico begins control loop
    end
## 9. Troubleshooting

### 9.1 Common Issues

IssueCauseSolutionSPI not respondingDevice tree overlay not loadedAdd to `/boot/config.txt`Watchdog timeout on bootSlow boot sequenceIncrease WATCHDOG_TIMEOUTUSB gadget not detectedUDC not boundCheck USB PHY connectionHeartbeat timeoutApplication crashCheck `/var/log/pico-pro-ctl.err`LED not workingPWM not configuredLoad PWM overlay
### 9.2 Debug Commands

# Check GPIO status
gpioinfo

# Check SPI devices
ls -la /dev/spidev*

# Check watchdog
cat /dev/watchdog0
timeout 5 cat /dev/watchdog0

# Check running processes
ps aux | grep pico

# View system logs
logread -f

# Check memory
free -h

# Check CPU
top -bn1
## 10. Source Code

Full source code available at: [`src/content/blog/tools/pico-pro-alpine/`](/src/content/blog/tools/pico-pro-alpine/)

---

This guide provides a complete foundation for running Pico-Pro on Alpine Linux. For the complete SPI driver implementation between Alpine Linux and the Pi Pico, see the [SPI Driver Documentation](/blog/tools/spi-drivers).