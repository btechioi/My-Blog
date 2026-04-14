---
title: "DroneFirmware: Open Source Drone Flight Controller"
slug: dronefirmware-open-source-flight-controller
date: 2026-04-14 12:00:00
description: "A complete open-source drone flight controller built on Raspberry Pi Pico that flies standalone without needing a companion computer."
tags:
  - drone
  - firmware
  - open-source
  - raspberry-pi-pico
  - ESP32
  - flight-controller
categories:
  - tools
draft: false
---

# DroneFirmware: Open Source Drone Flight Controller

> A drone flight controller built on Raspberry Pi Pico that flies standalone. No companion computer needed.

## Introduction

DroneFirmware is an open-source project that provides a complete flight controller solution for drones. Built around the Raspberry Pi Pico as the core flight controller (FC), it offers a lightweight, affordable alternative to traditional flight controller boards while maintaining full functionality for autonomous flight.

## Hardware Components

### Required Hardware

| Part | Model | Notes |
|------|-------|-------|
| FC | Raspberry Pi Pico | 133MHz, 264KB RAM |
| IMU | MPU6050 | Required |
| RC | ESP32-C3 or ESP32-S3 | Auto-pairing |

### Optional Hardware

| Part | Model | Notes |
|------|-------|-------|
| GPS | u-blox NEO-M8N | Optional |
| Barometer | BMP280 | Optional |
| Companion | Pi Zero 2W | Optional |

## System Architecture

```plain
┌──────────────────────────────────────────────────────────────┐
│                        YOUR DRONE                            │
│                                                              │
│    ┌─────────────┐      ┌─────────────────────────────┐     │
│    │   ESP32     │      │       Raspberry Pi Pico     │     │
│    │   RC RX     │──────│  FC + IMU + Motors        │     │
│    └──────┬──────┘      └─────────────────────────────┘     │
│           │                       │                           │
│      ESP-NOW              SPI (optional)                      │
│           │                       │                           │
└───────────┼───────────────────────┼───────────────────────────┘
            │                       │
    ┌───────┴───────┐       ┌──────┴──────┐
    │   TRANSMITTER  │       │  Pi Zero 2W  │
    │  (handheld/PC)│       │  (optional)  │
    └───────────────┘       └─────────────┘
```

**Minimum setup**: Pico + MPU6050 + ESP32-C3 RC receiver

## Key Features

### Standalone Flight

Unlike many modern drone systems that require a companion computer (like Raspberry Pi or Jetson), DroneFirmware runs entirely on the Pico. This simplifies the system and reduces cost while maintaining full flight capabilities.

### ESP-NOW Wireless RC

The RC module uses ESP-NOW protocol for low-latency wireless communication between the transmitter and receiver. Key benefits:

- **Auto-pairing**: Automatically pairs with any ESP-NOW peer - no MAC addresses or channels to configure
- **Low latency**: Designed for real-time control
- **Multiple modes**: RECEIVER, TRANSMITTER, and BRIDGE modes supported

### Multiple RC Output Protocols

The ESP32 RC module supports various output protocols:
- SBUS
- CRSF (Crossfire)
- Serial

### Failsafe Protection

If RC signal is lost for 500ms, the drone:
1. Maintains altitude at throttle ~1200
2. Waits for RC reconnection
3. Returns to RC control automatically

## LED Status Indicators

| LED | State | Meaning |
|-----|-------|---------|
| Green solid | Armed | Ready to fly |
| Green slow blink | Disarmed | Waiting |
| Blue double blink | Companion | SPI connected |
| Red fast blink | Failsafe | Error occurred |

## Audio Cues

| Sound | When |
|-------|------|
| 1 beep | System ready |
| 2 ascending beeps | Armed |
| 2 descending beeps | Disarmed |
| Descending tone | RC signal lost |
| Ascending tone | RC paired |
| All-motor siren | Find drone mode |

## Quick Start

### Build

```bash
git clone https://github.com/btechioi/DroneFirmware.git
cd DroneFirmware
./build.sh
```

### Flash

**Pico**: Hold BOOTSEL, plug in USB, copy `firmware.uf2` to the drive.

**ESP32**:
```bash
esptool.py --chip esp32c3 --port /dev/ttyUSB0 write_flash 0x0 firmware/rc_receiver_esp32c3.bin
```

---

## How to Use

### Hardware Wiring

#### Pico Pin Connections

| Function | GPIO Pin | Notes |
|----------|----------|-------|
| Motor 1 | 12 | PWM output |
| Motor 2 | 13 | PWM output |
| Motor 3 | 14 | PWM output |
| Motor 4 | 15 | PWM output |
| RC Roll | 16 | RC input |
| RC Pitch | 17 | RC input |
| RC Throttle | 18 | RC input |
| RC Yaw | 19 | RC input |
| RC Aux1 | 20 | RC input |
| RC Aux2 | 21 | RC input |
| IMU SDA | 4 | I2C |
| IMU SCL | 5 | I2C |
| Status LED | 25 | On-board LED |

#### RC Module Pin Connections (ESP32-C3)

| Function | Pin | Notes |
|----------|-----|-------|
| LED | 8 | Status indicator |
| Button | 9 | Mode/pair button |
| Stick Roll | 0 | Analog input |
| Stick Pitch | 1 | Analog input |
| Stick Throttle | 2 | Analog input |
| Stick Yaw | 3 | Analog input |
| Switch A | 4 | Aux1 (Arm) |
| Switch B | 5 | Aux2 (Mode) |
| Switch C | 6 | Reserved |
| Switch D | 7 | Reserved |

### Building the Firmware

1. **Clone the repository**:
   ```bash
   git clone https://github.com/btechioi/DroneFirmware.git
   cd DroneFirmware
   ```

2. **Run the build script**:
   ```bash
   ./build.sh
   ```

   This will compile:
   - Pico FC firmware (firmware.uf2)
   - ESP32-C3 RC receiver firmware
   - ESP32-S3 RC receiver firmware
   - ESP32-C3 transmitter firmware
   - ESP32-S3 transmitter firmware

3. **Built binaries will be in**:
   ```plain
   firmware/
   ```

### Flashing the Firmware

#### Flashing the Pico (Flight Controller)

1. Hold the **BOOTSEL** button on the Pico
2. Connect the Pico to your computer via USB
3. The Pico will appear as a USB drive
4. Copy `firmware.uf2` to the drive
5. The Pico will automatically reboot and run the firmware

#### Flashing the ESP32 (RC Module)

Using esptool.py:

```bash
# For ESP32-C3 (receiver mode)
esptool.py --chip esp32c3 --port /dev/ttyUSB0 write_flash 0x0 firmware/rc_receiver_esp32c3.bin

# For ESP32-C3 (transmitter mode)
esptool.py --chip esp32c3 --port /dev/ttyUSB0 write_flash 0x0 firmware/rc_transmitter_esp32c3.bin

# For ESP32-S3 (receiver mode)
esptool.py --chip esp32s3 --port /dev/ttyUSB0 write_flash 0x0 firmware/rc_receiver_esp32s3.bin

# For ESP32-S3 (transmitter mode)
esptool.py --chip esp32s3 --port /dev/ttyUSB0 write_flash 0x0 firmware/rc_transmitter_esp32s3.bin
```

### RC Mode Configuration

The ESP32 RC module supports three modes, configured by defining before building:

```cpp
// In esp32-rc/src/main.cpp, uncomment one of:
#define MODE_RECEIVER  // On drone, receives ESP-NOW, outputs to FC
#define MODE_TRANSMITTER  // Handheld unit
#define MODE_BRIDGE  // Direct PC ↔ FC passthrough
```

### Connecting to the Flight Controller

1. **Serial Connection**: Connect ESP32 TX/RX to Pico:
   - ESP32 TX → Pico RX (GPIO 1)
   - ESP32 RX → Pico TX (GPIO 0)
   - Common ground between devices

2. **Power**: Both devices should share the same 5V or 3.3V power supply

### Arming and Disarming

**Arming**:
- Move Aux1 switch (Switch A) to HIGH position (> 1500)
- You will hear 2 ascending beeps
- Green LED will turn solid

**Disarming**:
- Move Aux1 switch to LOW position (< 1200)
- You will hear 2 descending beeps
- Green LED will start slow blink

### RC Channel Mapping

| Channel | Function | Description |
|---------|----------|-------------|
| Ch 1 | Roll | Left/Right stick |
| Ch 2 | Pitch | Forward/Backward stick |
| Ch 3 | Throttle | Left stick vertical |
| Ch 4 | Yaw | Right stick horizontal |
| Ch 5 | Aux1 | Arm switch (Switch A) |
| Ch 6 | Aux2 | Mode switch (Switch B) |
| Ch 7 | Aux3 | Reserved |
| Ch 8 | Aux4 | Reserved |

### Monitoring via Serial

Connect to the Pico's USB serial at **115200 baud** to monitor:

```bash
# Linux/Mac
screen /dev/ttyUSB0 115200

# Windows (using PuTTY or similar)
# Connect to COM port at 115200 baud
```

### Troubleshooting

**No response from FC**:
- Check USB connection to Pico
- Verify BOOTSEL flashing completed
- Check serial baud rate (115200)

**RC not connecting**:
- Verify ESP32 flashed correctly
- Check ESP-NOW pairing (LED should show SEARCHING → CONNECTED)
- Ensure both devices are on same WiFi channel

**Motors not spinning**:
- Ensure armed (Aux1 switch HIGH)
- Check motor wiring to Pico
- Verify ESC calibration

**Failsafe triggered**:
- Check RC signal (LED indicators)
- Verify ESP-NOW connection
- Reduce distance between TX and RX

## Serial Commands

Connect to Pico via USB serial at 115200 baud:

| Key | Action |
|-----|--------|
| `a` | Arm |
| `d` | Disarm |
| `s` | Status |
| `f` | Failsafe state |
| `r` | Return to RC |
| `p` | Find drone siren |

## Firmware Files

```plain
firmware/
├── firmware.uf2                  Pico FC (copy to USB drive)
├── rc_receiver_esp32c3.bin     ESP32-C3 RC
├── rc_receiver_esp32s3.bin     ESP32-S3 RC
├── rc_transmitter_esp32c3.bin  ESP32-C3 TX
└── rc_transmitter_esp32s3.bin  ESP32-S3 TX
```

## Performance

| Loop | Rate |
|------|------|
| Motor control | 400 Hz |
| Attitude | 200 Hz |
| Position | 50 Hz |

## Communication Protocols

DroneFirmware implements multiple communication protocols:

1. **RC → FC Serial**: 2 Mbps, transmits RC channel data
2. **FC → RC Telemetry**: Sends flight data back to RC
3. **RC Status**: Comprehensive RC module status
4. **ESP-NOW**: Wireless RC communication
5. **SPI**: Optional companion computer link
6. **Mavlink**: Ground control station communication

## Safety

- Remove props before firmware updates
- Check RC link before arming
- Test failsafe in a safe area

## License

MIT

## Summary

DroneFirmware provides a complete, affordable open-source solution for drone flight control. By leveraging the Raspberry Pi Pico and ESP32, it achieves a balance of performance, cost, and simplicity. The auto-pairing ESP-NOW RC system and standalone operation make it particularly attractive for hobbyists and developers looking to build custom drones without the complexity of traditional flight controller setups.