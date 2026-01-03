# Memory System

MirrorMate includes a memory system that enables persistent user context through RAG (Retrieval-Augmented Generation). The system stores user information, extracts memories from conversations, and provides relevant context to the AI.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Memory Flow                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input ──► Embed Query ──► Semantic Search ──► RAG Context │
│       │                              │                           │
│       │                              ▼                           │
│       │                    ┌─────────────────┐                   │
│       │                    │   Memories DB   │                   │
│       │                    │  ┌───────────┐  │                   │
│       │                    │  │  Profile  │  │                   │
│       │                    │  │  Episode  │  │                   │
│       │                    │  │ Knowledge │  │                   │
│       │                    │  └───────────┘  │                   │
│       │                    └─────────────────┘                   │
│       │                              ▲                           │
│       ▼                              │                           │
│  LLM Response ──► Extract Memories ──┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

Memory settings are configured in `config/providers.yaml`:

```yaml
providers:
  embedding:
    enabled: true
    provider: ollama
    ollama:
      model: bge-m3
      baseUrl: "http://localhost:11434"

  memory:
    enabled: true
    # RAG settings
    rag:
      topK: 8           # Max memories to retrieve
      threshold: 0.3    # Minimum similarity score
    # Memory extraction settings
    extraction:
      autoExtract: true      # Auto-extract from conversations
      minConfidence: 0.5     # Minimum confidence threshold
```

## Memory Types

| Type | Description | Example |
|------|-------------|---------|
| `profile` | User preferences and traits | "Favorite color: blue" |
| `episode` | Recent interactions and events | "Asked about weather on 2024-01-01" |
| `knowledge` | Facts and learned information | "User works at ACME Corp" |

### Profile Memories

Profile memories store persistent user information:

- User preferences (language, style)
- Personality traits
- Communication preferences
- Recurring topics of interest

Profile memories are **always included** in the RAG context.

### Episode Memories

Episode memories capture recent interactions:

- Recent conversations
- Events and activities
- Time-sensitive information

Episodes have a recency factor that prioritizes recent memories.

### Knowledge Memories

Knowledge memories store factual information:

- User's work, hobbies, relationships
- Learned facts from conversations
- Important dates and information

---

## RAG (Retrieval-Augmented Generation)

The RAG system retrieves relevant memories to provide context-aware responses.

### How It Works

1. **Embed Query**: Convert user input to a vector using Ollama embedding
2. **Semantic Search**: Find similar memories using cosine similarity
3. **Rank Results**: Sort by similarity score and filter by threshold
4. **Format Context**: Combine profiles and relevant memories into a prompt

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `topK` | number | Maximum memories to retrieve | `8` |
| `threshold` | number | Minimum similarity score (0.0-1.0) | `0.3` |

### Example Context Output

```
[User Profile]
- Preferred language: Japanese
- Interests: programming, music

[Related Information]
- [Important] (Note) User works at a tech company
- (Recent) Asked about weather forecast yesterday
```

---

## Memory Extraction

The system automatically extracts memories from conversations using the LLM.

### How It Works

1. **Analyze Conversation**: Send recent messages to LLM for analysis
2. **Extract Information**: LLM identifies memorable facts and updates
3. **Validate Results**: Filter by confidence score
4. **Store Memories**: Save to database with embeddings

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `autoExtract` | boolean | Enable automatic extraction | `true` |
| `minConfidence` | number | Minimum confidence for saving (0.0-1.0) | `0.5` |

### Extraction Process

The LLM is prompted to extract:

- **Profile Updates**: Changes to user preferences or traits
- **New Memories**: Facts worth remembering
- **Archive Candidates**: Outdated or superseded information

---

## Database Schema

MirrorMate uses SQLite with Drizzle ORM for persistence.

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `sessions` | Conversation sessions |
| `messages` | Chat messages |
| `memories` | Stored memories |
| `memory_embeddings` | Vector embeddings for semantic search |

### Memory Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `userId` | string | Owner user ID |
| `kind` | enum | profile, episode, or knowledge |
| `title` | string | Memory title/key |
| `content` | string | Memory content |
| `tags` | string[] | Categorization tags |
| `importance` | number | Importance score (0.0-1.0) |
| `status` | enum | active, archived, or deleted |
| `source` | enum | manual or extracted |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |
| `lastUsedAt` | datetime | Last retrieval timestamp |

---

## Memory Management UI

Access the memory management interface at `/control/memory`.

### Features

- **View Memories**: List all memories with filtering
- **Create Memory**: Manually add new memories
- **Edit Memory**: Update existing memories
- **Delete Memory**: Soft delete or permanently remove
- **Filter**: By type (profile/episode/knowledge) and status

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memories` | List memories |
| POST | `/api/memories` | Create memory |
| GET | `/api/memories/[id]` | Get memory details |
| PUT | `/api/memories/[id]` | Update memory |
| DELETE | `/api/memories/[id]` | Delete memory |

### Query Parameters

**GET /api/memories**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user ID |
| `kind` | string | Filter by type (profile/episode/knowledge) |
| `status` | string | Filter by status (active/archived/deleted) |

**DELETE /api/memories/[id]**

| Parameter | Type | Description |
|-----------|------|-------------|
| `hard` | boolean | If true, permanently delete |

---

## Setup

### 1. Install Embedding Model

```bash
# Start Ollama
ollama serve

# Pull the embedding model
ollama pull bge-m3
```

### 2. Initialize Database

```bash
# Create data directory
mkdir -p data

# Run database migration
npm run db:push
```

### 3. Configure Providers

Edit `config/providers.yaml`:

```yaml
providers:
  embedding:
    enabled: true
    provider: ollama
    ollama:
      model: bge-m3
      baseUrl: "http://localhost:11434"

  memory:
    enabled: true
    rag:
      topK: 8
      threshold: 0.3
    extraction:
      autoExtract: true
      minConfidence: 0.5
```

### 4. Verify Setup

```bash
# Start the development server
npm run dev

# Open memory management
open http://localhost:3000/control/memory
```

---

## Docker Setup

When running in Docker, the database is persisted in a volume:

```yaml
# compose.yaml
services:
  mirrormate:
    volumes:
      - mirrormate-data:/app/data

volumes:
  mirrormate-data:
```

Configure embedding to use host Ollama:

```yaml
# config/providers.docker.yaml
providers:
  embedding:
    enabled: true
    provider: ollama
    ollama:
      model: bge-m3
      baseUrl: "http://host.docker.internal:11434"
```

See [Docker Documentation](docker.md) for details.

---

## Troubleshooting

### Embedding Model Not Found

**Error**: `Ollama embed API error: 404`

**Solution**:
1. Ensure Ollama is running: `ollama serve`
2. Pull the model: `ollama pull bge-m3`
3. Verify the model exists: `ollama list`

### Database Not Found

**Error**: `SQLITE_CANTOPEN`

**Solution**:
1. Create data directory: `mkdir -p data`
2. Run migration: `npm run db:push`

### Memory Not Being Extracted

**Solution**:
1. Check `memory.enabled` is `true` in config
2. Check `extraction.autoExtract` is `true`
3. Verify LLM provider is working
4. Check console logs for extraction errors

### Low Quality Retrieval

**Solution**:
1. Lower the `threshold` value (e.g., 0.2)
2. Increase the `topK` value
3. Add more profile memories for better context
4. Use a higher quality embedding model

---

## Best Practices

### Memory Organization

1. **Use profile memories for persistent info**: Things that rarely change
2. **Use episode memories for recent events**: Time-sensitive information
3. **Use knowledge memories for facts**: Learned information

### Performance Tips

1. **Set appropriate thresholds**: Too low = irrelevant results, too high = missing context
2. **Keep topK reasonable**: 5-10 is usually sufficient
3. **Periodic cleanup**: Archive or delete outdated memories

### Privacy Considerations

1. **Review extracted memories**: Check what the LLM is storing
2. **Manual cleanup**: Remove sensitive information if needed
3. **User-specific memories**: Memories are scoped to user IDs
