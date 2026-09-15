# Ajrasakha Chatbot MVP

Ajrasakha is a full-stack agricultural-support application for farmers and experts. Farmers can create a private AI chat or join an expert-created session, ask typed or recorded questions, choose a language, and play replies as audio. Experts can create, review, reply to, clear, end, and delete sessions.

> This repository uses JavaScript and JSX. This README is based on the current source code, rather than the previous README.

## Verified stack

| Technology | Version | Actual use |
| --- | --- | --- |
| React / React DOM | 18.3.1 | Browser UI and local component/context state. |
| Vite | 6.0.5 | Frontend development and build. |
| React Router | 7.1.1 | Client-side routes and UI-level route guards. |
| Firebase Auth | 11.10.0 | Google popup login in the frontend. |
| Node.js + Express | Express 4.21.2 | REST API server. |
| MongoDB + Mongoose | Mongoose 8.9.5 | Persistent users, sessions, review items, knowledge, and diagnosis reports. |
| Socket.IO | 4.8.1 | Session updates and notifications. |
| Gemini REST API | env-configured | Agricultural text answers and diagnosis-explanation rewriting; no Gemini SDK. |
| Sarvam REST API | env-configured | Speech-to-text and text-to-speech. |
| OpenAI / Plant.id REST APIs | env-configured | Optional image-diagnosis provider chain. |
| Multer | 1.4.5-lts.1 | In-memory multipart audio/image uploads. |
| `node:crypto` scrypt | built-in | Salted password hashing and verification. |
| CORS, Morgan, dotenv | 2.8.5 / 1.10.0 / 16.4.5 | Origin restriction, request logging, and environment loading. |

There is no Axios, Redux, JWT, bcrypt, validation library, UI component library, or test framework in the source. The backend package declares Firebase, but backend code does not import it.

## Architecture

```text
Browser
  |
  v
React + Vite + React Router ---- Firebase Google popup (optional)
  | REST via frontend/src/api.js             |
  v                                         |
Express API + Socket.IO <--------------------+
  |             |
  v             v
MongoDB       Gemini / Sarvam / OpenAI / Plant.id (when configured)
```

`backend/src/server.js` connects MongoDB, syncs selected indexes, upserts sample knowledge, creates an HTTP server, attaches Socket.IO, and listens on `PORT` (default `5000`). MongoDB must be reachable before the server starts.

`backend/src/app.js` enables CORS for `CLIENT_URL`, parses JSON, enables Morgan, and mounts meta, auth, chat, and speech routers.

## Implemented features

- Backend email/password registration and sign-in, plus frontend Firebase Google popup sign-in.
- Browser-local farmer/expert profile selection and protected frontend routes.
- AI chats and expert sessions with saved message history, clear, end, and delete actions.
- Gemini text generation with a keyword-based agricultural fallback when Gemini is unavailable.
- Language selection for English (`en`), Hindi (`hi`), Telugu (`te`), Tamil (`ta`), and Kannada (`kn`).
- Browser microphone recording, Sarvam transcription, Sarvam synthesis, and audio playback.
- Socket.IO notifications and session-update rooms.
- MongoDB persistence for `User`, `ChatSession`, `ReviewQueueItem`, `KnowledgeEntry`, and `DiagnosisReport`.
- An optional image-diagnosis service implementation.

## Frontend flow

1. `main.jsx` renders `App` inside `BrowserRouter` and `AuthProvider`.
2. `App.jsx` redirects users without a local user to `/signin`, then users without a local profile to `/role-setup`.
3. `AuthContext.jsx` uses backend endpoints for password auth or Firebase for Google popup auth. It stores user data, contacts, and the selected role profile in `localStorage`.
4. `RoleSelectionPage.jsx` writes `farmer` or `expert` to that local profile.
5. `AppLayout.jsx` connects Socket.IO after a user/profile exists, emits `register-role`, provides the socket to dashboards, and shows transient notifications.
6. Farmer and expert dashboards call `api.js` and update React state from REST and socket payloads.

| File | Responsibility |
| --- | --- |
| `frontend/src/api.js` | Fetch wrapper and all frontend REST calls. |
| `frontend/src/auth/AuthContext.jsx` | Client auth/profile state and localStorage persistence. |
| `frontend/src/firebase.js` | Firebase initialization from required `VITE_FIREBASE_*` variables. |
| `frontend/src/pages/FarmerDashboardPage.jsx` | Farmer chat, history, joining, microphone recording, and audio playback. |
| `frontend/src/pages/ExpertDashboardPage.jsx` | Expert session lifecycle and replies. |
| `frontend/src/pages/AppLayout.jsx` | Socket connection, role registration, and notifications. |

## Mounted REST API

All endpoints are prefixed by `/api`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Returns `{ status: "ok" }`. |
| GET | `/languages` | Lists five language codes/labels. |
| POST | `/auth/signup` | Validates an email/phone and six-character password; creates `User`. |
| POST | `/auth/signin` | Verifies password with scrypt; returns user/contact data. |
| POST | `/chat/sessions` | Creates a `kind: "session"` expert session with an `AG-...` code. |
| POST | `/chat/sessions/join` | Finds a session code and adds supplied farmer/contact data if absent. |
| POST | `/chat/messages` | Stores farmer message + AI reply, then emits updates. |
| POST | `/chat/sessions/:id/replies` | Stores an expert reply and emits updates. |
| POST | `/chat/sessions/:id/end` | Marks a session ended and appends a closing message. |
| POST | `/chat/sessions/:id/clear` | Removes all embedded messages. |
| GET | `/chat/sessions` | Lists expert sessions or farmer sessions filtered by `ownerUid`. |
| GET | `/chat/sessions/:id` | Returns a complete session. |
| DELETE | `/chat/sessions/:id` | Deletes a session. |
| POST | `/speech/transcribe` | Receives multipart `audio`; returns a transcript. |
| POST | `/speech/synthesize` | Receives text/language; returns base64 audio. |

## Core flows

### Farmer message → AI response

```text
FarmerDashboardPage.handleSubmit
 -> POST /api/chat/messages
 -> createFarmerMessage
 -> find/create ChatSession
 -> append farmer message
 -> resolveAnswer -> generateAgricultureAnswer
 -> Gemini REST API OR fallbackAnswer
 -> create pending ReviewQueueItem
 -> append assistant message + save ChatSession
 -> Socket.IO session:update / notification
 -> 201 { sessionId, session, messages }
```

`llm.service.js` sends Gemini a single prompt containing the question, selected response language, practical-answer constraints, and no verified context by default. It does **not** include conversation history. If no Gemini key exists, the request fails, or response parsing fails, `fallbackAnswer()` returns a hard-coded agricultural response based on keyword checks.

Despite its name, `retrieval.service.js` does not search `KnowledgeEntry`. It only generates an answer and creates a pending review item. The seeded knowledge data is therefore not used by the current chat-answer flow.

### Voice-to-text

```text
Record button
 -> getUserMedia({ audio: true })
 -> MediaRecorder collects chunks
 -> on stop: WebM/default Blob
 -> multipart POST /api/speech/transcribe
 -> Multer memory storage
 -> Sarvam /speech-to-text, model saarika:v2.5
 -> { transcript } fills textarea
 -> user manually submits chat form
```

The page stops microphone tracks after recording and surfaces recording/transcription errors. Without `SARVAM_API_KEY`, the backend responds `503`.

### Text-to-speech

```text
Play Audio -> POST /api/speech/synthesize { text, language }
-> Sarvam /text-to-speech (speaker anushka, 22050 Hz)
-> { audioBase64 }
-> browser Audio data:audio/wav;base64,... playback
```

The UI supports pause/resume for the selected reply. It assumes a WAV data URL; the backend returns Sarvam's base64 field without conversion.

### Real-time updates

REST persists changes; Socket.IO distributes the saved payload afterwards. Voice data does not use Socket.IO.

```text
connect -> register-role { role, uid }
expert: room role:expert     farmer: room user:<uid>

open session -> join-session -> room session:<id>

message saved -> session:update to session room + farmer room
farmer message in expert session -> notification to role:expert
expert reply/end -> notification to farmer user room
```

The expert dashboard listens for `notification` and `session:update`; the farmer dashboard listens for `session:update` for the active session.

## Language, authentication, and authorization

Language is selected in dashboard dropdowns and sent to API calls. `normalizeLanguage()` trims/lowercases or defaults to `en`; it does not validate or detect a language. Gemini gets the mapped language name. Sarvam maps to `en-IN`, `hi-IN`, `te-IN`, `ta-IN`, and `kn-IN`. `translateText()` and `sarvamTranslateText()` exist but are not called by the UI or a controller.

Password sign-up creates a random 16-byte salt and scrypt hash; sign-in uses timing-safe comparison. Google login uses Firebase only in the browser.

> **Security limitation:** There is no JWT, cookie/session, Firebase ID-token verification, auth middleware, or backend role authorization. Roles are stored in browser localStorage, and endpoints accept IDs/filters from the client. Socket.IO also has no authentication. Do not claim secure server-enforced role access in an interview.

## Database models

| Model | Purpose |
| --- | --- |
| `User` | Unique sparse email/phone, password hash/salt, display name, timestamps. |
| `ChatSession` | Owner/contact data, names, kind, unique code, language, status, preview, timestamps, and embedded messages. |
| `ReviewQueueItem` | AI question/answer/language and pending/approved/rejected status. No review API/UI is present. |
| `KnowledgeEntry` | Seeded question/answer, language, crop, tags, and golden/pop source; not queried by chat. |
| `DiagnosisReport` | Persistable crop diagnosis result and provider source. |

Messages are embedded subdocuments in `ChatSession`, rather than a separate collection. `ownerUid` is a string field, not a Mongoose reference.

## Image diagnosis: code exists, feature is unavailable

`diagnosis.service.js` attempts OpenAI vision first, then Plant.id, then a low-confidence heuristic response. Gemini can rewrite its explanation. `diagnosis.routes.js` defines a 5 MB image upload and report endpoints, but `app.js` does **not** mount that router and the frontend has no diagnosis UI. Therefore image diagnosis is not reachable in the current application.

## Error handling and security notes

| Area | Verified behavior |
| --- | --- |
| Validation | Controllers check required data, basic email/phone format, and password length. |
| AI | Gemini failure/absence falls back to keyword-driven answers. |
| Speech | Sarvam errors become `503`; frontend displays failures. |
| Diagnosis | Provider failure falls through to the next provider or heuristic result. |
| Uploads | Speech limit is 10 MB; diagnosis limit is 5 MB; both use memory storage. No file-type filter. |
| Secrets | `.env` is ignored; backend uses dotenv and frontend uses Vite env variables. |
| CORS | Express and Socket.IO allow `CLIENT_URL`. |

No rate limiting, centralized Express error middleware, request timeout/retry policy, file MIME validation, or production Socket.IO scaling configuration is implemented.

## Setup

### Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

MongoDB must be running. Defaults: `MONGODB_URI=mongodb://127.0.0.1:27017/ajrasakha`, `PORT=5000`, and `CLIENT_URL=http://localhost:5173`. Optional keys read by `env.js` include `GEMINI_API_KEY`, `SARVAM_API_KEY`, `OPENAI_API_KEY`, and `PLANT_ID_API_KEY`.

### Frontend

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:5000/api
```

```bash
cd frontend
npm install
npm run dev
```

For Google popup login, authorize the development host (for example `127.0.0.1` or `localhost`) in Firebase Authentication.

## Interview preparation

### Best components to study

1. **Session lifecycle:** `FarmerDashboardPage.jsx`, `chat.controller.js`, `ChatSession.js`, and `socket.service.js` — session creation, embedded messages, persistence, and live distribution.
2. **Voice pipeline:** `FarmerDashboardPage.jsx`, `api.js`, `speech.controller.js`, and `sarvam.service.js` — MediaRecorder, multipart upload, STT, and base64 playback.
3. **AI fallback design:** `llm.service.js` and `retrieval.service.js` — prompt construction, safe fallback behavior, and review-item persistence.

| Interview question | Code-based answer | Files |
| --- | --- | --- |
| How does the UI talk to the backend? | Browser `fetch` in `api.js`; JSON normally and `FormData` for audio. | `frontend/src/api.js` |
| How are messages stored? | Farmer and assistant/expert messages are embedded in one `ChatSession` document. | `chat.controller.js`, `ChatSession.js` |
| What happens if Gemini fails? | A keyword-driven fallback answer is returned and a pending review item is stored. | `llm.service.js`, `retrieval.service.js` |
| Why both REST and Socket.IO? | REST performs durable writes; Socket.IO pushes the resulting saved session to rooms. | `chat.controller.js`, `socket.service.js` |
| Is authorization server-enforced? | No; frontend routing/profile state is not backend authorization. | `AuthContext.jsx`, `app.js` |

For a large-scale design discussion, distinguish improvements from current implementation: horizontally scaled Socket.IO with a shared adapter, rate limiting/queues for AI services, object storage for media, separated message storage, token verification, and server-side authorization are not implemented here.

## Verified vs. not verified

### Verified from code

- React farmer/expert dashboards, REST APIs, Socket.IO update events, Firebase Google popup login, local profile storage, MongoDB persistence, Gemini/Sarvam integrations, and the documented audio flow.
- Optional OpenAI/Plant.id diagnosis service code and seeded knowledge entries.

### Do not claim in an interview

- Three-tier retrieval, Golden Dataset-first answering, or Package of Practices fallback: the data is seeded but never searched.
- Automatic language detection or active translation.
- JWT/cookie/Firebase-token verification, server-enforced roles, secure API authorization, or socket authentication.
- A working image-diagnosis feature: its routes are unmounted and no frontend UI exists.
- Tests, rate limiting, file-type validation, or production-scale realtime deployment.
