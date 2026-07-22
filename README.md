# MarkToEasy

AI-powered course learning: transcript Q&A with citations, plus educational comic lessons with quiz and roadmap.

**Live app:** [https://mark-to-easy.vercel.app/](https://mark-to-easy.vercel.app/)

---

## What it does

### Chat (home)

- Search course subtitle files (`.srt` / `.vtt`)
- Find the most relevant parts using AI
- Generate a clear answer with **source citations**
- Sign in with Google to save, rename, and delete chat history
- Follow-ups are resolved against prior messages before search

### Learning comics (`/learning`)

- Plan a beginner-friendly comic lesson from a question
- Generate story, panels, images, quiz, and a next-topics roadmap
- Adapt the lesson (simpler / more technical / etc.) and regenerate
- Results are cached locally for repeated questions

---

## How chat works

1. Subtitle files are read from `data/subtitles`
2. Text is split into small chunks (~250 words)
3. Chunks are stored in **Qdrant** (vector database)
4. When you ask a question, the app finds the top 5 matching chunks
5. **OpenAI** writes an answer using only those chunks

---

## Tech stack

- **Next.js 15** — frontend and API
- **OpenAI** — embeddings, answers, learning pipeline, images
- **Qdrant** — vector search
- **PostgreSQL (Neon)** — chat history + Auth.js sessions
- **Auth.js** — Google login

---

## Run locally

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file:

```env
DATABASE_URL=
OPENAI_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_URL=http://localhost:3000
```

Optional:

```env
GEMINI_API_KEY=
FLUX_API_KEY=
LESSON_CACHE_DIR=.cache/lessons
# Comic image quality (defaults: gpt-image-1 + high)
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_QUALITY=high
# OPENAI_IMAGE_MODEL=gpt-image-2   # sharpest, slower/costlier
# OPENAI_IMAGE_QUALITY=medium      # faster/cheaper compromise
# OPENAI_IMAGE_SIZE=1536x1024      # wider comic panels
```

### 3. Database

```bash
npx prisma migrate dev
```

### 4. Add subtitles

Put your course subtitle files in `data/subtitles` (supports `.srt` and `.vtt`).

### 5. Ingest data

```bash
npm run ingest
```

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for chat, or [http://localhost:3000/learning](http://localhost:3000/learning) for comics.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run ingest` | Load subtitles into Qdrant |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Unit tests with coverage |

---

## Project structure

```
app/           → Pages and API routes (/api/chat, /api/learning, …)
components/    → Chat UI, learning viewer, theme
lib/           → Parser, chunker, search, answer, learning pipeline, cache
scripts/       → Ingest script
prisma/        → Database schema
data/subtitles → Course subtitle files
```

---

## License

Private project.
