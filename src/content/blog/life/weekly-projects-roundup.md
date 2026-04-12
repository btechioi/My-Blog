---
title: "Weekly Projects Roundup: Embedded Systems Edition"
date: "2026-07-15"
categories:
  - Life
tags:
  - Update
  - Embedded
  - RP2040
  - Linux
  - Pico-Pro
description: "This week's roundup covers several embedded systems projects I've been working on. From Linux distribution comparisons to low-level GPIO..."
---

This week's roundup covers several embedded systems projects I've been working on. From Linux distribution comparisons to low-level GPIO communication, here's what I've been building.

## SPI Driver Stack: Linux ↔ RP2040 Communication

The **SPI Driver Documentation** post provides a complete technical guide for cross-platform SPI master-slave communication between Linux hosts (Raspberry Pi / Pico-Pro) and RP2040-based slaves (Pi Pico).

**Key features:**

- **10 MHz SPI transfers** for sub-millisecond latency
- **Multi-slave architecture** with automatic chip select management
- **Thread-safe operations** on the Linux side
- **Hardware IRQ support** for event-driven communication
- **Motor control** (1000-2000 µs PWM) and **ultrasonic sensor** reading

The driver suite includes both `spi_master_linux` (C++ driver for Linux) and `spi_slave_pico` (firmware for RP2040), with complete API documentation and usage examples.

**Wiring:**

Pi Pico          Pico-Pro (SPI0)
--------         -------------
GP18 (SCK)  →    GPIO 18 (SCK)
GP19 (MOSI) →    GPIO 19 (MOSI)  
GP16 (MISO) ←    GPIO 16 (MISO)
GP17 (CS)   ←    GPIO 17 (CS)

## Minimal Linux Alternatives to Buildroot

The **Minimal Linux Alternatives** post compares lightweight distributions suitable for embedded systems, from TinyCore to Alpine. I evaluated six options for the Pico-Pro platform:

| Distro | Size | RAM Min | Init System | Best For |
|--------|------|---------|-------------|----------|
| Alpine Linux | 130 MB | 256 MB | OpenRC | Containers, embedded |
| TinyCore | 16 MB | 48 MB | BusyBox | Absolute minimum |
| OpenWrt | 4-16 MB | 64 MB | Procd | Network features |
| Buildroot | 4-64 MB | 128 MB | Custom | Maximum control |
| DietPi | 2 GB | 512 MB | systemd | Ease of use |
| Raspberry Pi OS Lite | 1 GB | 512 MB | systemd | Compatibility |

**My recommendation for Pico-Pro:** Alpine Linux with OpenRC — musl libc, lightweight init, apk package manager, Docker support, and reasonable resource usage.

## Pico-Pro on Alpine Linux

Building on the distro comparison, the **Pico-Pro Alpine** post documents a complete Buildroot-free implementation featuring:

- **A/B partitioning** for safe firmware updates
- **Custom system controller** in C++ with:
  - GPIO control
  - LED state management (fast/slow blink, solid, off)
  - Hardware watchdog integration
  - Heartbeat monitoring via named pipe
  - USB gadget mass storage mode
- **SPI multi-processor architecture** with the Pi Pico as a co-processor
- **OpenRC service scripts** for system management

The controller (`pico-pro-ctl`) runs as a daemon managing system state, partition switching, and health monitoring.

## Parallel GPIO with RP2040 PIO

The **Pico Parallel GPIO** post explores breaking the serial speed limit using RP2040's PIO (Programmable I/O) blocks for parallel bus communication.

**Why parallel beats serial:**

- 8-bit parallel bus = 8x throughput at same clock speed
- 16-bit or 32-bit buses possible with proper pin allocation
- PIO state machines handle timing in hardware, zero CPU overhead

**Practical applications:**

1. High-speed display interfaces (8080-style LCD)
2. FPGA configuration streams
3. Multi-sensor aggregation

The implementation includes DMA integration for zero-CPU throughput transfers, with performance benchmarks showing significant improvements over SPI for bulk data movement.

## What's Next

- ESP32 integration for wireless telemetry
- Real-time motor control loop tuning
- Motion capture system improvements

Thanks for reading! These projects build towards a complete embedded systems platform for robotics and drone applications.
