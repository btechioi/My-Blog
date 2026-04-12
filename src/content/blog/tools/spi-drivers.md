---
title: "SPI Driver Documentation"
date: "2026-04-07"
categories:
  - Tools
tags:
  - Embedded Linux
  - Raspberry Pi
  - RP2040
  - SPI
  - C++
  - Pico-Pro
description: "Complete technical documentation for cross-platform SPI master-slave communication between Linux (Raspberry Pi) and RP2040 (Pi Pico). Includes driver APIs, wiring diagrams, and usage examples."
---

# SPI Driver Documentation

This guide covers the complete SPI communication stack for the Pico-Pro platform, enabling high-speed data exchange between a Linux host (Pico-Pro/Raspberry Pi Zero W) and RP2040-based slaves (Pi Pico).

## Overview

The driver suite consists of two components:

ComponentPlatformPurpose`spi_master_linux`Linux (Pico-Pro)SPI master with multi-slave support`spi_slave_pico`RP2040 (Pi Pico)SPI slave with motor/ultrasonic control
Key features:

- **10 MHz SPI** transfers for sub-millisecond latency
- **Multi-slave architecture** with automatic chip select management
- **Thread-safe** operations on Linux side
- **Hardware IRQ** support for event-driven communication
- **Automatic retry** on transfer failures

## Hardware Wiring

### Pin Connections (Pi Pico → Pico-Pro)

Pi Pico          Pico-Pro (SPI0)
--------         -------------
GP18 (SCK)  →    GPIO 18 (SCK)
GP19 (MOSI) →    GPIO 19 (MOSI)  
GP16 (MISO) ←    GPIO 16 (MISO)
GP17 (CS)   ←    GPIO 17 (CS)

Optional IRQ:
GP20          →    GPIO 20
### SPI Mode Configuration

ParameterValueDescriptionMode0CPOL=0, CPHA=0 (rising edge, sample on first edge)Bits per word8Standard byte transferSpeed10 MHzMaximum reliable speed for long wiresCSActive LowGPIO-driven manual chip select
## Linux SPI Master Driver

### Installation

Copy the driver files to your project:

`cp spi_master_linux.h spi_master_linux.cpp /path/to/project/`
Add to your CMakeLists.txt:

add_library(spi_master STATIC spi_master_linux.cpp)
target_link_libraries(spi_master pthread)
### Basic Usage

#include "spi_master_linux.h"

int main() {
    SPIMasterLinux spi;
    
   plain // Add slave device
    spi.add_slave(
        SPISlaveID::PICO,     // Slave identifier
        "/dev/spidev0.0",     // SPI device path
        8,                    // GPIO for chip select
        24                    // GPIO for IRQ (optional)
    );
    
    // Configure SPI parameters
    spi.set_speed(10'000'000);    // 10 MHz
    spi.set_mode(SPI_MODE_0);     // Mode 0
    
    // Initialize
    if (!spi.initialize()) {
        fprintf(stderr, "Init failed: %s\n", spi.get_error().c_str());
        return 1;
    }
    
    // Ping slave
    if (spi.ping(SPISlaveID::PICO)) {
        printf("Slave responding!\n");
    }
    
    return 0;
}
### Multi-Slave Configuration

// Configure multiple slaves on same SPI bus
spi.add_slave(SPISlaveID::PICO, "/dev/spidev0.0", 8, 24);
spi.add_slave(SPISlaveID::ESP32, "/dev/spidev0.1", 7, 25);

// Each slave has independent CS and IRQ pins
spi.set_speed(10'000'000);
spi.initialize();

// Communication with specific slave
spi.write_motors(SPISlaveID::PICO, motor_data);
spi.read_imu(SPISlaveID::ESP32, imu_data);
### Motor Control

MotorData motors;
motors.armed = 1;
motors.motor[0] = 1000;  // Front-left
motors.motor[1] = 1000;  // Front-right
motors.motor[2] = 1000;  // Back-left
motors.motor[3] = 1000;  // Back-right

// Arm ESCs
spi.arm_motors(SPISlaveID::PICO);

// Write motor values (1000-2000 µs pulse width)
spi.write_motors(SPISlaveID::PICO, motors);

// Emergency stop
spi.emergency_stop();
### Sensor Reading

// Read ultrasonic sensors
UltrasonicData ultrasonic;
if (spi.read_ultrasonic(SPISlaveID::PICO, ultrasonic)) {
    printf("Front: %u cm, Back: %u cm\n", 
           ultrasonic.front, ultrasonic.back);
}

// Read all sensors at once
SensorPacket packet;
spi.read_all_sensors(SPISlaveID::PICO, packet);
### IRQ Callback Setup

spi.set_irq_callback([](SPISlaveID slave, uint8_t irq_data) {
    printf("IRQ from slave %d, data: 0x%02x\n", 
           static_cast<int>(slave), irq_data);
});

// Start polling-based IRQ monitor
spi.start_irq_monitor(100);  // Poll every 100 µs
## RP2040 SPI Slave Driver

### Project Setup

Add to your Pico SDK project `CMakeLists.txt`:

add_executable(my_slave
    spi_slave_pico.cpp
    your_main.cpp
)

pico_add_extra_outputs(my_slave)
target_link_libraries(my_slave 
    pico_stdlib 
    hardware_spi 
    hardware_pwm
)
### Basic Initialization

#include "spi_slave_pico.h"

int main() {
    stdio_init_all();
    
   plain // Initialize SPI slave with default pins
    spi_slave_init();  // CS=17, SCK=18, MOSI=19, MISO=16
    
    // Or with custom pins:
    // spi_slave_init(17, 18, 19, 16);
    
    // Initialize motor PWM outputs
    motor_init(4, nullptr);  // 4 motors on default pins (10-13)
    
    // Initialize ultrasonic sensors
    ultrasonic_init();
    
    // Initialize IRQ pin (optional)
    irq_init(20);
    
    // Main loop
    while (true) {
        // Update uptime counter
        g_uptime_ms++;
        sleep_ms(1);
        
        // Trigger ultrasonic every 50ms
        static absolute_time_t last_trigger = 0;
        if (absolute_time_diff_us(last_trigger, get_absolute_time()) > 50000) {
            ultrasonic_trigger_all();
            last_trigger = get_absolute_time();
        }
        
        // Process ultrasonic echo timing
        ultrasonic_update();
        
        // Small delay
        sleep_us(100);
    }
}
### Motor Control API

// Initialize motors (default pins: 10, 11, 12, 13)
motor_init(4, nullptr);

// Set individual motor (1000-2000 µs)
motor_set(0, 1500);  // Center/throttle off

// Set all motors at once
uint16_t pulses[4] = {1000, 1000, 1000, 1000};
motor_set_all(pulses, 4);

// Arm motors (enables PWM output)
motor_arm();

// Disarm motors (disables PWM, goes low)
motor_disarm();

// Check armed state
if (motor_is_armed()) {
    printf("Motors are armed!\n");
}
### Ultrasonic Sensor API

// Trigger all sensors (sends 10µs pulse)
ultrasonic_trigger_all();

// Process echo timing (call frequently in main loop)
ultrasonic_update();

// Read all distances
UltrasonicData data;
ultrasonic_read_all(&data);
printf("F: %u, B: %u, L: %u, R: %u cm\n",
       data.front_cm, data.back_cm, 
       data.left_cm, data.right_cm);

// Read single sensor
uint16_t front = ultrasonic_read(0);
### IRQ Signaling

// Initialize IRQ pin
irq_init(20);

// Trigger IRQ to notify master
irq_trigger();  // Sends 10µs low pulse

// Check if initialized
extern bool g_irq_initialized;  // Available as extern
## Communication Protocol

### Command Format

All transfers follow this format:

Master → Slave: [CMD_BYTE] [PAYLOAD...]
Slave → Master: [STATUS] [RESPONSE...]
### Command Reference

CommandValueDescriptionResponse`PING`0x10Test connection0xAA`GET_STATUS`0x11Get system status6 bytes`GET_VERSION`0x13Get firmware version32 bytes`READ_ULTRASONIC`0x21Read ultrasonic12 bytes`READ_SENSORS`0x20Read all sensors103 bytes`WRITE_MOTORS`0x30Write motor PWMACK/NACK`ARM_MOTORS`0x31Arm ESCsACK/NACK`DISARM_MOTORS`0x32Disarm ESCsACK/NACK`EMERGENCY_STOP`0xFFStop all outputsACK
### Response Codes

CodeValueMeaningACK0xACCommand acknowledgedNACK0x3FCommand failedERROR0xEEError condition
## Performance Notes

### Timing Characteristics

OperationTypical LatencySPI transfer (10 bytes)~10 µsRound-trip command~50-100 µsIRQ callback< 1 ms
### Optimization Tips

1. **Use DMA for bulk transfers** if implementing ESP32 slave
2. **Batch sensor reads** with READ_SENSORS instead of individual commands
3. **Enable IRQ mode** for event-driven updates instead of polling
4. **Reduce SPI speed** to 1 MHz for cables longer than 30cm

## Troubleshooting

### Common Issues

**Slave not responding:**

# Check SPI device exists
ls -la /dev/spidev*

# Verify chip select pin
cat /sys/class/gpio/gpio8/value

# Check kernel messages
dmesg | grep spi
**Motor not spinning:**

- Ensure motors are armed (motor_arm() called)
- Check PWM pin connections (default: GPIO 10-13)
- Verify ESC is calibrated for 1000-2000 µs range

**Ultrasonic readings all zeros:**

- Check trigger/echo pin connections
- Ensure ultrasonic_update() is called frequently
- Verify sensors are powered (5V)

## Complete Example

### Master Side (Linux)

#include "spi_master_linux.h"
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    SPIMasterLinux spi;
    
   plain // Configure
    spi.add_slave(SPISlaveID::PICO, "/dev/spidev0.0", 8, 24);
    spi.set_speed(10'000'000);
    
    if (!spi.initialize()) {
        std::cerr << "SPI init failed: " << spi.get_error() << std::endl;
        return 1;
    }
    
    // Arm motors
    spi.arm_motors(SPISlaveID::PICO);
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Main control loop
    MotorData motors = {};
    motors.armed = 1;
    
    for (int i = 0; i < 100; i++) {
        // Read sensors
        UltrasonicData us;
        spi.read_ultrasonic(SPISlaveID::PICO, us);
        
        // Simple obstacle avoidance
        if (us.front < 50) {
            motors.motor[0] = 1100;
            motors.motor[1] = 1100;
        } else {
            motors.motor[0] = 1200;
            motors.motor[1] = 1200;
        }
        
        spi.write_motors(SPISlaveID::PICO, motors);
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    // Disarm
    spi.disarm_motors(SPISlaveID::PICO);
    
    return 0;
}
### Slave Side (RP2040)

#include "spi_slave_pico.h"

int main() {
    stdio_init_all();
    sleep_ms(1000);
    
   plain printf("=== SPI Slave Demo ===\n");
    
    spi_slave_init();
    motor_init(4, nullptr);
    motor_disarm();
    ultrasonic_init();
    irq_init(20);
    
    absolute_time_t last_ultrasonic = get_absolute_time();
    
    while (true) {
        g_uptime_ms++;
        
        if (absolute_time_diff_us(last_ultrasonic, get_absolute_time()) > 50000) {
            ultrasonic_trigger_all();
            last_ultrasonic = get_absolute_time();
        }
        
        ultrasonic_update();
        
        static absolute_time_t last_status = get_absolute_time();
        if (absolute_time_diff_us(last_status, get_absolute_time()) > 2000000) {
            printf("Uptime: %lu ms | Armed: %d | US: %d %d %d %d cm\n",
                   (unsigned long)g_uptime_ms,
                   g_motors_armed,
                   g_ultrasonic_distance[0],
                   g_ultrasonic_distance[1],
                   g_ultrasonic_distance[2],
                   g_ultrasonic_distance[3]);
            last_status = get_absolute_time();
        }
        
        sleep_us(100);
    }
}
## File Reference

FileDescription`spi_master_linux.h`Master driver header`spi_master_linux.cpp`Master driver implementation`spi_slave_pico.h`Slave driver header`spi_slave_pico.cpp`Slave driver implementation
Source location: [`src/content/blog/tools/spi-drivers/`](/src/content/blog/tools/spi-drivers/)