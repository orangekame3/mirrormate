# LLM Providers

MirrorMate supports multiple LLM (Large Language Model) providers for generating responses.

## Supported Providers

| Provider | Description | API Key Required |
|----------|-------------|------------------|
| OpenAI | GPT-4o, GPT-4o-mini | Yes |
| Ollama | Local LLM hosting | No |

## Configuration

Configure the LLM provider in `config/plugins.yaml`:

```yaml
plugins:
  llm:
    enabled: true
    provider: ollama  # openai or ollama
    openai:
      model: gpt-4o-mini
      maxTokens: 300
      temperature: 0.7
    ollama:
      model: "qwen2.5:14b"
      baseUrl: "http://localhost:11434"
      maxTokens: 300
      temperature: 0.7
```

## OpenAI

### Setup

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add to `.env`:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

3. Configure in `plugins.yaml`:

```yaml
plugins:
  llm:
    provider: openai
    openai:
      model: gpt-4o-mini  # or gpt-4o
      maxTokens: 300
      temperature: 0.7
```

### Models

| Model | Description | Speed | Cost |
|-------|-------------|-------|------|
| `gpt-4o` | Most capable | Medium | Higher |
| `gpt-4o-mini` | Fast and efficient | Fast | Lower |

## Ollama

[Ollama](https://ollama.com/) allows running LLMs locally without API costs.

### Setup

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

4. Configure in `plugins.yaml`:

```yaml
plugins:
  llm:
    provider: ollama
    ollama:
      model: "qwen2.5:14b"
      baseUrl: "http://localhost:11434"
```

### Recommended Models for Japanese

| Model | Size | Japanese Quality | Speed |
|-------|------|------------------|-------|
| `qwen2.5:7b` | 7B | Good | Fast |
| `qwen2.5:14b` | 14B | Very Good | Medium |
| `qwen2.5:32b` | 32B | Excellent | Slow |
| `llama3.2:3b` | 3B | Fair | Very Fast |
| `rinna/qwen2.5-bakeneko-32b` | 32B | Excellent | Slow |

### Available Models

Check your installed models:

```bash
ollama list
```

Or via API:

```bash
curl http://localhost:11434/v1/models | jq .
```

## Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `provider` | string | `openai` or `ollama` | `openai` |
| `model` | string | Model name/ID | varies |
| `maxTokens` | number | Maximum response length | 300 |
| `temperature` | number | Creativity (0.0-1.0) | 0.7 |
| `baseUrl` | string | API endpoint (Ollama only) | `http://localhost:11434` |

## Function Calling (Tools)

Both providers support function calling for:

- **Web Search**: Search the internet via Tavily API
- **Effects**: Trigger visual effects (confetti, hearts, sparkles)

Tools are automatically provided to the LLM and can be called during conversation.

See [Tools Documentation](tools.md) for details.

## Docker Configuration

When running in Docker with Ollama on the host:

```yaml
# config/plugins.docker.yaml
plugins:
  llm:
    provider: ollama
    ollama:
      model: "qwen2.5:14b"
      baseUrl: "http://host.docker.internal:11434"  # Access host from container
```

See [Docker Documentation](docker.md) for details.
