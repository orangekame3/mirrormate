# Providers

Mirror Mate uses external providers for LLM (language model), TTS (text-to-speech), and Embedding (vector generation). Providers are configured in `config/providers.yaml`.

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
ollama pull qwen2.5:14b
```

4. Configure in `providers.yaml`:

```yaml
providers:
  llm:
    enabled: true
    provider: ollama
    ollama:
      model: "qwen2.5:14b"
      baseUrl: "http://localhost:11434"
      maxTokens: 300
      temperature: 0.7
```

#### Recommended Models for Japanese

| Model | Size | Japanese Quality | Speed |
|-------|------|------------------|-------|
| `qwen2.5:7b` | 7B | Good | Fast |
| `qwen2.5:14b` | 14B | Very Good | Medium |
| `qwen2.5:32b` | 32B | Excellent | Slow |
| `rinna/qwen2.5-bakeneko-32b` | 32B | Excellent | Slow |

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
      model: "qwen2.5:14b"
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
