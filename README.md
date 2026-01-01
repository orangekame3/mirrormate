# Magic Mirror

An interactive AI avatar for smart mirror displays. Features voice recognition, customizable AI personality, and real-time lip-sync.

> **Important**: This application requires **Google Chrome** for voice recognition (Web Speech API).

## Features

- Voice-activated AI assistant with real-time speech recognition
- Customizable AI personality and character settings
- Multiple LLM providers (OpenAI, Ollama)
- Multiple TTS providers (OpenAI, VOICEVOX)
- Plugin system for weather, calendar, reminders
- Rule-based workflows for automated responses
- Visual effects (confetti, hearts, sparkles)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

Open http://localhost:3000 for the avatar display.

## Pages

| Path | Description |
|------|-------------|
| `/` | Avatar display (for mirror projection) |
| `/control` | Control panel (for sending messages) |

## Configuration

All configuration is done via YAML files in the `config/` directory:

| File | Description |
|------|-------------|
| `plugins.yaml` | LLM, TTS, weather, calendar settings |
| `character.yaml` | AI personality and speech style |
| `rules.yaml` | Trigger-based automated workflows |
| `modules.yaml` | Module definitions for rules |

## Documentation

- [Architecture Overview](docs/architecture.md)
- [LLM Providers](docs/llm.md)
- [Character Configuration](docs/character.md)
- [Plugins](docs/plugins.md)
- [Rules & Modules](docs/rules.md)
- [Tools](docs/tools.md)
- [Docker Setup](docs/docker.md)

## Tech Stack

- Next.js 15 / React 19
- Ollama / OpenAI API
- VOICEVOX / OpenAI TTS
- Web Speech API
- Tailwind CSS

## License

MIT
