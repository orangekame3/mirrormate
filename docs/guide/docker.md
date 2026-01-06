# Docker Setup

Mirror Mate can be deployed using Docker with a recommended split architecture.

## Recommended Architecture

Run heavy services on a powerful server (e.g., Mac Studio) and the UI on a lightweight device (e.g., Raspberry Pi), connected via Tailscale:

```mermaid
flowchart TB
    subgraph Tailscale["Tailscale Network"]
        subgraph Studio["Mac Studio (studio)"]
            Ollama["Ollama (native)<br/>:11434"]
            VOICEVOX["VOICEVOX (Docker)<br/>:50021"]
            Whisper["faster-whisper (Docker)<br/>:8080"]
            PLaMo["PLaMo-Embedding (Docker)<br/>:8000"]
        end

        subgraph RPi["Raspberry Pi"]
            subgraph MM["mirrormate :3000"]
                App["Next.js App"]
                SQLite[(SQLite<br/>Memory)]
            end
            Volume[("mirrormate-data<br/>volume")] -.-> SQLite
        end

        MM -->|http://studio:11434| Ollama
        MM -->|http://studio:50021| VOICEVOX
        MM -->|http://studio:8080| Whisper
        MM -->|http://studio:8000| PLaMo
    end
```

## Quick Start

### Mac Studio Setup

1. **Install Ollama (native)**

```bash
brew install ollama
brew services start ollama
ollama pull gpt-oss:20b
```

2. **Start Docker Services**

```bash
docker compose -f compose.studio.yaml up -d
```

This starts:
- **faster-whisper** (:8080) - Speech-to-text (Whisper)
- **VOICEVOX** (:50021) - Text-to-speech
- **PLaMo-Embedding-1B** (:8000) - Japanese-optimized embedding

3. **Verify**

```bash
curl http://localhost:11434/api/tags    # Ollama
curl http://localhost:8080/health       # Whisper
curl http://localhost:50021/speakers | head  # VOICEVOX
curl http://localhost:8000/health       # PLaMo
```

### Raspberry Pi Setup

1. **Create Environment File**

```bash
cp .env.example .env
# Edit .env with your API keys
```

2. **Configure providers.yaml**

Ensure `config/providers.yaml` points to your Mac Studio:

```yaml
providers:
  llm:
    provider: ollama
    ollama:
      baseUrl: "http://studio:11434"  # Tailscale hostname

  tts:
    provider: voicevox
    voicevox:
      baseUrl: "http://studio:50021"  # Tailscale hostname

  stt:
    provider: local  # Use local Whisper instead of Web Speech API
    local:
      baseUrl: "http://studio:8080"  # Tailscale hostname
      model: large-v3
      language: ja

  embedding:
    provider: ollama
    ollama:
      baseUrl: "http://studio:8000"  # PLaMo server
```

3. **Start UI**

```bash
docker compose up -d
```

4. **Access**

Open http://localhost:3000

## Compose Files

### compose.yaml (UI - Raspberry Pi)

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
      - OLLAMA_API_KEY=${OLLAMA_API_KEY}
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
    volumes:
      - ./config:/app/config:ro
      - mirrormate-data:/app/data
    restart: unless-stopped

volumes:
  mirrormate-data:
```

### compose.studio.yaml (Services - Mac Studio)

```yaml
services:
  # Speech-to-Text (Whisper)
  faster-whisper:
    image: fedirz/faster-whisper-server:latest-cpu
    ports:
      - "8080:8000"
    environment:
      - WHISPER__MODEL=large-v3
      - WHISPER__INFERENCE_DEVICE=cpu
    restart: unless-stopped

  # Text-to-Speech
  voicevox:
    image: voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    ports:
      - "50021:50021"
    restart: unless-stopped

  # Embedding
  plamo-embedding:
    build:
      context: ./plamo-server
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    restart: unless-stopped
```

## Data Persistence

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

## Environment Variables

Create a `.env` file:

```bash
# Required for OpenAI LLM/TTS (if not using Ollama/VOICEVOX)
OPENAI_API_KEY=sk-...

# Optional: Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=...

# Optional: Web Search (Ollama)
# Get API key from: https://ollama.com/settings/keys
OLLAMA_API_KEY=your-ollama-api-key

# Optional: Discord Integration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## GPU Support

### NVIDIA GPU (Linux)

For faster inference with NVIDIA GPU:

```yaml
services:
  # Whisper with CUDA
  faster-whisper:
    image: fedirz/faster-whisper-server:latest-cuda
    ports:
      - "8080:8000"
    environment:
      - WHISPER__MODEL=large-v3
      - WHISPER__INFERENCE_DEVICE=cuda
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # VOICEVOX with CUDA
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

### Apple Silicon (Mac Studio)

Use CPU versions. Apple Silicon is fast enough for real-time inference:

- **faster-whisper**: `large-v3` model processes 30s audio in ~15s
- **VOICEVOX**: CPU version works well on M1/M2 Ultra

Note: Metal GPU acceleration is not available in Docker containers.

## Troubleshooting

### Cannot connect to Ollama

**Error**: Connection refused to `studio:11434`

**Solution**:
1. Ensure Ollama is running on Mac Studio: `ollama serve` or `brew services start ollama`
2. Verify Tailscale connection: `ping studio`
3. Check Ollama is listening: `curl http://studio:11434/api/tags`

### VOICEVOX not responding

**Error**: Connection refused to port 50021

**Solution**:
1. Check VOICEVOX container: `docker compose -f compose.studio.yaml ps`
2. Check logs: `docker compose -f compose.studio.yaml logs voicevox`
3. Wait for startup (first launch takes time to load models)

### Config changes not applied

**Solution**: Config is mounted as read-only. Changes apply immediately but may require page refresh.

### Whisper not transcribing

**Error**: No transcription returned or empty response

**Solution**:
1. Check faster-whisper container: `docker compose -f compose.studio.yaml ps`
2. Check logs: `docker compose -f compose.studio.yaml logs faster-whisper`
3. First request may be slow (model loading)
4. Verify endpoint: `curl http://studio:8080/health`
5. Check `providers.yaml` has `provider: local` (not `web`)

## Commands

### Mac Studio

```bash
# Start VOICEVOX
docker compose -f compose.studio.yaml up -d

# View logs
docker compose -f compose.studio.yaml logs -f

# Stop
docker compose -f compose.studio.yaml down
```

### Raspberry Pi

```bash
# Start UI
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d
```
