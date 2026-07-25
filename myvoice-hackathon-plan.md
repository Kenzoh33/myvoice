# MyVoice — CEAMLS Human-AI Collaboration Challenge Build Plan

**Track:** Instructional Learning | Web app (satisfies macOS + Windows) | Solo build
**Hard deadline:** Working demo by end of Saturday. Submission Sunday 12pm is upload-only.

---

## 0. Before Saturday — prep checklist

None of this is "building the project" — it's removing friction so all 8 hours Saturday go toward the app itself.

- [ ] Node.js + npm installed and working (`node -v` runs clean)
- [ ] Anthropic API key created, billing/credits confirmed active, tested with one real API call — don't debug auth on the clock
- [ ] Double-check current model names/pricing at docs.claude.com (`claude-haiku-4-5`, `claude-sonnet-5`) — these can shift
- [ ] Google Fonts links for Fraunces / IBM Plex Sans / IBM Plex Mono tested and loading
- [ ] Empty GitHub repo created (or `git init` ready locally)
- [ ] Plan to demo in **Chrome** — Web Speech API support is strongest there
- [ ] If attempting the classifier stretch (3.5): pre-download/test `@xenova/transformers` once at home — the model is ~90MB, and hackathon wifi is not something to gamble a live download on
- [ ] **Verify the hackathon's rule on pre-event setup.** Installing tools and getting API keys beforehand is almost always fine; if you're unsure whether *any* code needs to be written strictly within the event window, a quick check beats an assumption
- [ ] Laptop charger + a phone hotspot as backup internet

---

## 1. The pitch (memorize this, it's your presentation backbone)

> Every AI tool in K-12 special education today is built for the adult — teachers get IEP generators, accommodation suggestion engines, goal-writing assistants. The student is the subject of the plan, never the owner of it. But self-advocacy is a *required* transition-planning goal under IDEA, and there's no software for it. MyVoice flips the direction: it's the first AI tool that helps the *student* understand their own needs, practice asking for them, and track their own growth — putting empowerment and agency literally into the student's hands, not the adult's.

Tie every demo beat back to the symposium's own words: **empowerment, agency, belonging.**

---

## 2. MVP scope — 5 stages, build in this order

**Stage 0 — Landing**
- Static hero screen: one-line mission statement + the IDEA stat (from section 1) + a Start button
- Costs almost nothing to build, but means a judge browsing without you narrating still gets the point in 5 seconds

**Stage 1 — Understand**
- Input: menu of common needs (extra time, instructions repeated/written down, quiet space, movement breaks, reading aloud, translated instructions) + free-text option
- Output: (a) plain-language kid-friendly explanation of what this need means and why it helps, (b) the formal accommodation phrase a teacher/IEP would use
- This is your "translation layer" — a real product hook, not just a chatbot

**Stage 2 — Practice**
- AI roleplays a teacher/adult in a short chat
- Student types the actual ask ("Can I get instructions written down too?")
- AI coaches tone/clarity, offers a supportive rewrite, lets student retry
- This is your technical centerpiece — multi-turn state + coaching feedback loop
- **Voice upgrade (attempt after text works):** browser-native `SpeechRecognition` to transcribe what the student says out loud, `SpeechSynthesis` to have the "teacher" reply out loud. Zero npm installs, zero server calls, built into Chrome. Highest-leverage addition for a live demo — a judge watching a spoken exchange lands very differently than reading chat bubbles. **Hard checkpoint: if text-based Stage 2 isn't fully working by the 2:45 mark (see schedule), skip voice and move on.** Text always ships; voice is additive, never a dependency.

**Stage 3 — Reflect**
- Simple form after a real (or simulated) attempt: what happened, how it felt (1-5), notes
- AI generates a short encouraging reflective summary
- Render as a simple timeline/list — no charts needed, don't overbuild

**Stage 4 — Share**
- One-click generates a clean one-pager from need + practiced language + reflections
- Frame explicitly: "You choose what to share, and with who" — this is where agency becomes visibly real in the UI, not just a tagline

**Cut list if you're behind schedule (in order of what to drop):** Stage 4 formatting polish → Stage 3 charts/timeline styling → multiple menu items in Stage 1 → voice upgrade in Stage 2 → Stage 0 landing screen → never cut Stage 2's core text loop, it's your technical proof point.

---

## 3. Architecture at a glance

Three pieces: your **React app** in the browser talks to a local **Express server**, which is the only thing holding the Anthropic API key and the only thing that ever calls **Claude**. Nothing else touches the network. Keep it boring and reliable — hackathon day is not the day to experiment with a new stack.

### 3.1 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | You already know it |
| Styling | Tailwind CSS | Fast to write, professional output without hand-rolled CSS |
| Backend | Node + Express | One file, a handful of routes, nothing fancy |
| AI | Anthropic API (`@anthropic-ai/sdk`) | Server-side only — key never touches the browser (~30 min extra setup, worth it for the Technical Implementation score) |
| Model | `claude-haiku-4-5` for Stage 1 (fast classification), `claude-sonnet-5` for Stages 2–4 (quality matters more where a judge is watching the coaching happen live) | Balances speed and demo quality — double check current model names/pricing at docs.claude.com before committing, in case anything's shipped since |
| State | React state + `localStorage` | No database — this is a demo artifact, not a shipped product |
| Dev workflow | `concurrently` npm package, one `npm run dev` runs Vite + Express together | One terminal instead of two |
| Deploy | Optional — running locally is safer for the live demo than depending on a deploy working Sunday. If you deploy, do it once early and don't touch it again. |

### 3.2 File structure

```
myvoice/
├── server/
│   ├── server.js          # Express app, one route per stage
│   ├── prompts.js         # system prompts, one export per stage
│   └── .env                # ANTHROPIC_API_KEY — never commit this
├── src/
│   ├── main.jsx
│   ├── App.jsx              # holds the 4-stage state machine
│   ├── components/
│   │   ├── Onboarding.jsx      # need menu + free text (Stage 1 input)
│   │   ├── UnderstandCard.jsx  # Stage 1 output
│   │   ├── PracticeChat.jsx    # Stage 2 — roleplay + coaching
│   │   ├── ReflectJournal.jsx  # Stage 3
│   │   ├── ShareSummary.jsx    # Stage 4
│   │   └── StageStepper.jsx    # waveform progress indicator, see 4.3
│   ├── lib/
│   │   ├── api.js            # fetch wrapper, one function per route
│   │   └── storage.js        # localStorage read/write helpers
│   └── styles/
│       └── index.css          # Tailwind + design tokens
├── vite.config.js            # proxy '/api' -> http://localhost:3001
└── package.json
```

### 3.3 API design

All four routes are stateless — client sends whatever context it has each time, server holds no session. This is the simplest possible state model and it's enough:

- `POST /api/understand` — `{ needText }` → `{ plainExplanation, formalTerm, whyItHelps }`
- `POST /api/practice` — `{ need, history, studentMessage }` → `{ teacherReply, coachTip }` (client keeps and resends the full `history` array each turn)
- `POST /api/reflect` — `{ need, whatHappened, feeling }` → `{ reflectionText }`
- `POST /api/share` — `{ need, formalTerm, practicedPhrase, reflections }` → `{ summaryText }`

### 3.4 Starter system prompts

Drafts to get past the blank-page problem Saturday morning — refine the voice once you see real outputs.

**Stage 1 — Understand:**
> You are MyVoice, helping a K-12 student understand a learning need in warm, simple, age-appropriate language. Given their description, return JSON only: `plainExplanation` (2-3 sentences, validating and simple), `formalTerm` (the closest real accommodation term a 504/IEP might use), `whyItHelps` (1 sentence). No markdown fences, JSON only.

**Stage 2 — Practice:**
> Roleplay as a realistic, reasonable middle/high school teacher. The student is practicing asking you for [need]. Return JSON: `teacherReply` (1-2 sentences, in character — approve, ask a clarifying question, or gently push back so it's real practice, don't just always agree instantly), `coachTip` (1 short sentence, out of character, warm, never critical — praise what worked or suggest one concrete phrasing improvement).

**Stage 3 — Reflect:**
> The student just described a real attempt at self-advocacy. Write a 2-3 sentence reflection that validates their effort regardless of outcome and names one specific thing they did well. Never use clinical or diagnostic language.

**Stage 4 — Share:**
> Generate a first-person, under-150-word summary a student could hand to a teacher or parent, covering: their need in plain language, the formal term, and one example of how they've practiced asking for it. Warm but not childish tone.

### 3.5 Stretch goal: a real classifier layer (kills the "AI wrapper" critique)

If Stages 1-4 are solid with time to spare, this is the highest-value addition you can make — it turns "where's your AI in this" from a defense into a strength.

- Use `@xenova/transformers` (runs a small MiniLM sentence-embedding model client-side via WebAssembly — no server round trip, no extra API cost, well documented)
- Define a fixed taxonomy of ~15-20 accommodation categories up front (extended time, written instructions, quiet space, movement breaks, preferential seating, etc.)
- Embed the taxonomy once at app startup; embed the student's free-text input on submit; cosine similarity → best match
- Pass the matched category (not the raw text) to Claude for Stage 1's explanation — Claude generates, it doesn't classify
- Budget: ~45-60 min. Only attempt after Stages 1-4 work end to end.

**Why this matters more than it looks:** it's a genuine, separate ML component doing real classification, sitting next to the LLM doing generation. It's not decorative — it's a defensible architecture decision you can explain.

---

## 4. Visual design system

Avoid two failure modes: a generic SaaS dashboard (reads cold for a tool aimed at a nervous kid), and cutesy/childish (won't read as professional to judges). Aim for **warm but composed** — matches the Instructional Learning track you picked.

**Color** (named, not defaults — avoid the cream+terracotta look every AI-generated demo reaches for this year):
- `mist` `#F1F4F1` — background, soft sage-tinted off-white
- `ink` `#22303A` — primary text, deep charcoal-navy, not pure black
- `harbor` `#3D6B66` — primary actions, navigation — calm, trustworthy teal-green
- `marigold` `#E3A857` — the one warm accent, used sparingly: the practice button, a completed stage, a growth milestone. Spread it everywhere and it stops meaning anything.
- `sage` `#7FA07A` — soft green, growth/reflection indicators only

**Type:**
- Display: **Fraunces** (Google Fonts, variable) — warm, characterful serif, used only for headings and when quoting the student's own words back to them
- Body/UI: **IBM Plex Sans** — clean and legible without being sterile
- The formal accommodation term from Stage 1: render it in **IBM Plex Mono**, in a small pill. Not decoration — it visually separates "your words" from "official words," which is the actual idea of the product made visible on screen.

**Signature element — the waveform stepper:** instead of a generic 1-2-3-4 progress bar, render the 4 stages as a rising soundwave, each bar taller than the last, filling in with `marigold` as completed. A literal visual metaphor for "finding your voice gets louder" — it's the one thing a judge will remember about the UI. Spend your design ambition here; keep everything else quiet around it.

**Layout:** one stage visible at a time, generous whitespace, one primary action per screen. Don't build a multi-panel dashboard — a linear, calm flow matches both the emotional tone and your time budget.

**Motion:** a soft fade/slide between stages, chat bubbles gently rising in during Stage 2. Nothing more — extra animation reads as generic AI-polish, not intentional design.

**On-screen language:** don't label stages generically — the copy itself should carry the theme, since a judge reading the screen without you narrating should still get it:
- Stage 1: "Name what you need"
- Stage 2: "Find your words"
- Stage 3: "Track your growth"
- Stage 4: "Share your voice"
- Landing tagline: "Practice your voice before you need it."
- Landing stat callout: "IDEA requires a self-advocacy plan for every student with an IEP or 504 — almost no software teaches the skill itself." (verify final wording against the citation in section 1 before using it verbatim)

---

## 5. Hour-by-hour Saturday schedule (8 focused hours)

| Time | Task |
|---|---|
| 0:00–0:25 | Repo scaffold (Vite+React), Express skeleton, API key wired, git init |
| 0:25–1:15 | Stage 1 end-to-end: one clean vertical slice (input → Claude call → output) before any styling |
| 1:15–3:15 | Stage 2 (Practice/roleplay) — text-based core first. **Checkpoint at 2:45: only attempt the voice upgrade if the core loop is fully working; otherwise move on.** |
| 3:15–4:00 | Stage 3 (Reflect journal) |
| 4:00–4:30 | Stage 4 (Share one-pager) — your demo "wow" moment |
| 4:30–4:50 | Stage 0 (Landing screen) — mostly static content, quick |
| 4:50–6:00 | UI polish pass: waveform stepper, visual design, loading states, error handling (API failures must not crash the demo) |
| 6:00–7:00 | Seed one realistic persona (e.g. "Maya, 8th grade, needs instructions repeated + extra time") so the live demo isn't starting blank. Rehearse the full 90-second flow. Write demo narrative. |
| 7:00–7:30 | Buffer + bug bash |
| 7:30–8:00 | **Record a backup screen-capture video of the full flow working**, in case live API, voice recognition, or wifi fails during Sunday's presentation — you won't have Sunday to fix it live |

---

## 6. Judging criteria checklist (say these explicitly if asked)

- **Innovation:** whitespace — only student-owned (not teacher-facing) self-advocacy tool in the K-12 AI landscape
- **K-12 Impact:** 15%+ of students have IEP/504s; self-advocacy is an IDEA-required goal area; generalizes to ELL and anxious students too
- **Technical Implementation:** 5-stage AI pipeline (translation, multi-turn coached roleplay with optional voice I/O, reflective summarization, generative one-pager) — real orchestration, not a single prompt wrapper
- **Presentation:** landing screen sets context in 5 seconds even without narration; demo the persona's full journey (Understand → Practice → Reflect → Share) in under 2 minutes; close on the theme language: empowerment, agency, belonging

---

## 7. Backup plan

If Stage 2's roleplay coaching logic gets gnarly, fall back to a simpler single-turn version: student types their ask once, AI gives one rewrite + one tip, no multi-turn state. Still demoable, still shows real AI use — just less impressive than the full loop. Better a working simple version than a broken ambitious one.

**If voice misfires live:** just say "let me type this one" and switch to text mid-demo. That's not a failure to hide — real accommodations sometimes need a backup method too, so a graceful degrade actually reinforces the product's own point instead of undercutting it.

---

## 8. Q&A prep

**"Where's the AI in this?"**

Without the classifier layer (3.5):
> "This isn't one prompt — it's four distinct AI roles with different jobs and different output schemas. Stage 2 specifically holds conversation state across multiple turns, and the coaching reacts to what the student actually typed, not a fixed script. That's orchestration, not a wrapper."

With the classifier layer:
> "We deliberately split the pipeline. Classification into a formal accommodation category needs to be consistent and auditable — you don't want an LLM phrasing the same need three different ways for three different kids — so that's a real embedding classifier running client-side. Generation — the warm explanation, the coaching, the reflection — needs fluency and empathy, which is what the LLM is actually good at. That split is a deliberate architecture decision, not an accident."

**"What's your legal/research basis?"**

> "IDEA 2004, 34 CFR §300.320(b), requires measurable postsecondary goals starting no later than age 16. The statute itself says 'transition services,' not the word 'self-advocacy' — but the U.S. Department of Education's own official transition planning guidance explicitly names self-advocacy as one of those goal areas. So there's a real legal mandate for the skill, and almost no software that actually teaches it, as opposed to writing case-file paperwork about a student."

Don't overclaim beyond this — if pushed further ("is this validated? has it been tested with real students?"), the honest answer is no, it's a hackathon prototype built on a real, sourced legal and research gap, not a claim of clinical efficacy.
