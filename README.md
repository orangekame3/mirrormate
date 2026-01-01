# MirrorMate

Your friendly AI companion for smart mirror displays. Features voice recognition, customizable AI personality, and real-time lip-sync.

> **Important**: This application requires **Google Chrome** for voice recognition (Web Speech API).

## Features

- Voice-activated AI assistant with real-time speech recognition
- Customizable AI personality and character settings
- Multiple LLM providers (OpenAI, Ollama)
- Multiple TTS providers (OpenAI, VOICEVOX)
- Built-in features for weather, calendar, reminders
- Rule-based workflows for automated responses
- Visual effects (confetti, hearts, sparkles)

## Quick Start (Docker)

The recommended way to run MirrorMate is with Docker, which includes VOICEVOX for text-to-speech.

### Prerequisites

- Docker and Docker Compose
- [Ollama](https://ollama.com/) running on host (for local LLM)

### 1. Setup

```bash
# Clone and enter directory
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate

# Copy environment file
cp .env.example .env
# Edit .env with your API keys (optional)

# Pull an Ollama model
ollama pull qwen2.5:14b
```

### 2. Start

```bash
# Start Ollama (if not running)
ollama serve

# Start MirrorMate + VOICEVOX
docker compose up -d
```

Open http://localhost:3000 for the avatar display.

### Development Mode

For local development without Docker:

```bash
npm install
npm run dev
```

> **Note**: You'll need to run VOICEVOX separately or use OpenAI TTS instead.

## Pages

| Path | Description |
|------|-------------|
| `/` | Avatar display (for mirror projection) |
| `/control` | Control panel (for sending messages) |

## Configuration

All configuration is done via YAML files in the `config/` directory:

| File | Description |
|------|-------------|
| `providers.yaml` | LLM and TTS provider settings |
| `features.yaml` | Weather, calendar, time, reminder settings |
| `character.yaml` | AI personality and speech style |
| `rules.yaml` | Trigger-based automated workflows |
| `modules.yaml` | Module definitions for rules |

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Providers (LLM & TTS)](docs/providers.md)
- [Features](docs/features.md)
- [Character Configuration](docs/character.md)
- [Rules & Modules](docs/rules.md)
- [Tools](docs/tools.md)
- [Docker Setup](docs/docker.md)

## Tech Stack

- Next.js 15 / React 19
- Ollama / OpenAI API
- VOICEVOX / OpenAI TTS
- Web Speech API
- Tailwind CSS

## Inspired By

This project is inspired by [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror), the open-source modular smart mirror platform. MirrorMate takes a different approach by focusing on voice-first AI interaction with real-time lip-sync avatar display.

## License

[MIT](LICENSE)
