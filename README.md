# KaamSetu 🚀

> **Turn Hindi-English (Hinglish) voice notes into assigned, cited action items — and automatically pause whenever conflicting evidence means a human must decide.**

## 🔗 Live Demo & Links
- **Frontend (Vercel):** [https://kaam-setu-ecru.vercel.app](https://kaam-setu-ecru.vercel.app)
- **Backend API (Render):** [https://kaamsetu-qta5.onrender.com](https://kaamsetu-qta5.onrender.com)
- **Database:** Neon (PostgreSQL)

---

## 🎯 The Problem
Small Indian businesses and WhatsApp-heavy teams communicate through voice notes. Important tasks become buried in informal speech, unclear ownership, deadlines, and contradictory instructions.

**Example:**
> “Rahul, kal tak vendor quotation compare kar dena. Finance policy ke according advance 20% se zyada nahi hona chahiye, but latest vendor document says 30%.”

A normal task app cannot understand this reliably or resolve the conflict. **Target User:** A small-business owner or operations manager coordinating a team through Hindi-English, WhatsApp-style voice notes.

---

## 🏗️ What I Built & How It Works

**KaamSetu** is an AI-powered operations tool designed specifically to solve this problem. 

**Core Workflow:**
1. **Ingest:** A user records or uploads a Hinglish voice note (or types a text command).
2. **Transcription:** Groq's `whisper-large-v3` transcribes the code-mixed speech.
3. **Extraction:** A reasoning model (`openai/gpt-oss-120b`) extracts the task, assignee, deadline, and entities into a strict JSON schema.
4. **Verification:** A secondary model retrieves private documents and checks the extracted task against prior context to detect contradictions.
5. **Confidence Routing:** 
   - **High Confidence:** Task is automatically assigned.
   - **Conflicts/Low Confidence:** The task is paused and pushed to a Human Review Queue with citations of the conflicting evidence.

### Why AI is Essential
Removing AI breaks the product completely:
- Speech cannot be transcribed.
- Code-mixed meaning (Hinglish) cannot be understood.
- Tasks cannot be extracted from natural conversation.
- Contradictions cannot be detected semantically.

---

## ✨ Key Features

- **Code-Mixed Transcription:** Flawlessly handles Hindi-English (Hinglish) speech.
- **Contradiction Detection:** Refuses to silently "average out" conflicting instructions. It pauses, surfaces the evidence, and hands the decision back to a human.
- **Premium Glassmorphism UI:** Built with Vite and React, featuring smooth micro-animations, skeleton loaders, and a polished dark/light aesthetic.
- **Graceful Degradation:** Runs in a degraded offline/review mode when the AI or database is unavailable.
- **Role-Based Auth:** Secure JWT access tokens and hashed refresh tokens.

---

## 🧠 Architecture

```text
React dashboard (Vercel)
      ↓
Express API (Render)
      ↓
Whisper transcription (Groq)
      ↓
Task extraction model
      ↓
PostgreSQL retrieval (Neon)
      ↓
Conflict and citation verifier
      ↓
Confidence router
   ├── Assign task
   ├── Request clarification
   └── Human review
```

---

## 🛠️ Technical Decisions

1. **Separated Architecture (Vercel + Render):** Instead of a monolith, the frontend is deployed on Vercel for edge-caching and lightning-fast UI delivery, while the Express/Node.js backend runs on Render to handle heavy API routing and database connections.
2. **PostgreSQL over SQLite:** Initially, the project relied on SQLite. However, due to `GLIBC` binary compilation issues on Render's modern Node 20+ images, I made the architectural decision to completely rip out SQLite and migrate exclusively to **Neon Serverless PostgreSQL**. This made the backend instantly lighter, faster to deploy, and production-ready.
3. **Dropping Redis:** To keep the infrastructure lean and reduce cost overhead for the hackathon, I removed Redis and `bullmq`. The pipeline currently handles ingest verification synchronously, which is sufficient for the demo scale.
4. **Dynamic API Routing:** The frontend uses Vite environment variables (`VITE_API_URL`) to seamlessly switch between the local proxy during development and the Render API in production.

---

## 🚧 Challenges Faced

- **Deployment Native Binary Issues:** When deploying the Node.js backend to Render, the `sqlite3` package threw fatal `GLIBC_2.38` missing errors because Render's base OS didn't match the precompiled SQLite binaries for Node 24. **Solution:** Enforced Node 20.x via `package.json` engines, and ultimately ripped out SQLite entirely in favor of a pure Neon Postgres architecture.
- **CORS & Origin Security:** Getting a separated Vercel frontend to securely talk to a Render backend required careful configuration of Express `cors` middleware, specifically passing the `CLIENT_ORIGIN` environment variable and ensuring no trailing slashes broke the handshake.
- **State Management & UI Robustness:** Ensuring the UI gracefully handled missing data (e.g., submitting tasks without text) without crashing. **Solution:** Implemented robust CSS skeleton loaders, empty states, and dynamic error toasts.

---

## 🎙️ Pitch Questions

**1. What did you build versus what did the API give you?**
The APIs provide raw transcription and language generation. We built the code-mixed task structure, Postgres retrieval, conflict detection, citations, confidence routing, human review queue, and a premium UI to tie it all together.

**2. What was the non-obvious hard part?**
Determining whether a new spoken instruction conflicts with an earlier message or private policy, instead of blindly creating a task.

**3. What breaks at 10,000 users?**
Bottlenecks would emerge in transcription cost, model latency, and concurrent database connections. Moving back to a robust queuing system (like Redis/BullMQ, which we scaffolded but removed for demo simplicity) and connection pooling via PgBouncer would be required to scale.

---

## 👥 Team & Contributions

*(If you worked solo, leave the first bullet. If you had a team, fill in their roles!)*

- **Arun** (Solo Developer / Lead): 
  - Designed and developed the premium React/Vite frontend UI (CSS animations, layout, state management).
  - Built the Node.js/Express backend pipeline.
  - Integrated Groq AI models for transcription and reasoning.
  - Managed devops: Migrated database to Neon Postgres, configured environment variables, and successfully deployed to Vercel and Render.
- **[Team Member 2 Name]**: *(Role - e.g., Handled presentation, testing, or specific feature)*

---

## 🚀 Installation & Local Setup

To run this project locally on your machine, follow these step-by-step instructions.

### Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v20 or higher)
- **Git**
- A **PostgreSQL** database (Local or Cloud like Neon/Supabase)
- A **Groq API Key** (Get one at [console.groq.com](https://console.groq.com/keys))

### Step 1: Clone the Repository
Clone the project to your local machine:
```bash
git clone https://github.com/Arun0041/KaamSetu.git
cd KaamSetu
```

### Step 2: Install Dependencies
This project is separated into a `client` (Frontend) and a `server` (Backend). You must install dependencies for both:
```bash
# Install frontend dependencies
cd client
npm install

# Return to root, then install backend dependencies
cd ../server
npm install
```

### Step 3: Configure Environment Variables
You need to set up your backend environment variables.
```bash
# Make sure you are in the server directory
cp .env.example .env
```
Open `server/.env` in your code editor and update the following critical variables:
```env
DATABASE_URL=postgres://user:password@host:port/dbname
GROQ_API_KEY=your_groq_api_key_here
JWT_ACCESS_SECRET=your_super_secret_string
JWT_REFRESH_SECRET=your_super_secret_string
```

### Step 4: Run Database Migrations
Initialize your PostgreSQL database by running the migration script from the `server` directory:
```bash
npm run migrate
```
*(This will automatically create the required tables: `users`, `captures`, `tasks`, `review_items`, etc.)*

### Step 5: Start the Development Servers
Open **two separate terminal windows** at the root of your project:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# The API will start on http://localhost:4010
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# The UI will start on http://localhost:5173
```

🎉 **You're all set!** Open `http://localhost:5173` in your browser to start using KaamSetu locally.
