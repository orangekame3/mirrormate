# Mirror Mate

Self-hosted personalized AI in a mirror.

**[Documentation](https://www.orangekame3.net/mirrormate/)**

<p align="center">
  <img src="docs/public/mirrormate.png" alt="Mirror Mate Preview" width="600">
</p>

https://github.com/user-attachments/assets/c9005df4-9bdb-4190-861e-c8f5f9290468

## Features

- Voice interaction with wake word activation
- Personalized memory (RAG-based context)
- Expressive avatar with lip-sync animation
- Multiple LLM/TTS providers (OpenAI, Ollama, VOICEVOX)
- Built-in weather, calendar, reminders, web search
- Plugin system for custom widgets

## Quick Start

**OpenAI:**

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-xxx \
  -e LLM_PROVIDER=openai \
  -e TTS_PROVIDER=openai \
  ghcr.io/orangekame3/mirrormate:latest
```

**Ollama + VOICEVOX (local):**

```bash
ollama pull qwen2.5:14b
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate && docker compose up -d
```

Open http://localhost:3000 in **Chrome**.

## Development

```bash
bun install && bun run dev
```

## License

[MIT](LICENSE)
