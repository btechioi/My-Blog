---
title: "Weekly Update: DroneFirmware, Skill Updates, and Blog Improvements"
date: "2026-04-14"
categories:
  - Weekly
tags:
  - Update
  - Drone
  - Firmware
  - Blog
  - Skills
description: "This week's update covers the new DroneFirmware project, converting all blog skills to English, fixing lint warnings, and adding comprehensive usage guides."
---

This week was focused on the DroneFirmware project and improving the blog infrastructure. Here's what was accomplished.

## DroneFirmware Project

Launched a new open-source drone flight controller project built on Raspberry Pi Pico. The key features include:

- **Standalone operation**: No companion computer needed - runs entirely on the Pico
- **ESP-NOW wireless RC**: Low-latency communication with auto-pairing
- **Multiple RC protocols**: SBUS, CRSF, and Serial output support
- **Failsafe protection**: Automatic altitude hold when RC signal is lost

Created two detailed posts:

1. **DroneFirmware: Open Source Drone Flight Controller** - Overview, hardware specs, and complete usage instructions
2. **DroneFirmware Communication Protocol Specification** - Technical details on RC→FC serial, ESP-NOW, SPI, and Mavlink protocols

### Hardware Requirements

| Component | Model | Notes |
|-----------|-------|-------|
| FC | Raspberry Pi Pico | 133MHz, 264KB RAM |
| IMU | MPU6050 | Required |
| RC | ESP32-C3 or ESP32-S3 | Auto-pairing |
| GPS | u-blox NEO-M8N | Optional |
| Barometer | BMP280 | Optional |

## Blog Infrastructure Improvements

### Skills Documentation

Converted all Claude Code skill documentation from Chinese to English:

- `infographic-syntax-creator/references/prompt.md`
- `infographic-item-creator/references/item-prompt.md`
- `infographic-structure-creator/references/structure-prompt.md`

### Bug Fixes

Fixed two lint warnings:

- **Cover.astro**: Replaced `any` type with proper `TranslationKey` type
- **generateSummaries.ts**: Removed non-null assertion with proper null check

### Weekly Page Fixes

Updated existing weekly posts to use the correct category:

- Changed `weekly-projects-roundup` from "Life" to "Weekly"
- Changed `weekly-progress-update` from "Life" to "Weekly"

This ensures they appear correctly on the `/weekly` page which shows posts from the current week.

## What's Next

- Add more DroneFirmware features documentation
- Implement historical week browsing for weekly page
- Continue improving the blog's AI summary generation

Thanks for reading!