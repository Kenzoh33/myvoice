# MyVoice

**Practice your voice before you need it.**

MyVoice is a student-owned self-advocacy coach for K-12 students with an IEP or 504 plan. Every AI tool in special education today is built for the adult in the room — teachers get IEP generators, accommodation-suggestion engines, goal-writing assistants. The student is the subject of the plan, never the owner of it. IDEA requires a self-advocacy plan for every student with an IEP or 504, and there's almost no software that teaches the skill itself. MyVoice flips the direction: it helps the *student* understand their own needs, practice asking for them out loud, and track their own growth.

Built for the CEAMLS Human-AI Collaboration Challenge (Instructional Learning track).

---

## What it does

MyVoice walks a student through four stages, one screen at a time:

| Stage | What happens |
|---|---|
| **1. Name what you need** | Student picks from a menu of common needs (extra time, written instructions, quiet space, movement breaks, read-aloud, translated instructions) or describes their own in free text. |
| **2. Find your words** | Claude roleplays a warm, realistic teacher. The student practices actually asking for the accommodation — by typing or speaking out loud — and gets a supportive coaching tip after each exchange, with room to retry. |
| **3. Track your growth** | After a practice attempt (real or simulated), the student logs what happened and how it felt (1-5), and gets a short encouraging reflection. Past reflections for that need are saved and shown as a simple timeline. |
| **4. Share your voice** | Generates a clean, first-person one-pager — the need, the formal term, an example of how they've practiced asking for it, and optionally their reflections — that the student chooses to hand to a teacher or parent. Copy or print. |

A rising waveform stepper (instead of a generic progress bar) tracks movement through the four stages — the visual metaphor is literal: finding your voice gets louder.

---

## Voice input/output

- **Input (speech-to-text):** browser-native Web Speech API (`SpeechRecognition`). Works in Chrome; the student can always fall back to typing.
- **Output (text-to-speech):** the "teacher" replies are spoken using **ElevenLabs**, not the browser's built-in synthesis. The client calls `POST /api/tts`, the Express server proxies that request to ElevenLabs with a server-held API key (never exposed to the browser — same pattern as the Anthropic key), and streams back an MP3 that plays via the browser's `Audio` API. A small curated voice picker lets the student choose the teacher's voice.

Voice is additive throughout — every stage works fully by text if voice input/output isn't available or fails mid-session.

---

## Architecture

Two pieces: a **React app** in the browser talks to a local **Express server**, which is the only thing holding API keys and the only thing that ever calls Claude or ElevenLabs. Nothing else touches the network.

```
myvoice/
├── server/
│   ├── server.js          # Express app — one route per stage, plus /api/tts
│   ├── prompts.js         # System prompts, one export per stage
│   └── .env                # ANTHROPIC_API_KEY, ELEVENLABS_API_KEY — never committed
├── src/
│   ├── main.jsx
│   ├── App.jsx              # Stage state machine
│   ├── components/
│   │   ├── Landing.jsx          # Stage 0 — hero screen
│   │   ├── Onboarding.jsx       # Stage 1 input — need menu + free text
│   │   ├── UnderstandCard.jsx   # Stage 1 output
│   │   ├── PracticeChat.jsx     # Stage 2 — roleplay, coaching, voice I/O
│   │   ├── ReflectJournal.jsx   # Stage 3
│   │   ├── ShareSummary.jsx     # Stage 4 — one-pager, copy/print
│   │   └── StageStepper.jsx     # Waveform progress indicator
│   ├── lib/
│   │   ├── api.js            # fetch wrapper, one function per route
│   │   ├── storage.js        # localStorage read/write for reflections
│   │   └── classifier.js     # Embedding classifier — built, not yet wired in (see Roadmap)
│   └── styles/
│       └── index.css          # Tailwind + design tokens + print stylesheet
├── vite.config.js            # Proxies /api -> http://localhost:3001
└── package.json
```

### API routes

All routes are stateless — the client sends whatever context it has each time; the server holds no session.

| Route | Request | Response |
|---|---|---|
| `POST /api/understand` | `{ needText }` | `{ plainExplanation, formalTerm, whyItHelps }` |
| `POST /api/practice` | `{ need, history, studentMessage }` | `{ teacherReply, coachTip }` |
| `POST /api/reflect` | `{ need, whatHappened, feeling, notes }` | `{ reflectionText }` |
| `POST /api/share` | `{ need, formalTerm, practicedPhrase, reflections }` | `{ summaryText }` |
| `POST /api/tts` | `{ text, voice }` | `audio/mpeg` stream |
| `GET /api/health` | — | `{ ok: true }` |

### AI orchestration

Four distinct AI roles, each with a different job and output schema, not one prompt wrapper:

- **Stage 1 (Claude Haiku)** — translates a free-text or menu-selected need into a kid-friendly explanation plus the formal accommodation term a 504/IEP would use.
- **Stage 2 (Claude Sonnet)** — holds multi-turn conversation state, roleplays a realistic teacher who can approve, ask a clarifying question, or gently push back, and gives out-of-character coaching feedback each turn.
- **Stage 3 (Claude Sonnet)** — writes a short reflective summary that validates the student's effort and names something specific they did well.
- **Stage 4 (Claude Sonnet)** — generates a first-person, under-150-word one-pager from the need, formal term, practiced phrase, and past reflections.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Node + Express |
| AI | Anthropic API (`@anthropic-ai/sdk`) — `claude-haiku-4-5` for Stage 1, `claude-sonnet-5` for Stages 2-4 |
| Voice output | ElevenLabs TTS, proxied server-side |
| Voice input | Browser Web Speech API (`SpeechRecognition`) |
| State | React state + `localStorage` (no database — this is a demo artifact) |
| Dev workflow | `concurrently` runs Vite + Express together under one `npm run dev` |

---

## Getting started

**Prerequisites:** Node.js, an [Anthropic API key](https://console.anthropic.com), an [ElevenLabs API key](https://elevenlabs.io) (only needed for spoken teacher replies — everything else works without it).

```bash
npm install
```

Create `server/.env`:

```
ANTHROPIC_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

Run the app (starts Vite on `:5173` and Express on `:3001` together):

```bash
npm run dev
```

Open `http://localhost:5173`. Demo in Chrome for the strongest Web Speech API support.

Other scripts: `npm run build` (production build), `npm run preview` (preview the build).

---

## Design system

Warm but composed — avoids both the generic-SaaS-dashboard look and anything childish.

- **Color:** `mist` (background), `ink` (text), `harbor` (primary actions, teal-green), `marigold` (the one warm accent — used sparingly, for growth milestones and primary CTAs), `sage` (reflection/growth indicators).
- **Type:** Fraunces (display/headings), IBM Plex Sans (body/UI), IBM Plex Mono (the formal accommodation term, rendered as a small pill — visually separating "your words" from "official words").
- **Signature element:** the waveform stepper — four rising bars instead of a numbered progress bar, filling in with `marigold` as each stage completes.
- **Layout:** one stage visible at a time, generous whitespace, one primary action per screen.

---

## Current status

All four stages work end-to-end against live Claude and ElevenLabs calls.

**Parked, not built:** an embedding classifier layer for Stage 1 (`src/lib/classifier.js` — taxonomy and cosine-similarity matching are written using `@xenova/transformers`, but wiring it into the live app is blocked on a Vite/`onnxruntime-web` bundling issue that needs further debugging). Candidate next features under consideration: an audio-reactive waveform driven by the Web Audio API during teacher playback, a feeling-trend sparkline on the Reflect stage, and recording/replaying the student's own practice-attempt audio.

No automated test suite exists yet; verification is manual/live against the running app.
