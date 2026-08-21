# KaamSetu

## One-line pitch

**KaamSetu turns Hindi-English voice notes into assigned, cited action items—and pauses whenever conflicting evidence means a human must decide.**

## Problem

Small Indian businesses and WhatsApp-heavy teams communicate through voice notes. Important tasks become buried in informal speech, unclear ownership, deadlines, and contradictory instructions.

Example:

> “Rahul, kal tak vendor quotation compare kar dena. Finance policy ke according advance 20% se zyada nahi hona chahiye, but latest vendor document says 30%.”

A normal task app cannot understand this reliably.

## Target user

A small-business owner or operations manager coordinating a team through Hindi-English, WhatsApp-style voice notes.

## Core workflow

1. The user uploads or records a voice note.
2. KaamSetu transcribes Hindi-English speech.
3. It extracts the task, assignee, deadline, priority, and relevant entities.
4. It retrieves relevant private documents and earlier voice notes.
5. It detects contradictions.
6. It cites the conflicting sources.
7. It calculates confidence.
8. High-confidence tasks become assignable.
9. Low-confidence or conflicting tasks are paused for human review.
10. The system continues in offline/local mode when the network is unavailable.

## Example output

- **Suggested task:** Compare vendor quotations
- **Assigned to:** Rahul Sharma
- **Deadline:** Tomorrow
- **Status:** Paused for review
- **Reason:** Finance policy allows 20%; vendor quotation requests 30% advance
- **Evidence:** `finance-policy-v3.pdf`, page 4; `sharma-steels-quote.docx`, page 1

## Why AI is essential

Removing AI breaks the product completely:

- Speech cannot be transcribed.
- Code-mixed meaning cannot be understood.
- Tasks cannot be extracted from natural conversation.
- Assignees and deadlines cannot be inferred.
- Contradictions cannot be detected semantically.
- Confidence and refusal decisions cannot be made.

## What we build versus what APIs provide

### APIs/models provide

- Speech transcription
- General language generation
- Embeddings

### We build

- Code-mixed task-extraction schema
- Assignee and deadline resolution
- Hybrid retrieval
- Contradiction detection
- Evidence citation
- Confidence scoring
- Human-review routing
- Offline fallback orchestration
- Retry and failure handling
- Evaluation harness
- Cost and latency tracking
- Product interface

## Recommended tech stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript

### AI

- Whisper or faster-whisper for Hindi-English transcription
- GPT-class model or Qwen for reasoning
- Embedding model for retrieval
- Optional Ollama + Qwen for offline mode

### Data and infrastructure

- PostgreSQL
- pgvector
- BM25 or PostgreSQL full-text search
- Redis + BullMQ for background jobs
- Docker
- Supabase, Render, or Fly.io for deployment

## Architecture

```text
React dashboard
      ↓
Express API
      ↓
Audio upload queue
      ↓
Whisper transcription
      ↓
Task extraction model
      ↓
PostgreSQL + pgvector retrieval
      ↓
Conflict and citation verifier
      ↓
Confidence router
   ├── Assign task
   ├── Request clarification
   └── Human review
```

## Hackathon tracks

Primary track: **AI for Bharat**  
Secondary fit: **Multimodal**

It uses regional/code-mixed language, voice input, private-knowledge retrieval, low-bandwidth support, offline/local inference, and human-centred uncertainty handling.

## Constraints satisfied

1. **Two cooperating models:** Whisper handles speech; a separate reasoning model handles extraction and verification.
2. **Graceful degradation:** If the network or API fails, local inference and cached data keep the demo usable.
3. **Handles being wrong:** Low-confidence results are visibly marked and routed to human review.
4. **Prior-art differentiation:** It is not just a transcription tool or task manager. Its core differentiator is contradiction-aware action extraction from code-mixed voice.
5. **Cost ceiling:** State an explicit demo budget, for example ₹500–₹1,000 for a full day, with local inference reducing API usage.

## Five pitch answers

### 1. What problem do you solve?

Small-business owners lose operational commitments inside Hindi-English voice notes sent by their teams.

### 2. What was the non-obvious hard part?

Determining whether a new spoken instruction conflicts with an earlier message or private policy, instead of blindly creating a task.

### 3. What did you build versus what did the API give you?

The APIs provide transcription and language generation. We built task structure, retrieval, conflict detection, citations, confidence routing, human review, offline fallback, and evaluation.

### 4. Why does it break without AI?

The system depends on AI to understand speech, code-mixed language, intent, ambiguity, and semantic contradictions.

### 5. What breaks at 10,000 users?

Likely bottlenecks are transcription cost, model latency, concurrent audio processing, vector-search volume, storage, permissions, and rate limits. Queues, smaller models, caching, tenant-level indexes, and asynchronous processing would address them.

## Five-minute demo

1. Show the inbox.
2. Upload or simulate the Hindi-English voice note.
3. Show the transcription.
4. Show the extracted task and assignee.
5. Show the 20% versus 30% conflict.
6. Open the cited source documents.
7. Demonstrate that the AI refuses to approve automatically.
8. Send a clarification request to Ravi.
9. Switch to offline mode.
10. Show the evaluation score and failure log.

## Submission deliverables

- Working live demo
- Source-code repository
- Two-minute pitch
- One-page architecture diagram
- One-page failure log
- 20-case evaluation harness
- Three-product prior-art comparison
- README with setup and cost estimate

## 24-hour scope

Build only these core features:

- One voice-note upload flow
- Hindi-English transcription
- One task-extraction schema
- Two source documents
- One contradiction detector
- One human-review screen
- One offline fallback
- Basic evaluation dashboard

Avoid building full WhatsApp integration, complex permissions, payments, or a complete enterprise task manager during the hackathon.

