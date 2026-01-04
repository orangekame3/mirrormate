# Getting Started

Mirror Mate is a self-hosted AI companion designed for smart mirror displays. This guide will help you get up and running quickly.

## Prerequisites

- **Google Chrome** - Required for Web Speech API (voice recognition)
- **Docker** - Recommended for easy deployment
- **Bun** - For local development (optional)

## Quick Start

### Option 1: OpenAI (Simplest)

Run with a single Docker command:

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e LLM_PROVIDER=openai \
  -e TTS_PROVIDER=openai \
  ghcr.io/orangekame3/mirrormate:latest
```

Open http://localhost:3000 in Chrome.

### Option 2: Ollama + VOICEVOX (No API key required)

For a fully local setup:

```bash
# 1. Install and start Ollama
ollama serve
ollama pull qwen2.5:14b

# 2. Clone and start Mirror Mate
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate
docker compose up -d
```

Open http://localhost:3000 in Chrome.

## Pages

| Path | Description |
|------|-------------|
| `/` | Avatar display (for mirror projection) |
| `/control` | Control panel (text input & settings) |
| `/control/memory` | Memory management UI |
| `/demo` | Animation demo with keyboard controls |

## Configuration

All configuration is done via YAML files in the `config/` directory:

| File | Description |
|------|-------------|
| `app.yaml` | Application settings (language, etc.) |
| `providers.yaml` | LLM and TTS provider settings |
| `features.yaml` | Weather, calendar, time, reminder settings |
| `plugins.yaml` | Visual widget plugins (clock, etc.) |
| `character.yaml` | AI personality, speech style, wake word |
| `rules.yaml` | Trigger-based automated workflows |
| `modules.yaml` | Module definitions for rules |

## Local Development

For development without Docker:

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test
```

::: tip
This project uses [Bun](https://bun.sh/) as the package manager for faster installs.
:::

## Next Steps

- [Architecture Overview](/guide/architecture) - Understand how Mirror Mate works
- [Docker Setup](/guide/docker) - Detailed Docker configuration
- [Providers](/config/providers) - Configure LLM and TTS providers
- [Character](/config/character) - Customize AI personality
