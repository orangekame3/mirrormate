<p align="center">
  <img src="docs/public/mirrormate.png" alt="MirrorMate" width="400">
</p>

<h1 align="center">MirrorMate</h1>

<p align="center">
  <strong>Self-hosted personalized AI in a mirror</strong>
</p>

<p align="center">
  <em>AI doesn't have to live on a screen.</em>
</p>

<p align="center">
  <a href="https://www.orangekame3.net/mirrormate/">Docs</a> •
  <a href="https://www.orangekame3.net/mirrormate/guide/getting-started">Getting Started</a> •
  <a href="https://github.com/orangekame3/mirrormate/releases">Releases</a>
</p>

<p align="center">
  <a href="https://github.com/orangekame3/mirrormate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/orangekame3/mirrormate/releases"><img src="https://img.shields.io/github/v/release/orangekame3/mirrormate" alt="Release"></a>
  <a href="https://github.com/orangekame3/mirrormate/actions"><img src="https://github.com/orangekame3/mirrormate/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

---

https://github.com/user-attachments/assets/c9005df4-9bdb-4190-861e-c8f5f9290468

---

## Why a mirror?

A mirror is something you already live with.
You glance at it in the morning. You check yourself before heading out.
In those few seconds, you could ask about the weather, check your schedule, or just chat.

MirrorMate puts AI into that everyday object.
No phone to pull out. No laptop to open.
Just talk to the mirror.

## What it is

- A voice-first AI designed to live in a mirror
- Runs entirely local with Ollama + VOICEVOX (no cloud required)
- Buildable with Raspberry Pi + half mirror
- Remembers you through RAG-based memory

## What it is not

- Not a smart display
- Not a cloud-dependent assistant
- Not another chat UI in a browser

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Raspberry Pi                             │
│  ┌───────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  Browser      │  │  Next.js   │  │  SQLite                │ │
│  │  (Chrome)     │◄─┤  App       │◄─┤  (Memory, Sessions)    │ │
│  │  + Mic/Cam    │  │  Port 3000 │  │                        │ │
│  └───────────────┘  └─────┬──────┘  └────────────────────────┘ │
│         ▲                 │                                     │
│         │                 │ Tailscale VPN                       │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 ▼
          │   ┌─────────────────────────────────────────────────┐
          │   │                  Mac Studio                     │
          │   │  ┌────────────┐ ┌──────────────┐ ┌───────────┐ │
          │   │  │  Ollama    │ │  VOICEVOX    │ │  Whisper  │ │
          │   │  │  LLM/VLM   │ │  TTS         │ │  STT      │ │
          │   │  │  Embedding │ │  Port 50021  │ │  Port 8080│ │
          │   │  └────────────┘ └──────────────┘ └───────────┘ │
          │   └─────────────────────────────────────────────────┘
          │
          └── Half Mirror + Monitor
```

**Minimal setup**: Raspberry Pi + OpenAI API only

**Full local setup**: Combine with Mac Studio (or any GPU machine) as shown above

---

## Quick Start

**With OpenAI API (easiest):**

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-xxx \
  -e LLM_PROVIDER=openai \
  -e TTS_PROVIDER=openai \
  ghcr.io/orangekame3/mirrormate:latest
```

Open http://localhost:3000 in Chrome.

**Fully local (Ollama + VOICEVOX):**

```bash
# 1. Pull a model with Ollama
ollama pull qwen2.5:14b

# 2. Start MirrorMate
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate
docker compose up -d
```

**Wake word**: Say "OK Mira" to activate.

---

## Features

### Voice-First Interaction
Activate with a wake word. Choose from Web Speech API, OpenAI Whisper, or local Whisper for speech recognition.

### Personalized Memory
Automatically extracts and stores information about you from conversations. Uses RAG to retrieve relevant memories and generate personalized responses.

### Expressive Avatar
Lip-synced avatar speaks responses. Eight animation states (Idle, Listening, Thinking, Speaking, etc.) show what it's doing at a glance.

### Multi-Provider Support
| Component | Options                                       |
| --------- | --------------------------------------------- |
| LLM       | OpenAI, Ollama                                |
| TTS       | OpenAI, VOICEVOX                              |
| STT       | Web Speech API, OpenAI Whisper, Local Whisper |
| Embedding | Ollama, PLaMo-Embedding-1B                    |

### Built-in Integrations
- Weather (Open-Meteo)
- Calendar (Google Calendar)
- Web search (Tavily)
- Reminders
- Discord sharing

### Plugin System
Add your own widgets or sensor integrations. The Vision Companion plugin detects eye contact and greets you automatically.

---

## Tech Stack

- **Frontend**: Next.js 15 / React 19 / Three.js
- **Backend**: Node.js / SQLite (Drizzle ORM)
- **AI**: Ollama / OpenAI / VOICEVOX / faster-whisper
- **Infra**: Docker / Tailscale

---

## Development

```bash
bun install
bun run dev
```

See [Documentation](https://www.orangekame3.net/mirrormate/) for details.

---

## Status

Work in progress. Core features work, but rough edges remain.

If you're into local AI, self-hosted systems, or physical interfaces, give it a try.

---

## License

[MIT](LICENSE)
