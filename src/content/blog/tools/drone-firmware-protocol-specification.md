---
title: "DroneFirmware Communication Protocol Specification"
slug: drone-firmware-protocol-specification
date: 2026-04-14 12:00:00
description: "A detailed analysis of the communication protocols in the DroneFirmware project, including RC to FC serial protocol, ESP-NOW wireless protocol, SPI protocol, and Mavlink protocol."
tags:
  - drone
  - protocol
  - firmware
  - ESP-NOW
  - communication
categories:
  - tools
draft: false
---

# DroneFirmware Communication Protocol Specification

> A comprehensive drone communication protocol documentation covering data transmission from RC controller to flight controller, wireless links, and ground station communication.

## Overview

The DroneFirmware project implements a multi-layered communication protocol architecture for data exchange between components in a drone system. It includes:

- RC Module → Flight Controller serial protocol
- Flight Controller → RC Module telemetry protocol
- RC Module status protocol
- ESP-NOW wireless protocol
- SPI protocol (Flight Controller ↔ Companion Computer)
- Mavlink protocol (Ground Station ↔ Flight Controller)

---

## 1. RC → FC Serial Protocol

**Baud Rate**: 2,000,000 (2 Mbps)  
**Format**: 8N1 (8 data bits, no parity, 1 stop bit)  
**Direction**: RC Module → Flight Controller

### RC Channels Packet (0xAA 0x01)

Transmits RC control channels from RC module to FC.

```plain
Offset  Size  Type      Description
------  ----  --------  -----------
0       1     uint8     Sync byte: 0xAA
1       1     uint8     Type: 0x01
2       1     uint8     Channel count (N, typically 8)
3       2N    uint16[]  Channel values (little-endian)
                        Each channel: 1000-2000 μs
3+2N    2     uint16    CRC16 (sum of bytes 0 to 3+2N-1)
```

### Channel Mapping

| Index | Function | Typical Value | Notes |
|-------|----------|---------------|-------|
| 0 | Roll | 1000-2000 | 1500 = center |
| 1 | Pitch | 1000-2000 | 1500 = center |
| 2 | Throttle | 1000-2000 | 1000 = min |
| 3 | Yaw | 1000-2000 | 1500 = center |
| 4 | Aux1 | 1000/2000 | Arm switch |
| 5 | Aux2 | 1000/2000 | Mode select |
| 6 | Aux3 | 1000/2000 | Reserved |
| 7 | Aux4 | 1000/2000 | Reserved |

---

## 2. FC → RC Telemetry Protocol

**Baud Rate**: 2,000,000 (2 Mbps)  
**Format**: 8N1  
**Direction**: Flight Controller → RC Module

### FC Telemetry Packet (0x55 0x02)

FC sends real-time flight data to RC module.

```plain
Offset  Size  Type      Description
------  ----  --------  -----------
0       1     uint8     Sync: 0x55
1       1     uint8     Type: 0x02
2       1     uint8     Sequence number (increments)
3       1     uint8     Flags
                        Bit 0: armed state (1/0)
                        Bit 1: companion computer connected
                        Bit 4-7: failsafe state
4       1     uint8     Control source
                        0 = RC_RECEIVER
                        1 = COMPANION
                        2 = FAILSAFE
5       2     int16     Roll angle (×100 rad)
7       2     int16     Pitch angle (×100 rad)
9       2     int16     Yaw angle (×100 rad)
11      4     int32     Altitude (cm, barometer)
15      2     int16     Gyro X rate (×100 rad/s)
17      2     int16     Gyro Y rate (×100 rad/s)
19      2     int16     Gyro Z rate (×100 rad/s)
21      2     uint16    Battery voltage (mV)
23      2     uint16    CRC16
```

---

## 3. RC Status Protocol

**Baud Rate**: 2,000,000 (2 Mbps)  
**Format**: 8N1  
**Direction**: RC Module → Flight Controller and PC

### RC Status Packet (0x66 0x03)

Comprehensive status from RC module.

```plain
Offset  Size  Type      Description
------  ----  --------  -----------
0       1     uint8     Sync: 0x66
1       1     uint8     Type: 0x03
2       4     uint32    Uptime (ms)
6       2     uint16    Battery voltage (mV)
8       1     int8      Battery percent (0-100)
9       1     int8      RSSI (dBm, negative value)
10      1     uint8     Signal quality (0-100%)
11      2     uint16    Packet loss (×10)
13      4     uint32    Link latency (μs)
17      2     int16     Temperature (×10 °C)
19      4     uint32    Free memory (bytes)
23      1     uint8     CPU load (0-100%)
24      1     uint8     ESP-NOW WiFi channel (1-13)
25      1     uint8     Connection state
                        0 = DISCONNECTED
                        1 = SEARCHING
                        2 = PAIRING
                        3 = CONNECTED
                        4 = RECONNECTING
26      1     uint8     Error flags
                        Bit 0: voltage low
                        Bit 1: temperature high
                        Bit 2: memory low
27      2     uint16    Reserved
29      2     uint16    CRC16
```

---

## 4. ESP-NOW Protocol

**Physical Layer**:
- Protocol: ESP-NOW (based on WiFi)
- Frequency: 2.4 GHz (WiFi channels 1-11)
- Max Range: ~100m line of sight
- Max Payload: 250 bytes
- Data Rate: 2 Mbps

### RC Data Packet (Transmitter → Receiver)

```plain
Offset  Size  Type      Description
------  ----  --------  -----------
0       1     uint8     Magic byte: 0xAA
1       1     uint8     Type: 0x01
2       4     uint32    Timestamp (μs)
6       1     uint8     Channel count (N, 4-16)
7       2N    uint16[]  Channel values (little-endian, 1000-2000)
7+2N    1     int8      RSSI (dBm)
8+2N    1     uint8     Flags
                        Bit 0: low battery
                        Bit 1: signal weak
```

### Telemetry Packet (Receiver → Transmitter)

```plain
Offset  Size  Type      Description
------  ----  --------  -----------
0       1     uint8     Magic byte: 0x55
1       1     uint8     Type: 0x02
2       4     uint32    Timestamp
6       1     uint8     Telemetry data length
7     N     uint8[]   Telemetry data from FC
```

### Connection States

| State | Value | LED Pattern | Description |
|-------|-------|-------------|-------------|
| DISCONNECTED | 0 | Off | No peer found |
| SEARCHING | 1 | Slow pulse | Scanning for TX |
| PAIRING | 2 | Fast blink | Establishing link |
| CONNECTED | 3 | Solid | Link active |
| RECONNECTING | 4 | Slow blink | Lost link, retrying |

---

## 5. SPI Protocol (FC ↔ Companion Computer)

**Speed**: 125 MHz  
**Mode**: SPI Mode 0 (CPOL=0, CPHA=0)  
**Bit Order**: MSB First  
**Voltage**: 3.3V

### Frame Structure

```plain
┌────────┬──────┬────────┬────────┬────────┐
│  CMD   │ LEN  │  DATA  │  DATA  │  CRC   │
│  1B   │  2B  │ N bytes │  ...   │  1B   │
└────────┴──────┴────────┴────────┴────────┘
```

### Command Types

| CMD | Name | Direction | Description |
|-----|------|-----------|-------------|
| 0x01 | PING | ↔ | Heartbeat/keepalive |
| 0x02 | RC_CHANNELS | Comp→FC | RC control input |
| 0x03 | TELEMETRY | FC→Comp | Flight data |
| 0x04 | SETTINGS | ↔ | Configuration |
| 0x05 | RAW_SENSOR | FC→Comp | Raw IMU data |
| 0x10 | MOTOR_OUTPUT | FC→Comp | Motor PWM values |
| 0xFF | NOP | ↔ | No operation |

### Heartbeat Timeout

- FC expects PING every 500ms
- Companion expects PONG within 100ms
- If no PING for 2s, companion assumes FC disconnected
- If no PONG for 2s, FC assumes companion disconnected

---

## 6. Mavlink Protocol (GCS ↔ FC)

Used for Ground Control Station communication.

### Standard Messages

| ID | Name | Direction | Rate | Description |
|----|------|-----------|------|-------------|
| 0 | HEARTBEAT | ↔ | 1 Hz | System heartbeat |
| 1 | SYS_STATUS | → | 1 Hz | System status |
| 30 | ATTITUDE | → | 100 Hz | Roll, pitch, yaw |
| 33 | GLOBAL_POSITION_INT | → | 10 Hz | GPS position |
| 35 | RC_CHANNELS_RAW | → | 50 Hz | RC channel values |
| 69 | RC_CHANNELS_OVERRIDE | ← | 50 Hz | Manual control |
| 74 | VFR_HUD | → | 10 Hz | Flight data display |

### Custom Messages (ID 200-204)

#### PID_TUNE_CMD (200) - GCS → FC

```plain
Field        Type    Offset  Description
-----------  ------  ------  -----------
command      uint8   0       0x01=Start, 0x02=Stop, 0x03=Abort
method       uint8   1       0-3 (see methods below)
axis         uint8   2       0-7 (see axes below)
amplitude    float   3       Excitation amplitude
```

**Tuning Methods**:

| Value | Method | Description |
|-------|--------|-------------|
| 0 | ZIEGLER_NICHOLS | Ultimate gain oscillation |
| 1 | RELAY | Åström-Hägglund relay feedback |
| 2 | STEP_RESPONSE | First-order step response |
| 3 | FREQUENCY_SWEEP | Bode plot analysis |

**Tuning Axes**:

| Value | Axis | PID |
|-------|------|-----|
| 0 | ROLL_RATE | Roll rate |
| 1 | PITCH_RATE | Pitch rate |
| 2 | YAW_RATE | Yaw rate |
| 3 | ROLL_ATTITUDE | Roll angle |
| 4 | PITCH_ATTITUDE | Pitch angle |
| 5 | YAW_ATTITUDE | Yaw angle |
| 6 | ALTITUDE | Altitude hold |
| 7 | POSITION | Position control |

---

## 7. Failsafe Protocol

### Failsafe States

| State | Value | Trigger | Action |
|-------|-------|---------|--------|
| NONE | 0 | Normal operation | - |
| SIGNAL_LOSS | 1 | No RC for 500ms | Hover at throttle 1200 |
| LOW_BATTERY | 2 | Battery < 20% | Land |
| CRITICAL_SENSOR | 3 | IMU failure | Disarm |

### Failsafe Recovery

1. **RC Signal Lost**:
   - Wait 500ms for signal
   - If armed: enter SIGNAL_LOSS failsafe
   - Maintain hover at throttle 1200
   - Auto-recover when RC returns

2. **Battery Low**:
   - Warning at 25%
   - Critical at 15%
   - Auto-land sequence

3. **IMU Failure**:
   - Immediate disarm
   - Prevent re-arm
   - Solid red LED

---

## 8. Data Types

| Type | Size | Range | Description |
|------|------|-------|-------------|
| int8 | 1 | -128 to 127 | Signed byte |
| uint8 | 1 | 0 to 255 | Unsigned byte |
| int16 | 2 | -32768 to 32767 | Signed 16-bit |
| uint16 | 2 | 0 to 65535 | Unsigned 16-bit |
| int32 | 4 | ±2.1×10⁹ | Signed 32-bit |
| uint32 | 4 | 0 to 4.3×10⁹ | Unsigned 32-bit |
| float | 4 | IEEE 754 | Single precision |

### Endianness

- All multi-byte integers are **little-endian** unless specified
- RC channel values are in microseconds (1000-2000)
- Angles in radians
- Altitude in meters (or cm for serial)

---

## 9. Constants

### RC Values

```cpp
RC_MIN = 1000        // Minimum PWM (μs)
RC_MAX = 2000        // Maximum PWM (μs)
RC_CENTER = 1500     // Neutral PWM (μs)
RC_ARM_HIGH = 1500   // Aux > this to arm
RC_ARM_LOW = 1200    // Aux < this to disarm
```

### Timeouts

```cpp
RC_SIGNAL_TIMEOUT_MS = 500       // RC signal loss
STUCK_CONTROL_TIMEOUT_MS = 3000   // Stuck controls
STUCK_CONTROL_THRESHOLD = 20     // Movement threshold
COMPANION_HEARTBEAT_MS = 500     // PING interval
COMPANION_TIMEOUT_MS = 2000       // No PONG timeout
```

### Loop Rates

```cpp
FAST_LOOP_HZ = 400      // Main control loop
FAST_LOOP_US = 2500    // Loop period (μs)
RC_UPDATE_HZ = 50      // RC input rate
TELEMETRY_HZ = 100     // Telemetry rate
```

---

## 10. Error Handling

### Error Flags

| Flag | Bit | Description |
|------|-----|-------------|
| VOLTAGE_LOW | 0 | Battery voltage critical |
| TEMP_HIGH | 1 | Module temperature high |
| MEMORY_LOW | 2 | Free memory < 10KB |
| IMU_ERROR | 3 | IMU communication failed |
| RADIO_ERROR | 4 | Radio communication error |

### Recovery Procedures

1. **RC Loss**: Hover → wait 30s → land
2. **Battery Low**: Warning beep → auto-land
3. **IMU Error**: Immediate disarm → prevent arm
4. **Radio Error**: Try reconnection → failsafe

---

## Summary

This article provided a detailed introduction to the communication protocol architecture in the DroneFirmware project. From the underlying ESP-NOW wireless protocol to the high-level Mavlink ground station protocol, each layer has clear packet formats and interaction rules. These protocols ensure reliable communication between all components in the drone system, providing a solid foundation for flight safety and functionality implementation.

In practical development, understanding these protocols is crucial for debugging, extending features, and troubleshooting issues.