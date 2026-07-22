# MarkToEasy

A simple AI chat app for course transcripts. Ask questions about your lessons and get answers with source citations.

**Live app:** [https://mark-to-easy.vercel.app/](https://mark-to-easy.vercel.app/)

---

## What it does

- Search course subtitle files (`.srt` / `.vtt`)
- Find the most relevant parts using AI
- Generate a clear answer
- Show **5 source chunks** with lesson name, timestamp, and chunk number

Sign in with Google to save your chat history.

---

## How it works

1. Subtitle files are read from `data/subtitles`
2. Text is split into small chunks (~250 words)
3. Chunks are stored in **Qdrant** (vector database)
4. When you ask a question, the app finds the top 5 matching chunks
5. **OpenAI** writes an answer using only those chunks

---

## Tech stack

- **Next.js 15** — frontend and API
- **OpenAI** — embeddings + answers
- **Qdrant** — vector search
- **PostgreSQL (Neon)** — chat history
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

This reads subtitles, creates chunks, and stores them in Qdrant.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run ingest` | Load subtitles into Qdrant |
| `npm run lint` | Run ESLint |

---

## Project structure

```
app/           → Pages and API routes
components/    → UI components
lib/           → Parser, chunker, search, answer logic
scripts/       → Ingest script
prisma/        → Database schema
data/subtitles → Course subtitle files
```

---

## License

Private project.
