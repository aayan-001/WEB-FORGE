# Roshan Rozgar - Frontend

Plain HTML / CSS / ES-modules (no build step, no npm packages) so it works with the backend's zero-dependency philosophy.
Responsive: single-column app with a bottom tab bar on phones, wider grid + top navigation on desktop (>= 900px).
Languages: Roman Urdu, Urdu (RTL, Nastaliq font) and English, switchable from the top bar on every screen.

## Run
The backend already supports serving a frontend through `STATIC_DIR` (no backend code is changed):

```bash
cd roshan-rozgar-backend
STATIC_DIR=../roshan-rozgar-frontend npm start      # http://localhost:3000
# or put  STATIC_DIR=../roshan-rozgar-frontend  in the backend's .env
```
To host the frontend elsewhere, set `window.RR_API_BASE` in `config.js` (the backend already sends CORS headers).

## Screens -> backend endpoints
| Screen | Route | Endpoints |
|---|---|---|
| Language / role | `#/lang` `#/role` | `GET /api/config` |
| Speak the problem | `#/home` | `POST /api/ai/understand` |
| "AI ne samjha" | `#/understand` | (result of the call above, shows `source` ai / fallback) |
| Nearby workers + filters | `#/workers` | `GET /api/workers?trade&area_id\|lat,lng&available&min_rating&sort` |
| Worker profile | `#/worker/:id` | `GET /api/workers/:id` |
| Chat + AI deal card + Book | `#/chat/:id` | `POST /api/jobs`, `GET /api/jobs/:id?after=` (2.5 s poll), `POST .../messages`, `POST .../book` |
| Booking confirmed (phone appears) | `#/booked/:id` | `GET /api/jobs/:id`, `.../complete`, `.../cancel` |
| Review | `#/review/:id` | `POST /api/jobs/:id/review` |
| My jobs | `#/jobs` | `GET /api/jobs/mine` |
| Worker voice onboarding | `#/w/start` | `POST /api/workers/onboard` (+ demo login: `GET /api/demo/workers`, `POST /api/auth/demo-worker`) |
| Confirm profile ("Theek hai") | `#/w/confirm` | `GET/PATCH /api/workers/me` |
| Dashboard + "Naya kaam" inbox | `#/w/home` | `PATCH /api/workers/me {available_today}`, `GET /api/jobs/mine` |
| Worker job: price chips / own price by voice / Qabool / Maazrat | `#/w/job/:id` | `POST .../accept`, `.../decline`, `.../complete` |

## Speech
* **Speech-to-text** (`js/speech.js`): browser Web Speech API (`ur-PK` / `en-PK`) as the README of the backend specifies.
  If the browser has none (e.g. Firefox) it records audio and uses `POST /api/stt` (only works if the backend has `OPENAI_API_KEY`).
  Every voice input also has a typing box, so nothing depends on the microphone. Needs HTTPS or `localhost` and Chrome/Edge/Safari for the best result.
* The transcript is what the backend's **Gemini** layer understands (problem -> trade, worker profile from speech, deal card from chat, review from a voice note, AI khulasa). The UI shows whether each AI result came from Gemini or the rule-based fallback (`source`).
* **Text-to-speech**: browser `speechSynthesis` for the play buttons (profile intro, chat messages, customer message).

## Matching the Figma
All colours, radii, fonts and spacing are CSS variables at the top of `css/styles.css`; copy text lives in `js/i18n.js`.
