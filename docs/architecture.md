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
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Ollama  │ │  OpenAI  │ │ VOICEVOX │ │Open-Meteo│            │
│  │  (LLM)   │ │(LLM/TTS) │ │  (TTS)   │ │(Weather) │            │
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
│   │   └── reminder/      # Reminder API
│   ├── control/           # Control panel page
│   └── page.tsx           # Avatar display page
├── components/
│   ├── SimpleAvatar.tsx   # Avatar with lip-sync
│   ├── Confetti.tsx       # Visual effects
│   └── FloatingInfo.tsx   # Info cards (weather, calendar)
├── hooks/
│   ├── useSpeechRecognition.ts
│   └── useReminder.ts
└── lib/
    ├── llm/               # LLM provider abstraction
    │   ├── openai.ts
    │   ├── ollama.ts
    │   └── types.ts
    ├── features/          # Built-in features
    │   ├── weather/
    │   ├── calendar/
    │   ├── time/
    │   └── registry.ts
    ├── providers/         # LLM/TTS provider config
    │   ├── config-loader.ts
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
├── providers.yaml         # LLM & TTS provider settings
├── character.yaml         # AI personality
├── rules.yaml             # Trigger-based workflows
└── modules.yaml           # Module definitions
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
      ├─► Rule matching (rules.yaml)
      │   └─► Execute modules if matched
      │
      ├─► Build system prompt (character + context)
      │
      ├─► LLM call (OpenAI/Ollama)
      │   └─► Tool calls (web search, effects)
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
