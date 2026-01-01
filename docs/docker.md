# Docker Setup

Magic Mirror can be run using Docker with optional VOICEVOX integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Host Machine                         │
│  ┌─────────────────┐                                        │
│  │     Ollama      │◄─── http://host.docker.internal:11434  │
│  │   (port 11434)  │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ host.docker.internal
         │
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │       mm2       │────────►│    voicevox     │            │
│  │   (port 3000)   │         │  (port 50021)   │            │
│  └─────────────────┘         └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Environment File

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Create Docker Config

Copy the Docker-specific configuration:

```bash
cp config/plugins.docker.yaml config/plugins.yaml
```

Or edit `config/plugins.yaml` to use Docker-compatible URLs:

```yaml
plugins:
  llm:
    provider: ollama
    ollama:
      baseUrl: "http://host.docker.internal:11434"  # Ollama on host

  tts:
    provider: voicevox
    voicevox:
      baseUrl: "http://voicevox:50021"  # VOICEVOX container
```

### 3. Start Services

```bash
docker compose up -d
```

### 4. Access

Open http://localhost:3000

## compose.yaml

```yaml
services:
  mm2:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_SERVICE_ACCOUNT_EMAIL=${GOOGLE_SERVICE_ACCOUNT_EMAIL}
      - GOOGLE_PRIVATE_KEY=${GOOGLE_PRIVATE_KEY}
      - GOOGLE_CALENDAR_ID=${GOOGLE_CALENDAR_ID}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./config:/app/config:ro
    depends_on:
      - voicevox
    restart: unless-stopped

  voicevox:
    image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped
```

## Service Configuration

### mm2 (Magic Mirror)

| Setting | Description |
|---------|-------------|
| Port | 3000 |
| Config | Mounted from `./config` (read-only) |
| Host Access | `host.docker.internal` for Ollama |

### voicevox

| Setting | Description |
|---------|-------------|
| Image | `voicevox/voicevox_engine:cpu-ubuntu20.04-latest` |
| Port | 50021 |
| GPU | Use `nvidia-ubuntu20.04-latest` for GPU support |

## Environment Variables

Create a `.env` file:

```bash
# Required for OpenAI LLM/TTS
OPENAI_API_KEY=sk-...

# Optional: Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=...

# Optional: Web Search
TAVILY_API_KEY=tvly-...
```

## Using Ollama on Host

Ollama runs on the host machine (not in Docker) for better performance:

### 1. Install and Start Ollama

```bash
# Install
brew install ollama  # macOS
# or
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Start
ollama serve

# Pull a model
ollama pull qwen2.5:14b
```

### 2. Configure Connection

In `config/plugins.yaml`:

```yaml
plugins:
  llm:
    provider: ollama
    ollama:
      model: "qwen2.5:14b"
      baseUrl: "http://host.docker.internal:11434"
```

The `host.docker.internal` hostname allows the container to access the host's Ollama.

## GPU Support for VOICEVOX

For faster TTS, use the GPU version:

```yaml
services:
  voicevox:
    image: voicevox/voicevox_engine:nvidia-ubuntu20.04-latest
    ports:
      - "50021:50021"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Building the Image

### Development Build

```bash
docker compose build
```

### Production Build

```bash
docker build -t magic-mirror .
```

## Troubleshooting

### Cannot connect to Ollama

**Error**: Connection refused to `host.docker.internal:11434`

**Solution**:
1. Ensure Ollama is running: `ollama serve`
2. Check Ollama is listening: `curl http://localhost:11434/api/tags`
3. On Linux, ensure `extra_hosts` is configured in compose.yaml

### VOICEVOX not responding

**Error**: Connection refused to port 50021

**Solution**:
1. Check VOICEVOX container is running: `docker compose ps`
2. Check logs: `docker compose logs voicevox`
3. Wait for startup (first launch takes time to load models)

### Weather API timeout

**Error**: ETIMEDOUT when fetching weather

**Solution**: The Dockerfile includes `NODE_OPTIONS="--dns-result-order=ipv4first"` to fix IPv6 issues.

### Config changes not applied

**Solution**: Config is mounted as read-only. Changes apply immediately but may require page refresh.

## Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Check status
docker compose ps
```
