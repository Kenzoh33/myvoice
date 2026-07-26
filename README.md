# MyVoice

**Practice your voice before you need it.**

MyVoice is a student-owned self-advocacy coach for K-12 students with an IEP or 504 plan. Every AI tool in special education today is built for the adult in the room — teachers get IEP generators, accommodation-suggestion engines, goal-writing assistants. The student is the subject of the plan, never the owner of it. IDEA requires a self-advocacy plan for every student with an IEP or 504, and there's almost no software that teaches the skill itself. MyVoice flips the direction: it helps the *student* understand their own needs, practice asking for them out loud, and track their own growth.

Built for the CEAMLS Human-AI Collaboration Challenge (Instructional Learning track).

---

## What it does

MyVoice walks a student through four stages, one screen at a time:

| Stage | What happens |
|---|---|
| **1. Name what you need** | Student picks from a menu of common needs (extra time, written instructions, quiet space, movement breaks, read-aloud, translated instructions) or describes their own in free text. Claude matches it to a canonical accommodation category and explains it back in kid-friendly language. |
| **2. Find your words** | Claude roleplays a teacher — either **supportive** or **busy** — and the student practices actually asking, by typing or speaking out loud, with a coaching tip after each exchange. Before moving on, the student picks which of their attempts was their best. |
| **3. Track your growth** | The student says whether this was a real attempt or practice, logs what happened and how it felt (1-5), and gets a reflection written to match. Past reflections are bucketed by accommodation category and charted as a feeling trend over time. |
| **4. Share your voice** | Generates a clean, first-person one-pager — the need, the formal term, an example of how they've practiced asking for it, and optionally their reflections — that the student chooses to hand to a teacher or parent. Copy or print. |

A rising waveform stepper (instead of a generic progress bar) tracks movement through the four stages — the visual metaphor is literal: finding your voice gets louder.

### Two teachers, on purpose

Stage 2 offers a **supportive teacher** and a **busy teacher**. The busy one is distracted, asks the student to repeat themselves, says "not right now, can it wait?", and needs specifics before agreeing.

This is the pedagogical core of the product. A student who has only ever rehearsed against unconditional warmth is *miscalibrated* for a real classroom — the first time a real teacher is short with them, they read it as rejection and stop asking. The supportive mode lowers the floor enough that a nervous student will start at all; the busy mode is what makes the practice transfer. The coaching tip in busy mode always names explicitly that the pushback is normal and not the student's fault.

### Real vs. practice

Stage 3 asks whether the attempt actually happened. It defaults to **practice**, because at that point in the flow the student just came out of a roleplay. Congratulating a student for real-world courage they haven't shown yet manufactures confidence that won't survive contact with an actual classroom — so the prompt acknowledges rehearsal *as* rehearsal, and points forward to the real thing.

---

## Voice input/output

- **Input (speech-to-text):** browser-native Web Speech API (`SpeechRecognition`). Works in Chrome; the student can always fall back to typing. Non-Chrome browsers get an upfront notice rather than discovering it via an error after tapping the mic.
- **Output (text-to-speech):** two tiers. **ElevenLabs** when a key is configured — the client calls `POST /api/tts`, Express proxies to ElevenLabs with a server-held key (never exposed to the browser), and streams back an MP3. When that key is absent or the call fails, it falls back to the browser's own `speechSynthesis`. Read-aloud degrades in quality instead of disappearing.

**Read-aloud is on every screen**, not just teacher replies — the instructions, the explanation card, saved reflections, and the final one-pager all have a speak button. This is the point: a student who needs text read to them must be able to hear the app that teaches them to ask for text to be read to them.

Voice is additive throughout — every stage works fully by text if voice input/output isn't available or fails mid-session.

---

## Privacy

MyVoice handles what functions as special-education record data, written by minors. The posture is deliberate:

- **No account, no login, no database.** Reflections are written to `localStorage` on the student's own device. The MyVoice server never receives, stores, or logs them.
- **What does leave the device:** the need description and practice messages are sent to Anthropic's Claude to generate explanations and roleplay, and to ElevenLabs to generate read-aloud audio. Both process the text to answer the request; neither is used to train models.
- **Sharing is always an explicit student action.** The Stage 4 one-pager reaches a teacher only when the student copies or prints it and hands it over. Nothing is transmitted to a school.
- **The cost of that choice:** because reflections live only in the browser, they don't follow a student to another device and don't survive a school device being wiped or browser data being cleared. For a demo this is the right trade; a real deployment would need a consent-and-retention design, which is a district-policy question before it's an engineering one.
- **In the app:** a plain-language "Who can see what I write here?" disclosure appears on the landing page and Stage 1, written to be read by a middle schooler.

A production deployment in a US K-12 district would need FERPA and IDEA confidentiality review, and COPPA consent for under-13 students. This build is a demo artifact and has not had that review.

---

## Accessibility

The audience is students with disabilities, so this is a correctness requirement, not a polish item:

- Read-aloud on every screen, with a browser-voice fallback.
- `aria-live` on the practice conversation so screen-reader users are told when the teacher replies.
- Semantic landmarks (`main`, `nav`, `header`), a skip link, labelled form controls, and `aria-pressed`/`aria-current` state on toggles and the stepper.
- `prefers-reduced-motion` honoured globally.
- Secondary text uses a `muted` token at 5.5:1 contrast on the app background, replacing earlier `ink/40`–`ink/50` values that sat near 3:1 and failed WCAG AA.
- Emoji are `aria-hidden` with `sr-only` text alternatives, so screen readers never announce a raw emoji as content.

Not yet done: no audit with an actual screen-reader user, no dyslexia-friendly font option, no keyboard-only walkthrough recorded.

---

## Architecture

Two pieces: a **React app** in the browser talks to a local **Express server**, which is the only thing holding API keys and the only thing that ever calls Claude or ElevenLabs. Nothing else touches the network.

```
myvoice/
├── shared/
│   └── taxonomy.js         # Canonical accommodation categories — used by BOTH server and client
├── server/
│   ├── server.js          # Express app — one route per stage, plus guardrails
│   ├── prompts.js         # System prompts; two teacher modes, two reflection framings
│   ├── tools.js           # Anthropic tool-use schemas for guaranteed structured output
│   ├── mock.js            # Fixture responses for MOCK=1 demo mode
│   └── .env                # ANTHROPIC_API_KEY, ELEVENLABS_API_KEY — never committed
├── src/
│   ├── main.jsx
│   ├── App.jsx              # Stage state machine
│   ├── components/
│   │   ├── Landing.jsx          # Stage 0 — hero screen
│   │   ├── Onboarding.jsx       # Stage 1 input — need menu + free text
│   │   ├── UnderstandCard.jsx   # Stage 1 output
│   │   ├── PracticeChat.jsx     # Stage 2 — roleplay, coaching, voice I/O, best-attempt picker
│   │   ├── ReflectJournal.jsx   # Stage 3
│   │   ├── FeelingTrend.jsx     # Stage 3 — feeling-over-time sparkline
│   │   ├── ShareSummary.jsx     # Stage 4 — one-pager, copy/print
│   │   ├── StageStepper.jsx     # Waveform progress indicator
│   │   ├── SpeakButton.jsx      # Read-aloud control, used on every screen
│   │   ├── PrivacyNote.jsx      # Plain-language "who can see this?" disclosure
│   │   └── ErrorBoundary.jsx    # One crash costs a screen, not the session
│   ├── lib/
│   │   ├── api.js            # fetch wrapper, one function per route
│   │   ├── speech.js         # ElevenLabs → browser-voice fallback + useSpeaker hook
│   │   ├── storage.js        # localStorage, bucketed by taxonomy category
│   │   └── classifier.js     # Embedding classifier — parked (see Current status)
│   └── styles/
│       └── index.css          # Tailwind + tokens + reduced-motion + print stylesheet
├── vite.config.js            # Proxies /api -> http://localhost:3001
└── package.json
```

### API routes

All routes are stateless — the client sends whatever context it has each time; the server holds no session.

| Route | Request | Response |
|---|---|---|
| `POST /api/understand` | `{ needText }` | `{ categoryKey, canonicalLabel, plainExplanation, formalTerm, whyItHelps }` |
| `POST /api/practice` | `{ need, history, studentMessage, mode }` | `{ teacherReply, coachTip }` |
| `POST /api/reflect` | `{ need, whatHappened, feeling, notes, attemptType }` | `{ reflectionText }` |
| `POST /api/share` | `{ need, formalTerm, practicedPhrase, reflections }` | `{ summaryText }` |
| `POST /api/tts` | `{ text, voice }` | `audio/mpeg` stream (503 → client uses browser voice) |
| `GET /api/health` | — | `{ ok, mock }` |
| `GET /api/config` | — | `{ mock, elevenLabsAvailable }` |

### The taxonomy layer

`shared/taxonomy.js` holds 18 canonical accommodation categories, each with a fixed `formalTerm`. The server exposes those keys to Claude as a **tool-use enum**, then overrides whatever term the model wrote with the canonical one.

Two reasons this matters. First, consistency of record: "extra time" and "more time on my math test" must land in the *same* bucket, or a student's growth history fragments every time they rephrase themselves — which is what a K-12 student does constantly. Second, safety of output: the formal term can end up on a document a student hands to a teacher, so it should come from a reviewed list rather than from generation.

### AI orchestration

Four distinct AI roles, each with a different job and output contract, not one prompt wrapper:

- **Stage 1 (Claude Haiku, tool-use)** — matches a free-text need to a canonical category and writes a kid-friendly explanation. Structured output is enforced by the API, not by parsing.
- **Stage 2 (Claude Sonnet, tool-use)** — holds multi-turn conversation state and roleplays either a supportive or a busy teacher, with out-of-character coaching each turn.
- **Stage 3 (Claude Sonnet)** — writes a reflection framed differently depending on whether the attempt was real or rehearsed.
- **Stage 4 (Claude Sonnet)** — generates a first-person, under-150-word one-pager from the need, formal term, chosen practice phrase, and past reflections.

### Guardrails

`/api/tts` proxies a paid ElevenLabs account and the Claude routes bill a real key, so the server is not left open:

- CORS restricted to an explicit localhost origin allowlist (was `cors()` with no options).
- In-memory sliding-window rate limit: 30 req/min per IP, 20/min on `/api/tts`.
- Length caps on every input, and a 64 kB JSON body limit.
- Conversation history truncated to the last 40 turns.
- Errors are logged server-side and returned as student-readable messages, never stack traces.

These are proportional to a single-node demo, not a production deployment.

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

**Prerequisites:** Node.js 18+. API keys are optional — see demo mode below.

### Try it with no API keys (demo mode)

```bash
npm install
MOCK=1 npm run dev
```

Open `http://localhost:5173`. All four stages work end to end against hand-written fixtures — no keys, no network calls, no cost. The app shows a "demo mode" banner so nothing is misrepresented as live AI, and read-aloud falls back to your browser's built-in voice.

This exists so the project is evaluable by anyone who clones it, and so a dead conference wifi connection can't kill a live demo.

### Run it against live Claude and ElevenLabs

Create `server/.env`:

```
ANTHROPIC_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

The ElevenLabs key is optional — without it, read-aloud uses the browser voice instead of failing. Then:

```bash
npm run dev
```

Open `http://localhost:5173`. Use Chrome for the strongest Web Speech API support (voice *input* is Chrome-only; everything else works everywhere).

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

All four stages work end-to-end, both against live Claude/ElevenLabs and in `MOCK=1` demo mode.

**Partially shipped:** the embedding classifier (`src/lib/classifier.js`) is still parked on a Vite/`onnxruntime-web` bundling issue — but the taxonomy it was built around is now live in `shared/taxonomy.js`, constraining Claude through a tool-use enum. That delivers the consistency benefit (same need → same bucket → same formal term) without the bundling problem. What the classifier would still add if unblocked: classification with no API call, no token cost, and an auditable similarity score.

**The honest gap: this has not been tested with a single real student.** No K-12 student, special-education teacher, or IEP coordinator has used it or reviewed the prompts. Nothing here demonstrates that it teaches self-advocacy — only that it is a coherent, careful attempt to. For an instructional-learning project, that is the most important thing still missing, and no amount of additional code substitutes for it. The `formalTerm` output in particular needs review by someone who writes IEPs, because it is the one output a student may repeat to an adult as fact.

Also not done:
- No automated test suite; verification is manual against the running app plus a production build.
- No screenshots or demo video in this README.
- No deployed public URL.
- No accessibility audit with an actual screen-reader user.

Candidate next features: an audio-reactive waveform driven by the Web Audio API during teacher playback, recording and replaying the student's own practice audio, and a dyslexia-friendly font toggle.
