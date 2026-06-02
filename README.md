# Ajrasakha Chatbot MVP

This repository now includes a fresh full-stack TypeScript setup with:

- `backend`: Node.js + Express + MongoDB + Mongoose
- `frontend`: React + TypeScript + Vite

## Implemented Features

1. Smart three-tier answer retrieval
   - Searches Golden Dataset first
   - Falls back to Package of Practices
   - Uses AI fallback response when no verified answer exists

2. Multilingual chat support
   - Language-aware chat requests
   - Supported language listing API
   - Localized fallback responses

3. Saved conversation history
   - Stores each chat session in MongoDB
   - Lists previous sessions
   - Reloads full session message history

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` if your backend is not running on `http://localhost:5000/api`.
