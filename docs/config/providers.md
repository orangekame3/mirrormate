# Providers

Mirror Mate uses external providers for LLM (language model), TTS (text-to-speech), STT (speech-to-text), VLM (vision language model), and Embedding (vector generation). Providers are configured in `config/providers.yaml`.

## Configuration

```yaml
providers:
  llm:
    enabled: true
    provider: ollama  # openai or ollama
    # ...

  tts:
    enabled: true
    provider: voicevox  # openai or voicevox
    # ...

  stt:
    enabled: true
    provider: web  # openai, local, or web
    # ...

  vlm:
    enabled: true
    provider: ollama
    # ...

  embedding:
    enabled: true
    provider: ollama
    # ...

  memory:
    enabled: true
    # ...
```

---

## LLM Providers

| Provider | Description | API Key Required |
|----------|-------------|------------------|
| OpenAI | GPT-4o, GPT-4o-mini | Yes |
| Ollama | Local LLM hosting | No |

### OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add to `.env`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

3. Configure in `providers.yaml`:

```yaml
providers:
  llm:
    enabled: true
    provider: openai
    openai:
      model: gpt-4o-mini  # or gpt-4o
      maxTokens: 300
      temperature: 0.7
```

#### Models

| Model | Description | Speed | Cost |
|-------|-------------|-------|------|
| `gpt-4o` | Most capable | Medium | Higher |
| `gpt-4o-mini` | Fast and efficient | Fast | Lower |

### Ollama

[Ollama](https://ollama.com/) allows running LLMs locally without API costs.

1. Install Ollama:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

2. Start Ollama server:

```bash
ollama serve
```

3. Pull a model:

```bash
ollama pull gpt-oss:20b
```

4. Configure in `providers.yaml`:

```yaml
providers:
  llm:
    enabled: true
    provider: ollama
    ollama:
      model: "gpt-oss:20b"
      baseUrl: "http://localhost:11434"
      maxTokens: 300
      temperature: 0.7
```

#### Recommended Models for Japanese

| Model | Size | Japanese Quality | Tool Calling | Speed |
|-------|------|------------------|--------------|-------|
| `gpt-oss:20b` | 20B | Excellent | Native | Medium |
| `qwen2.5:14b` | 14B | Very Good | Yes | Medium |
| `qwen2.5:32b` | 32B | Excellent | Yes | Slow |

### LLM Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `provider` | string | `openai` or `ollama` | `openai` |
| `model` | string | Model name/ID | varies |
| `maxTokens` | number | Maximum response length | 300 |
| `temperature` | number | Creativity (0.0-1.0) | 0.7 |
| `baseUrl` | string | API endpoint (Ollama only) | `http://localhost:11434` |

---

## TTS Providers

| Provider | Description | API Key Required |
|----------|-------------|------------------|
| OpenAI | OpenAI TTS API | Yes |
| VOICEVOX | Free, local, Japanese voices | No |

### OpenAI TTS

```yaml
providers:
  tts:
    enabled: true
    provider: openai
    openai:
      voice: shimmer  # alloy, echo, fable, onyx, nova, shimmer
      model: tts-1    # tts-1 or tts-1-hd
      speed: 0.95
```

#### Voices

| Voice | Description |
|-------|-------------|
| `alloy` | Neutral, balanced |
| `echo` | Warm, conversational |
| `fable` | Expressive, narrative |
| `onyx` | Deep, authoritative |
| `nova` | Friendly, upbeat |
| `shimmer` | Clear, gentle (default) |

### VOICEVOX

1. Download and install VOICEVOX from [voicevox.hiroshiba.jp](https://voicevox.hiroshiba.jp/)
2. Start VOICEVOX (runs on port 50021 by default)
3. Configure:

```yaml
providers:
  tts:
    enabled: true
    provider: voicevox
    voicevox:
      speaker: 3  # Speaker ID
      baseUrl: "http://localhost:50021"
```

#### Speaker IDs (Common)

| ID | Character |
|----|-----------|
| 0 | 四国めたん (あまあま) |
| 1 | ずんだもん (あまあま) |
| 2 | 四国めたん (ノーマル) |
| 3 | ずんだもん (ノーマル) |
| 8 | 春日部つむぎ |
| 9 | 波音リツ |

---

## STT Providers (Speech-to-Text)

STT providers enable speech recognition for voice input. Mirror Mate supports multiple providers with automatic silence detection.

> **Note**: STT language settings can be automatically configured based on your app locale using [Locale Presets](presets.md). When you change your locale (e.g., `ja` to `en`), the STT language is automatically updated.

| Provider | Description | API Key Required | Accuracy |
|----------|-------------|------------------|----------|
| Web Speech API | Browser native (Chrome/Edge) | No | Good |
| OpenAI Whisper | Cloud API | Yes | Excellent |
| Local Whisper | Self-hosted (faster-whisper) | No | Excellent |

### Web Speech API (Default)

Uses the browser's built-in speech recognition. Best for quick setup with no additional configuration.

```yaml
providers:
  stt:
    enabled: true
    provider: web
    web:
      language: ja-JP  # BCP 47 language tag
```

**Pros**: Zero cost, instant setup, real-time interim results
**Cons**: Browser-dependent quality, requires Chrome/Edge

### OpenAI Whisper

High-accuracy speech recognition using OpenAI's Whisper API.

```yaml
providers:
  stt:
    enabled: true
    provider: openai
    openai:
      model: whisper-1
      language: ja  # ISO 639-1 code (or omit for auto-detect)
      temperature: 0
```

**Pros**: Excellent accuracy (especially Japanese), 99+ languages
**Cons**: API cost ($0.006/minute), requires internet

### Local Whisper (faster-whisper)

Self-hosted Whisper for privacy and cost savings. Uses [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) with OpenAI-compatible API.

```yaml
providers:
  stt:
    enabled: true
    provider: local
    local:
      baseUrl: "http://studio:8080"  # Your whisper server
      model: large-v3  # tiny, base, small, medium, large-v3
      language: ja
```

#### Setup with Docker

```bash
# On Mac Studio (or any server)
docker compose -f compose.studio.yaml up -d faster-whisper
```

See [Docker Documentation](/guide/docker) for details.

#### Models

| Model | Size | Accuracy | Speed (30s audio) |
|-------|------|----------|-------------------|
| `tiny` | 39M | Low | ~2s |
| `base` | 74M | Medium | ~4s |
| `small` | 244M | Good | ~8s |
| `medium` | 769M | Very Good | ~12s |
| `large-v3` | 1.5G | Excellent | ~15s |

*Speed measured on Apple M1/M2 Ultra (CPU mode)*

### Silence Detection

All STT providers support automatic silence detection to determine when the user has finished speaking.

```yaml
providers:
  stt:
    silenceDetection:
      silenceThreshold: 1.5      # Seconds of silence before sending
      volumeThreshold: 0.02      # RMS volume threshold (0-1)
      minRecordingDuration: 500  # Minimum recording time (ms)
      maxRecordingDuration: 60000 # Maximum recording time (ms)
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `silenceThreshold` | number | Seconds of silence before auto-send | `1.5` |
| `volumeThreshold` | number | RMS volume below which is silence | `0.02` |
| `minRecordingDuration` | number | Min time before silence detection (ms) | `500` |
| `maxRecordingDuration` | number | Max recording duration (ms) | `60000` |

### STT Options Summary

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `provider` | string | `web`, `openai`, or `local` | `web` |
| `openai.model` | string | Whisper model | `whisper-1` |
| `openai.language` | string | Language code (ISO 639-1) | auto |
| `local.baseUrl` | string | Whisper server URL | `http://localhost:8080` |
| `local.model` | string | Model name | `base` |
| `local.language` | string | Language code | auto |

---

## VLM Providers (Vision Language Model)

VLM providers enable visual understanding through the `see_camera` tool.

| Provider | Description | API Key Required |
|----------|-------------|------------------|
| Ollama | Local vision models (llava, moondream) | No |

### Ollama VLM

```yaml
providers:
  vlm:
    enabled: true
    provider: ollama
    ollama:
      model: llava:7b  # or moondream, granite3.2-vision
      baseUrl: "http://localhost:11434"
```

#### Recommended Vision Models

| Model | Size | Description | Speed |
|-------|------|-------------|-------|
| `moondream` | 1.8B | Lightweight, edge-friendly | Fast |
| `llava:7b` | 7B | Good balance of quality/speed | Medium |
| `granite3.2-vision` | 2B | Document understanding | Medium |

### Usage

When VLM is enabled and the user asks visual questions, the LLM will use the `see_camera` tool:

```
User: "何を持ってるかわかる？"
AI: [calls see_camera tool]
AI: "スマートフォンを持っていますね！"
```

---

## Embedding Providers

Embedding providers generate vector representations of text for semantic search.

| Provider | Description | API Key Required |
|----------|-------------|------------------|
| Ollama | Local embedding models | No |

### Ollama Embedding

```yaml
providers:
  embedding:
    enabled: true
    provider: ollama  # PLaMo server provides Ollama-compatible API
    ollama:
      model: plamo-embedding-1b
      baseUrl: "http://studio:8000"  # PLaMo embedding server
```

#### Recommended Embedding Models

| Model | Dimensions | Description |
|-------|------------|-------------|
| `plamo-embedding-1b` | 2048 | Japanese-optimized, top JMTEB scores (recommended) |
| `bge-m3` | 1024 | Multi-lingual, good quality (alternative) |
| `nomic-embed-text` | 768 | Fast, English-focused |

### Setup

#### Option 1: PLaMo-Embedding-1B (Recommended for Japanese)

PLaMo-Embedding-1B provides superior Japanese text embedding. See [Recommended Setup](/guide/recommended-setup) for full instructions.

```bash
# On Mac Studio
docker compose -f compose.studio.yaml up -d
```

#### Option 2: Ollama with bge-m3 (Alternative)

```bash
ollama serve
ollama pull bge-m3
```

```yaml
providers:
  embedding:
    enabled: true
    provider: ollama
    ollama:
      model: bge-m3
      baseUrl: "http://localhost:11434"
```

---

## Memory Configuration

Memory system enables persistent user context through RAG (Retrieval-Augmented Generation).

```yaml
providers:
  memory:
    enabled: true
    # RAG settings
    rag:
      topK: 8           # Max memories to retrieve
      threshold: 0.3    # Minimum similarity score (0.0-1.0)
    # Memory extraction settings
    extraction:
      autoExtract: true      # Auto-extract from conversations
      minConfidence: 0.5     # Minimum confidence for extraction
```

### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `enabled` | boolean | Enable memory system | `true` |
| `rag.topK` | number | Max memories to retrieve per query | `8` |
| `rag.threshold` | number | Similarity threshold (0.0-1.0) | `0.3` |
| `extraction.autoExtract` | boolean | Auto-extract memories from conversations | `true` |
| `extraction.minConfidence` | number | Minimum confidence for extraction | `0.5` |

### Memory Types

| Type | Description |
|------|-------------|
| `profile` | User preferences, traits, persistent info |
| `episode` | Recent interactions and events |
| `knowledge` | Facts and learned information |

See [Memory Documentation](/guide/memory) for details.

---

## Remote Server Configuration

Recommended setup: Run heavy services (Ollama, VOICEVOX, PLaMo) on a powerful server (e.g., Mac Studio) and connect via Tailscale:

```yaml
# config/providers.yaml
providers:
  llm:
    provider: ollama
    ollama:
      model: "gpt-oss:20b"
      baseUrl: "http://studio:11434"  # Tailscale hostname

  tts:
    provider: voicevox
    voicevox:
      speaker: 3
      baseUrl: "http://studio:50021"  # Tailscale hostname

  embedding:
    enabled: true
    provider: ollama  # PLaMo server provides Ollama-compatible API
    ollama:
      model: plamo-embedding-1b
      baseUrl: "http://studio:8000"  # PLaMo embedding server

  memory:
    enabled: true
    rag:
      topK: 8
      threshold: 0.3
    extraction:
      autoExtract: true
      minConfidence: 0.5
```

See [Docker Documentation](/guide/docker) for details.
