---
title: "NOVA — Your Self-Hosted AI Companion, Inspired by Neuro-sama"
date: "2026-05-23"
categories:
  - Tools
tags:
  - AI
  - VTuber
  - Open Source
  - LLM
description: "NOVA is an open-source, self-hosted AI companion that brings cyber living beings to life with realtime voice chat, game-playing, VRM/Live2D avatars, and in-browser inference."
---

# NOVA — Your Self-Hosted AI Companion, Inspired by Neuro-sama

> A container of souls — bring your own cyber waifu to life, on your own hardware.

## What is NOVA?

[NOVA](https://github.com/btechioi/NOVA) is an open-source project recreating the experience of [Neuro-sama](https://www.youtube.com/@Neurosama) — the famous AI VTuber — but **self-hosted and yours to own**. It's a full-stack companion platform capable of realtime voice chat, playing Minecraft and Factorio, rendering Live2D and VRM avatars, and running entirely in a browser or as a native desktop app.

It supports **Web / macOS / Windows / Linux**, and even runs on mobile via PWA.

## Key Capabilities

- **Realtime Voice Chat** — Speech recognition + TTS with ElevenLabs, running client-side
- **Game Playing** — Can play Minecraft (via Mineflayer), Factorio (via RCON API), and more
- **Avatars** — VRM and Live2D with auto-blink, auto-look, idle animations
- **In-Browser Inference** — Local LLM inference via WebGPU, no GPU required
- **Memory System** — DuckDB WASM + Drizzle ORM for persistent in-browser memory
- **Platform Integrations** — Discord, Telegram, and more

## Tech Stack

Built with **TypeScript** (~73%), **Vue.js** (~25%), and a sprinkle of Kotlin/Swift for mobile. The architecture is modular:

- **Web-first** — leverages WebGPU, WebAudio, Web Workers, WebAssembly
- **Desktop** — Electron-based with native CUDA/Metal acceleration via [candle](https://github.com/huggingface/candle)
- **LLM Agnostic** — supports OpenAI, Anthropic, DeepSeek, Ollama, vLLM, and [20+ more providers](https://github.com/btechioi/NOVA?tab=readme-ov-file#support-of-llm-api-providers-powered-by-xsai) via [xsAI](https://github.com/moeru-ai/xsai)

## Why It Matters

Most AI VTuber projects are either closed-source or require heavy cloud infrastructure. NOVA flips that — you can run a fully-featured digital companion on your own machine, with local inference, local memory, and no cloud dependency for core functionality.

It's still early-stage but already impressive: 3,700+ commits, a growing plugin ecosystem, and sub-projects ranging from Factorio automation to in-browser realtime voice chat.

## Getting Started

```bash
git clone https://github.com/btechioi/NOVA
cd NOVA
pnpm i
pnpm dev
```

Or grab a pre-built binary from the [releases page](https://github.com/btechioi/NOVA/releases).

## Links

- [GitHub](https://github.com/btechioi/NOVA)
- [Documentation](https://nova.moeru.ai)
- [Discord](https://discord.gg/TgQ3Cu2F7A)
