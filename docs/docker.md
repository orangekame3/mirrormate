# Docker Setup

MirrorMate can be run using Docker with optional VOICEVOX integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Host Machine                         │
│  ┌─────────────────┐                                        │
│  │     Ollama      │◄─── http://host.docker.internal:11434  │
│  │ (LLM/Embedding) │                                        │
│  │   (port 11434)  │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ host.docker.internal
         │
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │   mirrormate    │────────►│    voicevox     │            │
│  │   (port 3000)   │         │  (port 50021)   │            │
│  │                 │                                        │
│  │  ┌───────────┐  │                                        │
│  │  │  SQLite   │  │◄─── mirrormate-data volume             │
│  │  │ (memory)  │  │                                        │
│  │  └───────────┘  │                                        │
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
cp config/providers.docker.yaml config/providers.yaml
```

Or edit `config/providers.yaml` to use Docker-compatible URLs:

```yaml
providers:
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
  mirrormate:
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
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./config:/app/config:ro
      - mirrormate-data:/app/data  # SQLite database persistence
    depends_on:
      - voicevox
    restart: unless-stopped

  voicevox:
    image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped

volumes:
  mirrormate-data:  # Persistent volume for SQLite database
```

## Service Configuration

### mirrormate

| Setting | Description |
|---------|-------------|
| Port | 3000 |
| Config | Mounted from `./config` (read-only) |
| Data | Persisted in `mirrormate-data` volume |
| Host Access | `host.docker.internal` for Ollama |

### Data Persistence

The SQLite database (memories, users, sessions) is stored in the `mirrormate-data` Docker volume:

```bash
# View volume location
docker volume inspect mirrormate-data

# Backup the database
docker run --rm -v mirrormate-data:/data -v $(pwd):/backup alpine \
  cp /data/mirrormate.db /backup/mirrormate-backup.db

# Restore from backup
docker run --rm -v mirrormate-data:/data -v $(pwd):/backup alpine \
  cp /backup/mirrormate-backup.db /data/mirrormate.db
```

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

# Optional: Override LLM provider (openai or ollama)
LLM_PROVIDER=openai

# Optional: Override TTS provider (openai or voicevox)
TTS_PROVIDER=openai

# Optional: Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=...

# Optional: Web Search
TAVILY_API_KEY=tvly-...

# Optional: Discord Integration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Quick Start with OpenAI

To use OpenAI without any config files:

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-xxx \
  -e LLM_PROVIDER=openai \
  -e TTS_PROVIDER=openai \
  ghcr.io/orangekame3/mirrormate:latest
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

In `config/providers.yaml`:

```yaml
providers:
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
docker build -t mirrormate .
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
