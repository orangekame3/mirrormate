# Mirror Mate

Self-hosted personalized AI in a mirror.

> [!IMPORTANT]
> This application requires **Google Chrome** for voice recognition (Web Speech API).

<p align="center">
  <img src="docs/mirrormate.png" alt="Mirror Mate Preview" width="600">
</p>

https://github.com/user-attachments/assets/c9005df4-9bdb-4190-861e-c8f5f9290468

## Features

- **Voice Interaction** - Real-time speech recognition with wake word activation
- **Personalized Memory** - RAG-based memory system that remembers user preferences and context
- **Customizable Character** - Define AI personality, speech style, and appearance
- **Multiple Providers** - Support for OpenAI, Ollama (LLM) and OpenAI TTS, VOICEVOX (TTS)
- **Discord Integration** - Share search results and information to your phone
- **Expressive Avatar** - 8-state animation system with lip-sync and natural expressions
- **Plugin System** - Visual widgets (clock, etc.) for the mirror display
- **Built-in Features** - Weather, calendar, reminders, web search
- **Visual Effects** - Confetti, hearts, sparkles reactions

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
bun install
bun run dev
```

Run tests:

```bash
bun run test
```

> **Note**: This project uses [Bun](https://bun.sh/) as the package manager. You'll also need to run VOICEVOX separately or use OpenAI TTS instead.

## Pages

| Path              | Description                            |
| ----------------- | -------------------------------------- |
| `/`               | Avatar display (for mirror projection) |
| `/control`        | Control panel (text input & settings)  |
| `/control/memory` | Memory management UI                   |
| `/demo`           | Animation demo with keyboard controls  |

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
- [Memory System](docs/memory.md)
- [Animation States](docs/animation.md)
- [Discord Integration](docs/discord.md)
- [Features](docs/features.md)
- [Plugins](docs/plugins.md)
- [Character Configuration](docs/character.md)
- [Rules & Modules](docs/rules.md)
- [Tools](docs/tools.md)
- [Docker Setup](docs/docker.md)

## Tech Stack

- Next.js 15 / React 19
- Bun (package manager)
- Three.js (3D avatar)
- SQLite + Drizzle ORM (memory storage)
- Ollama / OpenAI API
- VOICEVOX / OpenAI TTS
- Web Speech API
- Tailwind CSS

## Inspired By

This project is inspired by [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror), the open-source modular smart mirror platform. Mirror Mate takes a different approach by focusing on voice-first AI interaction with real-time lip-sync avatar display.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE)
