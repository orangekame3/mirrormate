# Magic Mirror

An interactive AI avatar for magic mirror displays. Features a minimalist white avatar with real-time lip-sync and voice responses.

## Features

- Minimalist avatar with eyes and animated mouth
- Real-time lip-sync using Web Audio API
- OpenAI GPT-4o-mini for conversations
- OpenAI TTS for voice synthesis
- Separate display and control pages for demos

## Pages

- `/` - Avatar display (for magic mirror projection)
- `/control` - Control panel (for sending messages)

Uses BroadcastChannel API for real-time communication between pages.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```
OPENAI_API_KEY=your_api_key_here
```

3. Run development server:

```bash
npm run dev
```

4. Open `http://localhost:3000` for avatar display
5. Open `http://localhost:3000/control` in another tab to send messages

## Usage

1. Click the avatar page once to enable audio
2. Send messages from the control page
3. Avatar will respond with voice and text

## Tech Stack

- Next.js 15
- React 19
- Three.js
- OpenAI API (GPT-4o-mini, TTS)
- Tailwind CSS
