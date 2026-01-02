# MirrorMate

Your friendly AI companion for smart mirror displays. Features voice recognition, customizable AI personality, and real-time lip-sync.

> [!IMPORTANT]
> This application requires **Google Chrome** for voice recognition (Web Speech API).

https://github.com/user-attachments/assets/c9005df4-9bdb-4190-861e-c8f5f9290468

## Features

- Voice-activated AI assistant with real-time speech recognition
- Wake word activation ("OK Mirror" style)
- Customizable AI personality and character settings
- Multiple LLM providers (OpenAI, Ollama)
- Multiple TTS providers (OpenAI, VOICEVOX)
- Built-in features for weather, calendar, reminders
- Plugin system for visual widgets (clock, etc.)
- Rule-based workflows for automated responses
- Multi-language support (Japanese, English)
- Visual effects (confetti, hearts, sparkles)

## Quick Start

### Option 1: OpenAI (Simplest)

```bash
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-your-key -e LLM_PROVIDER=openai -e TTS_PROVIDER=openai ghcr.io/orangekame3/mirrormate:latest
```

### Option 2: Ollama + VOICEVOX (No API key required)

```bash
# Pull Ollama model
ollama pull qwen2.5:14b

# Clone and start
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate
docker compose up -d
```

Open http://localhost:3000 in Chrome - that's it!

## Development

For local development without Docker:

```bash
npm install
npm run dev
```

Run tests:

```bash
npm run test
```

> **Note**: You'll need to run VOICEVOX separately or use OpenAI TTS instead.

## Pages

| Path       | Description                            |
| ---------- | -------------------------------------- |
| `/`        | Avatar display (for mirror projection) |
| `/control` | Control panel (for sending messages)   |

## Configuration

All configuration is done via YAML files in the `config/` directory:

| File             | Description                                |
| ---------------- | ------------------------------------------ |
| `app.yaml`       | Application settings (language, etc.)      |
| `providers.yaml` | LLM and TTS provider settings              |
| `features.yaml`  | Weather, calendar, time, reminder settings |
| `plugins.yaml`   | Visual widget plugins (clock, etc.)        |
| `character.yaml` | AI personality, speech style, wake word    |
| `rules.yaml`     | Trigger-based automated workflows          |
| `modules.yaml`   | Module definitions for rules               |

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Providers (LLM & TTS)](docs/providers.md)
- [Features](docs/features.md)
- [Plugins](docs/plugins.md)
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

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE)
