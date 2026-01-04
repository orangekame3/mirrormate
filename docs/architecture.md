# Architecture Overview

MirrorMate is a Next.js application that provides an interactive AI avatar for smart mirror displays.

> **Browser Requirement**: Google Chrome is required for voice recognition (Web Speech API).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    BroadcastChannel    ┌─────────────────┐     │
│  │  / (Avatar) │◄────────────────────►  │ /control (Panel)│     │
│  └──────┬──────┘                        └────────┬────────┘     │
│         │                                        │              │
│  ┌──────▼──────┐                        ┌────────▼────────┐     │
│  │SimpleAvatar │                        │  Text Input     │     │
│  │  Confetti   │                        │  Mic Control    │     │
│  │FloatingInfo │                        └─────────────────┘     │
│  └──────┬──────┘                                                │
│         │ Web Speech API                                        │
│  ┌──────▼──────────┐                                            │
│  │useSpeechRecog.  │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend (API Routes)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  /api/chat     │  │  /api/tts      │  │ /api/reminder  │     │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘     │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│  ┌───────────────────────────────────────────────────────┐      │
│  │                    Core Libraries                      │      │
│  ├───────────────────────────────────────────────────────┤      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │      │
│  │  │   LLM   │ │Features │ │  Rules  │ │  Character  │  │      │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘  │      │
│  │       │           │           │             │         │      │
│  │  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌──────▼──────┐  │      │
│  │  │ OpenAI  │ │ Weather │ │ Modules │ │  Prompts    │  │      │
│  │  │ Ollama  │ │Calendar │ │ Engine  │ │  Persona    │  │      │
│  │  └─────────┘ │  Time   │ └─────────┘ └─────────────┘  │      │
│  │              │Reminder │                              │      │
│  │              └─────────┘                              │      │
│  │  ┌─────────────────────────────────────────────────┐  │      │
│  │  │                    Tools                         │  │      │
│  │  │  ┌────────────┐  ┌────────────┐                 │  │      │
│  │  │  │ Web Search │  │  Effects   │                 │  │      │
│  │  │  │  (Tavily)  │  │ (Confetti) │                 │  │      │
│  │  │  └────────────┘  └────────────┘                 │  │      │
│  │  └─────────────────────────────────────────────────┘  │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐      │
│  │                    SQLite (Drizzle ORM)                │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │      │
│  │  │  Users  │ │Sessions │ │Messages │ │  Memories   │  │      │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────┬──────┘  │      │
│  │                                             │         │      │
│  │  ┌───────────────────────────────────────────────────┐│      │
│  │  │              Memory Embeddings                     ││      │
│  │  │  (Vector storage for semantic search)              ││      │
│  │  └───────────────────────────────────────────────────┘│      │
│  └───────────────────────────────────────────────────────┘      │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────┐      │
│  │                    Memory System                       │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │      │
│  │  │   RAG   │ │Extractor│ │ Handler │ │  Embedding  │  │      │
│  │  │ Service │ │  (LLM)  │ │ (CRUD)  │ │  Provider   │  │      │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Ollama  │ │  OpenAI  │ │ VOICEVOX │ │Open-Meteo│            │
│  │(LLM/Emb) │ │(LLM/TTS) │ │  (TTS)   │ │(Weather) │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                                      │
│  │  Google  │ │  Tavily  │                                      │
│  │ Calendar │ │ (Search) │                                      │
│  └──────────┘ └──────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── chat/          # Chat API endpoint
│   │   ├── tts/           # Text-to-speech API
│   │   ├── reminder/      # Reminder API
│   │   └── memories/      # Memory CRUD API
│   ├── control/
│   │   ├── page.tsx       # Control panel page
│   │   └── memory/        # Memory management page
│   └── page.tsx           # Avatar display page
├── components/
│   ├── SimpleAvatar.tsx   # Avatar with lip-sync
│   ├── Confetti.tsx       # Visual effects
│   └── FloatingInfo.tsx   # Info cards (weather, calendar)
├── hooks/
│   ├── useSpeechRecognition.ts
│   └── useReminder.ts
└── lib/
    ├── db/                # Database (SQLite + Drizzle ORM)
    │   ├── index.ts       # DB client singleton
    │   └── schema.ts      # Table definitions
    ├── llm/               # LLM provider abstraction
    │   ├── openai.ts
    │   ├── ollama.ts
    │   └── types.ts
    ├── embedding/         # Embedding provider
    │   ├── ollama.ts      # Ollama embedding
    │   ├── similarity.ts  # Vector similarity utils
    │   └── types.ts
    ├── memory/            # Memory system
    │   ├── extractor.ts   # LLM-based memory extraction
    │   ├── handler.ts     # Memory CRUD handler
    │   ├── rag.ts         # RAG service
    │   ├── service.ts     # Memory service
    │   └── types.ts
    ├── repositories/      # Data access layer
    │   ├── memory.ts      # Memory repository
    │   ├── user.ts        # User repository
    │   └── session.ts     # Session repository
    ├── features/          # Built-in features
    │   ├── weather/
    │   ├── calendar/
    │   ├── time/
    │   └── registry.ts
    ├── providers/         # LLM/TTS/Embedding provider config
    │   ├── config-loader.ts
    │   ├── embedding.ts
    │   └── types.ts
    ├── rules/             # Rule-based workflows
    │   ├── engine.ts
    │   ├── modules.ts
    │   └── types.ts
    ├── tools/             # LLM function calling tools
    │   ├── web-search.ts
    │   └── effects.ts
    └── character/         # Character configuration
        └── index.ts

config/
├── features.yaml          # Built-in feature settings
├── providers.yaml         # LLM, TTS, Embedding & Memory settings
├── memory.yaml            # Memory extraction prompts
├── character.yaml         # AI personality
├── rules.yaml             # Trigger-based workflows
└── modules.yaml           # Module definitions

data/
└── mirrormate.db          # SQLite database file
```

## Request Flow

### Voice Input Flow

```
1. User speaks
      │
      ▼
2. Web Speech API (useSpeechRecognition)
      │
      ▼
3. POST /api/chat
      │
      ├─► User lookup/create (SQLite)
      │
      ├─► RAG context retrieval
      │   ├─► Get user profile memories
      │   ├─► Embed user message (Ollama)
      │   └─► Semantic search for relevant memories
      │
      ├─► Rule matching (rules.yaml)
      │   └─► Execute modules if matched
      │
      ├─► Build system prompt (character + context + memories)
      │
      ├─► LLM call (OpenAI/Ollama)
      │   └─► Tool calls (web search, effects)
      │
      ├─► Memory extraction (async, non-blocking)
      │   └─► Extract & save new memories from conversation
      │
      └─► Return response + effect
      │
      ▼
4. Display text + trigger effect
      │
      ▼
5. POST /api/tts
      │
      ▼
6. Play audio with lip-sync
```

### Control Panel Flow

```
1. User types message in /control
      │
      ▼
2. BroadcastChannel.postMessage()
      │
      ▼
3. Avatar page receives message
      │
      ▼
4. Same flow as voice input (steps 3-6)
```

## Key Concepts

### Features

Features provide contextual information (weather, calendar, time) that is injected into the system prompt. They run before the LLM call.

See [Features Documentation](features.md)

### Rules

Rules define trigger-based workflows. When a user message matches a trigger (keyword, pattern), the rule's modules are executed and results are injected into the context.

See [Rules Documentation](rules.md)

### Tools

Tools are functions that the LLM can call during the conversation (function calling). Used for web search and triggering effects.

See [Tools Documentation](tools.md)

### Character

Character configuration defines the AI's personality, speech style, and system prompt.

See [Character Documentation](character.md)

### Memory

Memory system enables persistent user context through:

- **Profile memories**: User preferences, traits, and persistent information
- **Episode memories**: Recent interactions and events
- **Knowledge memories**: Facts and learned information

The RAG (Retrieval-Augmented Generation) system retrieves relevant memories using semantic search to provide context-aware responses.

See [Memory Documentation](memory.md)

### Animation

The avatar uses a finite state machine for animation control with 8 states (IDLE, AWARE, LISTENING, THINKING, SPEAKING, CONFIRMING, ERROR, SLEEP). Each state has distinct visual characteristics including eye shapes, mouth curves, and animation parameters.

See [Animation Documentation](animation.md)

### Discord Integration

Share search results, weather info, and other data to Discord for easy access on your phone. When configured, web search results are automatically sent to your Discord channel.

See [Discord Documentation](discord.md)
