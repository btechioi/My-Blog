---
title: DIY Mocap System
link: diy-mocap-system
date: 2026-02-18 16:04:27
description: Step-by-step technical deep-dive into a low-cost, 100 Hz+ infrared motion tracking system for drones and humans using OV9281 global shutter cameras, Artix Linux, Fedora, ESP32 active markers, OpenCV, EKF, and ESP-NOW.
tags: 
 - Robotics 
 - Linux 
 - Drone 
 - MoCap 
 - ESP32
categories:
  - Tools
---

# DIY High-Speed Motion Capture Lab: Tracking at 10 m/s

This guide details a complete, distributed motion capture system capable of reliably tracking fast-moving objects — drones or humans — at speeds up to **10 m/s** (~36 km/h) indoors. The setup achieves 100–120 Hz updates using commodity hardware and open-source software, making high-performance MoCap accessible without spending tens of thousands on commercial systems like Vicon or OptiTrack.

The core idea: active infrared LED markers on targets, global shutter cameras for blur-free capture, blob detection + multi-view triangulation for 3D positions, predictive filtering (EKF + lead compensation) to handle latency, and low-latency wireless (ESP-NOW) for real-time drone control feedback.

DIY setups like this one (compact rig with small active-marker drones) prove the concept works at low cost:

<grok-card data-id="dd3de1" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="f7ec70" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>


## Hardware Architecture

### Cameras: OV9281 Global Shutter Modules
- **Why global shutter?** At 10 m/s, rolling shutter would cause severe distortion (jello effect) during fast motion. Global shutter captures the entire frame simultaneously → no blur or skew.
- Typical config: 4–8 × OV9281 (1 MP monochrome, up to 120 fps at 1280×800 or higher at reduced res).
- IR-sensitive (NoIR variant) + 850/940 nm bandpass filter to reject ambient light.
- Lens: Wide-angle M12 (e.g., 90–120° FOV) for coverage; mount on rigid frame with good baseline (1–3 m separation) for triangulation accuracy.

Real OV9281 modules look compact and industrial-grade:

<grok-card data-id="e84d8e" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="34d769" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="a1ef8a" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>


### Processing Nodes
- **Tracking Node** (Artix Linux PC, e.g., old i5-3470 quad-core): Low-latency vision pipeline. Uses VA-API hardware acceleration for frame decoding/processing.
- **Control Node** (Fedora laptop, e.g., i5-7440HQ): Fuses multi-camera data, runs EKF for smoothing + prediction, visualizes (KDE Plasma/Qt), sends setpoints via ESP-NOW.
- **Targets** (ESP32-C3 drones): 1 kHz PID attitude loop + active IR blinking LEDs for unique IDs (time-multiplexed patterns).

Typical active-marker micro-drones (ESP32 + IR LEDs for optical ID):

<grok-card data-id="3ea24f" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="2beb38" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>


## Data Flow & Latency Budget

1. Cameras expose IR frames (~8.3 ms at 120 Hz).
2. Artix PC: OpenCV multi-threaded blob detection → centroid extraction → epipolar geometry + triangulation → 3D points.
3. UDP broadcast (Ethernet) to Fedora at 120 Hz.
4. Fedora: Multi-view fusion → EKF (predict/correct with process & measurement noise models) + lead compensation (predict future position to offset total loop delay).
5. ESP-NOW uplink (~10–30 ms typical latency) → drone receives attitude/position setpoints.
6. Drone: 1 kHz PID updates motors.

End-to-end latency target: < 40–50 ms to maintain stability at 10 m/s (object moves ~0.5 m in 50 ms).

High-speed drone passes in similar indoor MoCap environments:

<grok-card data-id="ae22cc" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="b34c91" data-type="image_card" data-plain-type="render_searched_image"  data-arg-size="LARGE" ></grok-card>


## Performance at 10 m/s – Nuances & Edge Cases

- **Spatial accuracy**: Sub-cm to mm-level possible with good calibration and baselines. At 10 m/s, even 1 cm error + latency causes noticeable position jitter → EKF critical.
- **Temporal**: 120 Hz = 8.3 cm/frame displacement. Prediction (lead) compensates for ~30–50 ms delay.
- **Marker robustness**: Blinking IDs handle 5–15 targets; occlusions trigger state recovery (re-triangulate when visible again). Edge case: fast spins or flips → streak despite global shutter if exposure too long; use short exposure + bright IR LEDs.
- **CPU load**: Artix vision at 120 Hz pushes older quad-cores; Fedora EKF + viz leaves ~10% headroom.
- **Failure modes**: Reflections/false positives (mitigate with bandpass filters + RANSAC), sync drift (add hardware trigger via GPIO), wireless dropouts (drone falls back to onboard IMU).

## Project Timeline & Testing

Phased build:
- Weeks 1–2: Camera rigging, leveling, calibration (chessboard + OpenCV).
- Weeks 3–5: ESP32 marker PCBs, blink sync, basic tracking.
- Weeks 6–8: Full pipeline + EKF tuning.
- Final: 10 m/s passes, then human skeletal (more markers/cameras).

Test rigorously: high-speed video ground truth, RMS error logs, latency scope measurements.

## Conclusion & Implications

This setup delivers research-grade tracking (100+ Hz, sub-cm, predictive) on a hobbyist budget. It enables experiments in autonomous drone swarms, aggressive flight control, human motion studies, or robotics validation — all without proprietary lock-in.

Key takeaways:
- Global shutter + active IR is the sweet spot for speed + robustness.
- Distributed Linux nodes + ESP-NOW close the real-time loop affordably.
- Prediction/filtering turns usable tracking into controllable tracking at high velocity.

If you're building something similar, start with 4 cameras + one marker drone, calibrate meticulously, and measure every latency hop. The physics and engineering constraints are unforgiving at 10 m/s, but the results are incredibly rewarding.

Happy hacking!