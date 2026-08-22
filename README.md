# KaamSetu (कामसेतु) 🚀
**Autonomous AI Secretary and Workflow Orchestrator**

> **Turn Hindi-English (Hinglish) voice notes into structured, verified, multi-agent execution chains — and automatically pause whenever conflicting evidence means a human must decide.**

## 🔗 Live Demo & Links
- **Frontend (Vercel):** [https://kaam-setu-ecru.vercel.app](https://kaam-setu-ecru.vercel.app)
- **Backend API (Render):** [https://kaamsetu-qta5.onrender.com](https://kaamsetu-qta5.onrender.com)
- **Database:** Neon (PostgreSQL)

---

## 🎯 The Problem

In Indian MSMEs and distributed teams, **over 80% of critical business coordination happens via unstructured voice notes and chat messages** (WhatsApp, Telegram, voice calls) in Hinglish (Hindi + English). This reliance on informal communication creates two major problems:

### 1. Unstructured Chaos & Policy Violations
- **Lost Accountability**: Instructions like *"Ravi se bolo employee details bheje aur phir Mohan ko bolo portal update kare"* get buried in active WhatsApp groups. Deadlines are missed, and nobody knows who is waiting on whom.
- **Hallucination in Naive AI**: Standard LLMs fail to enforce business rules. They might silently approve a vendor's 30% advance request even if company policy caps it at 20%.

### 2. The "Secretary / Manager" Bottleneck
- **Manual Dependency Management**: Multi-step operations require Step A's output before Step B can start. Currently, a manager wastes hours manually nudging employees, collecting data from one person, and forwarding it to the next.
- **Execution Overhead**: The orchestrator of the work (the owner/manager) becomes the bottleneck, spending more time tracking tasks than doing meaningful work.

---

## 🏗️ What We Are Solving

**KaamSetu** acts as an **Autonomous AI Secretary and Workflow Orchestrator**. It converts chaotic voice notes and code-mixed instructions into structured, verified, multi-agent execution chains. **Crucially, the AI doesn't do the work—it orchestrates the humans doing the work.**

### Core Value Propositions:
- 🎙️ **Voice-to-Workflow Engine**: Owners simply speak code-mixed instructions. KaamSetu transcribes and autonomously decomposes them into discrete, actionable steps assigned to the right team members.
- 🔗 **Autonomous Dependency Orchestration**: Replaces manual follow-ups. If Task B depends on Task A, Task B is automatically placed in a `BLOCKED` state until the first assignee completes their task.
- 🔄 **Contextual Data Handoff**: When an employee completes a step, they input their response data directly into the system. KaamSetu injects that exact data into the next assignee's task context automatically, completely bypassing the manager.
- 🛡️ **Grounded Verification**: Before dispatching tasks, KaamSetu checks instructions against uploaded company policies (e.g., finance limits). If a conflict is detected, the AI deliberately pauses and requests human confirmation.
- 👥 **Role-Based Visibility**: Owners track company-wide delegation and live chain progress; team members see only their assigned actions in a clean inbox.

---

## 🧠 Technical Architecture

```text
       [ Voice Note / Audio / Text ]
                     │
                     ▼
       ┌─────────────────────────────┐
       │     Whisper Audio Engine    │  (Whisper-large-v3 on Groq)
       └─────────────┬───────────────┘
                     │ Raw Code-Mixed Transcript
                     ▼
       ┌─────────────────────────────┐
       │    LLM Extraction Engine    │  (Structured JSON Task Graph)
       │  - Task Titles & Assignees  │
       │  - Dependency Linking       │
       └─────────────┬───────────────┘
                     │
       ┌─────────────┴───────────────┐
       ▼                             ▼
┌──────────────┐             ┌──────────────┐
│  RAG Engine  │             │ Verification │ (Checks against SOPs / Policies)
└──────┬───────┘             └──────┬───────┘
       │                            │
       └─────────────┬──────────────┘
                     ▼
       ┌─────────────────────────────┐
       │   Agentic State Machine     │
       │   - Open / Ready to Assign  │
       │   - Assigned                │
       │   - Blocked (Waiting Step)  │
       │   - Done (Pass Context)     │
       └─────────────┬───────────────┘
                     │
       ┌─────────────┴───────────────┐
       ▼                             ▼
┌──────────────┐             ┌──────────────┐
│   Backend    │             │   Frontend   │
│ Express API  │             │ React + Vite │
│ Neon Postgres│             │ Live Stream  │
└──────────────┘             └──────────────┘
```

---

## 🚀 End-to-End Workflow Example

### Scenario:
**Voice Note Input by Owner (Anika Kapoor):**
> *"Ravi Mehta se bolo ki vah Apne Sare employee detail De aur FIR Mohan se bolo vah Sare data portal per update Karke"*

### System Execution Steps:
1. **AI Processing**: 
   - **Task 1**: *"Provide employee details"* → Assigned to **Ravi Mehta** (Status: `ASSIGNED`).
   - **Task 2**: *"Update all data on the portal"* → Assigned to **Mohan Verma** (Status: `BLOCKED`, Depends on Task 1).
2. **Owner View (Anika)**:
   - Sees the workflow under **"Workflows you initiated"**.
   - Clicks **"📊 Status"** to view the live execution timeline showing Step 1 in progress and Step 2 blocked.
3. **Assignee 1 (Ravi Mehta)**:
   - Logs in via user switcher.
   - Sees *"Provide employee details"* in **"Assigned to you"**.
   - Clicks **"Complete Task"**, types input: `"Total 42 employees list submitted"`, and clicks **"Submit & Done"**.
4. **Autonomous Cascading**:
   - Backend marks Task 1 as `DONE`.
   - Automatically promotes Task 2 from `BLOCKED` to `ASSIGNED`.
   - Attaches `[Data from previous step: Total 42 employees list submitted]` to Task 2.
5. **Assignee 2 (Mohan Verma)**:
   - Logs in.
   - Sees the unblocked task with the green tag **"HAS PRIOR DATA"** and Ravi's exact numbers.
   - Completes the task and provides confirmation.

---

## 🛠️ Technology Stack & Decisions

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend (Vercel)** | React 18, Vite, Vanilla CSS, Lucide Icons | Responsive UI with real-time feedback, status timelines, and isolated session switching. |
| **Backend API (Render)** | Node.js, Express, TypeScript | RESTful API, asynchronous pipelines, authentication middleware. |
| **Database** | **Neon Serverless PostgreSQL** | *(Note: Moved away from local SQLite to a pure-Postgres architecture to avoid Render GLIBC binary compilation errors and scale effectively).* |
| **AI / LLM** | Groq API (`whisper-large-v3`, `gpt-oss-120b`) | Ultra-fast code-mixed transcription and structured JSON task graph generation. |
| **Security & Auth** | JWT Access & Refresh Tokens, bcrypt | Per-user authenticated sessions with role-based access control. |

---

## 👥 Team & Contributions

- **Arun** (Solo Developer / Lead): 
  - Designed and developed the premium React/Vite frontend UI (CSS animations, layout, state management).
  - Built the Node.js/Express backend pipeline.
  - Integrated Groq AI models for transcription and reasoning.
  - Managed devops: Migrated database to Neon Postgres, configured environment variables, and successfully deployed to Vercel and Render.

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
