# 🎓 LearnAI — Frontend

> React + TypeScript frontend for the **LearnAI AI Teaching Assistant** — upload a lecture PDF and get real-time AI summaries, RAG-powered Q&A, and auto-generated quizzes, all streamed live to your browser.

---

## 🖥️ Screenshots

| Chat Interface | Quiz Mode | Summary View |
|---|---|---|
| Gemini-style chat UI with streaming AI responses | MCQ quizzes with live grading and explanations | Structured summaries with key points and conclusions |

---

## ✨ Features

| Feature | Description |
|---|---|
| **Gemini-Style Chat** | ChatGPT/Gemini-inspired interface with sidebar, conversation history, and streaming responses |
| **Live Streaming Summaries** | Real-time token-by-token summary display via WebSocket — watch the AI think |
| **RAG-Powered Q&A** | Ask anything about your lecture; answers stream live with source chunk citations |
| **Auto Quiz Generation** | MCQ quizzes generated from your PDF with instant grading, explanations, and confetti on good scores |
| **Lecture History** | All uploaded PDFs saved with search, quick access to summary/chat/quiz |
| **User Statistics Dashboard** | Track total lectures, pages processed, quiz attempts, average scores, and study days |
| **JWT Auth** | Signup/login with auto token refresh — no re-login needed for 7 days |
| **Dark Theme** | Deep purple/indigo dark theme throughout, glass-card UI components |
| **Responsive** | Works on mobile, tablet, and desktop |
| **Stream Cancellation** | Stop AI generation mid-stream with a single click |
| **FAQ Cache Badge** | Instant answers from cache shown with a ⚡ badge |

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (utility-first styling)
- **Framer Motion** (animations)
- **SockJS + @stomp/stompjs** (WebSocket streaming)
- **React Router v6** (routing)
- **react-markdown + remark-gfm** (Markdown rendering in chat)
- **Lucide React** (icons)
- **Radix UI / shadcn/ui** (accessible component primitives)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- LearnAI backend running (see [learnai-backend](https://github.com/your-username/learnai-backend))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/learnai-frontend.git
cd learnai-frontend
npm install
```

### 2. Configure Environment

Create a `.env.development` file:

```bash
# Backend API base URL
VITE_API_BASE_URL=http://localhost:8080

# Model name displayed in the UI (cosmetic only)
VITE_ACTIVE_MODEL=llama3.2:latest
```

For production, create `.env.production`:

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_ACTIVE_MODEL=claude-sonnet-4-6
```

### 3. Run Development Server

```bash
npm run dev
```

App opens at **http://localhost:5173**

### 4. Build for Production

```bash
npm run build
# Output in /dist — deploy to Vercel, Netlify, etc.
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatPage.tsx          # Main chat interface (Gemini-style)
│   │   ├── ChatSidebar.tsx       # Conversation list with history groups
│   │   ├── ChatMessages.tsx      # Message list with auto-scroll
│   │   ├── ChatMessageBubble.tsx # Individual message rendering (Markdown)
│   │   ├── ChatInputBar.tsx      # Textarea with animated placeholder
│   │   └── ChatEmptyState.tsx    # "Hello, {name}" greeting
│   ├── ui/                       # shadcn/ui component library
│   ├── StreamingSummaryView.tsx  # Live streaming text display
│   ├── SummaryView.tsx           # Structured summary renderer
│   ├── QuizView.tsx              # Full quiz flow with confetti
│   ├── FlashcardModal.tsx        # Flip-card flashcard review
│   ├── SmartUploadPanel.tsx      # PDF upload with mode selection
│   ├── QuickAccessPanel.tsx      # Quick index (no summary) panel
│   └── LoadingAnimation.tsx      # 4-stage progress indicator
├── hooks/
│   ├── useSummaryStream.ts       # WebSocket hook for summary streaming
│   └── useQaStream.ts            # WebSocket hook for Q&A streaming
├── context/
│   └── AuthContext.tsx           # JWT auth with auto refresh
├── services/
│   └── api.ts                    # All REST API calls
├── pages/
│   ├── LandingPage.tsx           # Public marketing page
│   ├── LoginPage.tsx             # Login form
│   ├── SignupPage.tsx            # Signup with password strength meter
│   ├── DashboardPage.tsx         # Main app (tabs: Home, My Lectures)
│   └── LectureDetailPage.tsx     # Per-lecture summary/chat/quiz tabs
├── config.ts                     # BASE_URL, WS_BASE_URL, ACTIVE_MODEL
└── index.css                     # Tailwind + custom CSS variables
```

---

## 🔌 WebSocket Integration

The frontend connects to the Spring Boot backend using **SockJS + STOMP**. Two custom hooks manage the streaming:

### `useSummaryStream`

```typescript
const { summary, isStreaming, isComplete, isConnected, error, triggerStream, stopStream }
  = useSummaryStream(lectureId, accessToken);
```

- Connects to `/ws/lectures` via SockJS
- Subscribes to `/topic/lectures/{lectureId}`
- Buffers incoming tokens and drips them into state at 18ms intervals (smooth typing effect)
- Defers `SUMMARY_COMPLETED` until the drip queue is empty

### `useQaStream`

```typescript
const { messages, isStreaming, isConnected, error, askQuestion, clearMessages, stopStream }
  = useQaStream(lectureId, accessToken);
```

- Same architecture as `useSummaryStream`
- Subscribes to `/topic/qa/{lectureId}`
- Manages full conversation state (user + assistant message array)
- Intercepts `⚡ Served from FAQ Cache` flag to mark cached answers

---

## 🗺️ Routes

| Path | Component | Auth Required |
|---|---|---|
| `/` | `LandingPage` | No |
| `/login` | `LoginPage` | No (redirects if logged in) |
| `/signup` | `SignupPage` | No (redirects if logged in) |
| `/chat` | `ChatPage` | Yes |
| `/dashboard` | `DashboardPage` | Yes |
| `/lecture/:id` | `LectureDetailPage` | Yes |

---

## 🎨 Design System

The app uses a custom dark theme defined in `src/index.css`:

```css
/* Key CSS Variables */
--background: 247 34% 5%;        /* Deep purple/black */
--primary: 243 75% 65%;          /* Indigo */
--accent: 175 75% 45%;           /* Teal */
--ring: 188 86% 53%;             /* Cyan (focus rings) */

--gradient-brand: linear-gradient(135deg, #6366f1, #8b5cf6);
--shadow-brand: 0 4px 20px -4px rgba(99, 102, 241, 0.4);
--gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
```

**Component patterns:**
- `.glass-card` — frosted glass card with subtle border
- `.prose-chat` — Gemini-style AI message typography
- `.progress-dots` — animated loading indicator
- `.custom-scrollbar` — styled scrollbars matching the dark theme

---

## 📱 Processing Modes

When uploading a PDF, the user implicitly selects a mode:

### Chat Mode (default upload)
```
Upload PDF → Extract + Index (fast) → Return lectureId
→ AI ready for Q&A immediately
→ WebSocket auto-triggers streaming summary in background
```

### Summarize PDF
```
Upload PDF → Full sync pipeline → Return complete structured summary
→ Key points, conclusions, notable quotes, additional notes
```

### Quick Mode
```
Upload PDF → Index only, no summary
→ Available for Q&A and Quiz immediately
→ No LLM cost if summary not needed
```

---

## 🔐 Authentication Flow

```
1. Signup/Login → receive { accessToken (15min), refreshToken (7 days) }
2. accessToken stored in sessionStorage (cleared on tab close)
3. refreshToken stored in localStorage (persists across sessions)
4. Auto-refresh scheduled 60s before access token expires
5. On logout → tokens cleared, no server call needed (JWT is stateless)
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Set these environment variables in the Vercel dashboard:
```
VITE_API_BASE_URL = https://your-backend.onrender.com
VITE_ACTIVE_MODEL = claude-sonnet-4-6
```

### Netlify

```bash
npm run build
# Deploy /dist folder
```

Add `_redirects` file to `/public`:
```
/*  /index.html  200
```

### Docker (Static Nginx)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

---

## 🧩 Key Dependencies

```json
{
  "react": "^18",
  "react-router-dom": "^6",
  "framer-motion": "^11",
  "sockjs-client": "^1.6",
  "@stomp/stompjs": "^7",
  "react-markdown": "^9",
  "remark-gfm": "^4",
  "lucide-react": "^0.383",
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3",
  "typescript": "^5",
  "vite": "^5"
}
```

---

## 🐛 Common Issues

**WebSocket not connecting?**
- Ensure the backend is running and `VITE_API_BASE_URL` points to it
- SockJS falls back to HTTP long-polling automatically if WebSocket is blocked

**Summaries not streaming?**
- Check the backend is configured with a working LLM provider
- For Ollama: `ollama serve` must be running and the model pulled (`ollama pull llama3.2`)

**CORS errors?**
- Add your frontend URL to `CORS_ALLOWED_ORIGINS` in the backend config

**Old summary showing instead of new stream?**
- The backend checks `lecture.summary` in the DB. If it's populated, it streams the cached version word-by-word. Delete the lecture and re-upload to force regeneration.

---

## 🤝 Related Repositories

| Repo | Description |
|---|---|
| **learnai-frontend** *(this repo)* | React + TypeScript UI with real-time streaming |
| **learnai-backend** | Spring Boot API, WebSocket streaming, LLM integration |
| **learnai-rag-service** | Python FastAPI — BGE embeddings, pgvector, reranking, FAQ cache |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
