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
  -e LOCALE=en \
  ghcr.io/orangekame3/mirrormate:latest
```

Open http://localhost:3000 in Chrome.

> Set `LOCALE=en` for English or `LOCALE=ja` for Japanese (default).

Say **"Hey Mira"** (English) or **"OK ミラ"** (Japanese) to start talking!

### Option 2: Ollama + VOICEVOX (No API key required)

For a fully local setup:

```bash
# 1. Install and start Ollama
ollama serve
ollama pull gpt-oss:20b

# 2. Clone and start Mirror Mate
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate
docker compose up -d
```

Open http://localhost:3000 in Chrome. Say **"OK ミラ"** to start talking!

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
| `app.yaml` | Application settings (language/locale) |
| `presets/[lang].yaml` | Locale-specific defaults (timezone, weather, STT) |
| `providers.yaml` | LLM and TTS provider settings |
| `features.yaml` | Weather, calendar, time, reminder settings |
| `plugins.yaml` | Visual widget plugins (clock, etc.) |
| `locales/[lang]/` | Language-specific configs (character, memory, rules, modules) |

### Language Support

Mirror Mate supports multiple languages with automatic locale presets. Set the locale in `config/app.yaml`:

```yaml
app:
  locale: "en"  # or "ja" for Japanese
```

This single setting automatically configures:
- **Locale presets**: Time zone, weather locations, STT language, clock format (`config/presets/[lang].yaml`)
- Character personality and speech style (`config/locales/[lang]/character.yaml`)
- Memory extraction prompts (`config/locales/[lang]/memory.yaml`)
- Rules and modules (`config/locales/[lang]/rules.yaml`, `modules.yaml`)
- Database file (`data/mirrormate.[lang].db`)
- Wikipedia API language for "today's info"

| Locale | Timezone | Weather | STT | Clock |
|--------|----------|---------|-----|-------|
| `ja` | Asia/Tokyo | Tokyo, Osaka | Japanese | 24h |
| `en` | America/Los_Angeles | San Francisco, New York | English | 12h |

You can customize these defaults by editing `config/presets/[lang].yaml`. See [Locale Presets](/config/presets) for details.

You can also set the locale via environment variable (overrides config file):

```bash
LOCALE=en  # or ja
```

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

- [Recommended Setup](/guide/recommended-setup) - Production setup with Tailscale, Mac Studio & Raspberry Pi
- [Architecture Overview](/guide/architecture) - Understand how Mirror Mate works
- [Docker Setup](/guide/docker) - Detailed Docker configuration
- [Locale Presets](/config/presets) - Configure locale-specific settings
- [Providers](/config/providers) - Configure LLM and TTS providers
- [Character](/config/character) - Customize AI personality
