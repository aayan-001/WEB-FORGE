# Roshan Rozgar (روزگار روشن) - Backend

Voice-first marketplace connecting households with nearby skilled trade workers.
Built for **CUI Tech Fest - AI Web Forge**. This is **Step 1 (backend)**; the frontend follows the Figma exactly.

## Run it
Requires **Node 22.13+** (uses the built-in `node:sqlite`; **zero npm dependencies**, nothing to install).

```bash
cp .env.example .env     # optional - add GEMINI_API_KEY to switch on the LLM
npm run seed             # optional - the server auto-seeds an empty database on start
npm start                # http://localhost:3000
npm test                 # 9 end-to-end tests (runs on rule-based AI, no key needed)
```

## What is seeded / simulated (disclose in the final README)
- 14 fictional workers across 5 trades, with fictional phone numbers, ratings, job counts and reviews. Positions are placed relative to G-10 so distances match the Figma (Ahmed 0.8 km, Bilal 1.4 km, Imran 2.1 km).
- Imran Ali is *really* busy: a seeded booked job holds him, so "Masroof" is real state. Shahid Iqbal is off for today.
- Sector coordinates (Islamabad/Rawalpindi) are approximate.
- Phone numbers of workers who onboard without giving one are randomly generated mocks. Calls are not placed by the platform.
- No login/OTP, payments or ID verification (out of scope). Sessions are anonymous bearer tokens. "Tasdeeq shuda" (verified) is a seeded flag.
- Chat messages are stored as text (speech transcripts); "play" buttons are meant to use browser text-to-speech. Audio files are not stored.

## AI - what it does and what breaks without it
| Where | LLM task | Fallback when no key / failure |
|---|---|---|
| Customer speaks a problem | Understand Urdu / Roman Urdu / mixed, pick the trade, short summary in 3 scripts ("AI ne samjha") | Keyword classifier |
| Worker onboarding | Spoken self-description -> name, trade, years, areas, skills -> full profile (no form) | Regex + keyword extraction |
| Chat | Reads worker's messages -> agreed job / time / price card ("AI ne tay shuda baat likhi") | Regex for prices ("derh hazar", "1,500") and times |
| After the job | Voice note -> written review, star rating, tags | Tag keywords + thumbs |
| Worker profile | "AI khulasa" from the latest reviews | Built from review tags |

Every AI response carries `source: "ai" | "fallback"`, and `/api/health` shows live counters, so nothing mocked is presented as AI.
Without AI the worker would have to type a profile, customers would have to browse and type, and prices would be scraped manually - which is the barrier this product removes.

**Speech-to-text** is done in the browser (Web Speech API, `ur-PK`) - no key and no server cost. `POST /api/stt` is an optional Whisper path if `OPENAI_API_KEY` is set. **Text-to-speech** is the browser's `speechSynthesis`.

## How availability stays consistent
`workers.busy_job_id` is the single source of truth. Booking runs in a `BEGIN IMMEDIATE` transaction with
`UPDATE workers SET busy_job_id=? WHERE id=? AND busy_job_id IS NULL AND available_today=1`; exactly one concurrent booking can win (see the race test). A worker is shown as **busy** when booked or switched off for today, and is freed when the job completes, is cancelled, or the customer reviews. Other customers chatting with the same worker are told immediately.

## API (JSON, `Authorization: Bearer <token>`)
Every text field comes in `roman` / `urdu` / `en` so the language switch needs no extra calls.

| Figma screen | Endpoint |
|---|---|
| Language | `GET /api/config` (languages, trades, areas, price options) |
| Start (customer) | `POST /api/customers {language, area_id? , lat?, lng?}` -> `{token}` |
| Masla batayen - speak/tap | `POST /api/ai/understand {text?, trade_id?}` -> trade, `summary` ("AI ne samjha") |
| Qareebi karigar + filters | `GET /api/workers?trade=&area_id=&available=1&min_rating=4&sort=nearest\|rating` |
| Karigar ka profile | `GET /api/workers/:id` (stats, `ai_summary`, `reviews`, `intro` for "Awaaz mein ta aruf") |
| Baat karain | `POST /api/jobs {worker_id, problem_text, understanding?}` |
| Chat | `GET /api/jobs/:id?after=<msgId>` (poll), `POST /api/jobs/:id/messages {text}` |
| Book karain | `POST /api/jobs/:id/book` (409 `WORKER_UNAVAILABLE` if someone else won) |
| Booking pakki | response of book; `worker.phone` appears only now |
| Kaam kaisa raha? | `POST /api/jobs/:id/review {sentiment:'good'\|'bad', stars?, transcript?}` |
| **Worker** onboarding | `POST /api/workers/onboard {transcript?, trade_id?}` (repeatable = "Dobara bolain"), then `PATCH /api/workers/me {confirm:true}` ("Theek hai") |
| Main aaj dastiyab hoon | `PATCH /api/workers/me {available_today:true\|false}` |
| Naya kaam (inbox) | `GET /api/jobs/mine` (`first_message` for "Customer ka paigham sunain", `price_options`) |
| Qabool hai / Maazrat | `POST /api/jobs/:id/accept {price \| price_text, time_text?}` / `POST /api/jobs/:id/decline` |
| Extras | `POST /api/jobs/:id/complete`, `/cancel`, `GET /api/demo/workers`, `POST /api/auth/demo-worker {worker_id}` |

Errors: `{ "error": { "code", "message" (Roman Urdu), "message_ur" } }`.

## Known limitations
- Chat uses polling, not websockets. Availability is "free now / busy", not a time-slot calendar.
- Review stars come from thumbs, the AI, or an explicit `stars` value. Fallback review text reuses short transcripts as-is.
- Fallback Urdu-script output for Latin input is limited to trade names and fixed phrases; the LLM path produces full Urdu.
- Fallback price parsing understands digits and common words (derh/dhai/ek..das hazar), not every spoken form.
- SQLite file DB, single process: right for a demo, not for scale.

## AI tools and credits
AI services: Google Gemini API (optional, model set by `GEMINI_MODEL`); optional OpenAI Whisper; browser Web Speech API.
AI coding assistant: Claude was used to write this backend (disclose as required by the rules).
No third-party packages.
