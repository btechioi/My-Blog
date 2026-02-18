---
title: Hello World
link: hello-world
catalog: true
date: 2025-02-18 06:00:00
tags:
  - Essay
  - Life
categories:
  - Life
---

Hello, World! BTech_IOI here.

## About This Post

This is my first blog post – a space where I'll be documenting my journey building unconventional tech projects. Expect deep dives, failure stories, breakthroughs, and everything in between.

## Who Am I?

I'm BTech_IOI, a builder obsessed with pushing hardware and AI to their limits. My background is in electronics and computer science, but my real education has been in late-night debugging sessions and watching things fly (literally).

## Project 1: The Autonomous Drone with Custom Flight Controller

Most drones fly. I want mine to *think*.

### The Hardware Stack

I'm going with a modular, distributed approach with all controllers communicating over **SPI** using **hardware interrupts** for instant response:

- **Raspberry Pi Zero** – The "brain" for autonomy. Acts as SPI master. Runs the heavy stuff: optical flow, object detection, path planning. Sends high-level commands to the Pico when it has new data, triggering interrupts.
- **Raspberry Pi Pico** – Running the main flight controller logic. SPI slave. The RP2040's dual-core architecture and programmable I/O make it perfect for handling real-time sensor reading and motor mixing. Listens for commands from the Pi Zero via interrupts.
- **ESP32-C3** – Dedicated to comms and telemetry. Also an SPI slave. WiFi for high-bandwidth data when nearby, plus I'm experimenting with ESP-NOW for low-latency control. The built-in Bluetooth is a bonus for controller pairing.

### The Interrupt-Driven Design

Here's the clever part: **the Pi Zero is the SPI master, but the Pico is the real-time brain that never stops flying.**

If the Pi Zero freezes or dies mid-flight:
- **The Pico keeps flying** – It continues running its control loop, reading sensors, and stabilizing the drone
- **No single point of failure** – The Pico doesn't depend on the Zero for basic flight
- **Fail-safe mode** – The Pico can detect missed interrupts/timeouts and switch to a safe return-to-launch behavior

Communication happens through hardware interrupts:
- Pi Zero pulls a pin high when it has new commands → Pico drops everything to read them
- Pico can also interrupt the Zero when critical telemetry needs attention
- ESP32 can interrupt either when ground commands arrive
- Everything happens in microseconds, no polling overhead

### Why This Split?

Each component does what it's best at, with safety built in:

- **Pi Zero**: Complex vision/AI (expendable, can reboot without crashing the drone)
- **Pico**: Hard real-time flight control (must keep running no matter what)
- **ESP32-C3**: Wireless connectivity (optional for flight, but critical for telemetry)

It's like having a distributed operating system for a drone – fault isolation, clear boundaries between concerns, a high-speed SPI backbone, and most importantly: **the drone stays in the air even when the Linux box crashes.**

### Current Status

Prototyping on breadboards. Getting the Pico to read an MPU6050 reliably and spin some tiny motors through ESCs. Next up: establishing SPI communication with hardware interrupts between all three boards and testing failover scenarios.

## Project 2: The AI V-Tuber

If the drone is about physical autonomy, this project is about digital personality.

### The Concept

A virtual YouTuber powered by actual AI – not just a motion-captured human, but something closer to a digital being. Think:

- **Real-time LLM Integration**: Natural conversation, not scripted responses
- **Expressive Avatars**: Low-latency motion and expression synthesis
- **Interactive Streaming**: The ability to react to chat, play games, and maintain character consistency
- **Technical Backend**: Custom pipelines for speech synthesis, animation, and model inference

### Why Build This?

Because the intersection of AI and human interaction is fascinating. And honestly? Building a digital persona raises every interesting question in modern AI: language, vision, speech, emotion, and real-time systems – all in one package.

## What's Next

This blog will track both projects as they evolve. I'll share:

- Circuit diagrams and Pico C SDK code for the flight controller
- SPI interrupt protocol design between the three controllers
- Fail-safe modes and recovery strategies
- ESP32 wireless protocols and ground station setup
- Pi Zero model architectures and training logs
- Benchmarks, failures, and "aha!" moments
- Code, when it's ready for prime time

## Let's Connect

If you're working on something similar – or just curious – reach out. The best part of building in public is the conversations that come out of it.

More soon. Time to write some code.