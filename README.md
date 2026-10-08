<p align="center">
  <img src="https://img.shields.io/badge/MediBuddy-CareBridge-0ea5e9?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDlMOSAzbC0zIDlIMiIvPjwvc3ZnPg==&logoColor=white" alt="MediBuddy CareBridge" />
</p>

<h1 align="center">🏥 MediBuddy — CareBridge</h1>

<p align="center">
  <strong>AI-Powered Post-Discharge Patient Recovery Companion</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-v4.19-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-v18.3-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-v5.4-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-v8+-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
</p>

<p align="center">
  MediBuddy is a full-stack MERN application that bridges the gap between hospital discharge and home recovery. It empowers <strong>patients</strong> to understand and follow their discharge instructions, while giving <strong>nurses</strong> an AI-grounded dashboard to monitor adherence, quiz performance, and escalations — all without ever crossing clinical boundaries.
</p>

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Data Flow](#-data-flow)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Database Schema](#-database-schema)
- [Client Application](#-client-application)
- [Patient Isolation & Safety](#-patient-isolation--safety)
- [AI Safety Boundaries](#-ai-safety-boundaries)
- [Synthetic Demo Dataset](#-synthetic-demo-dataset)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Baseline API & Health** | Express server with health check, CORS, Morgan logging, and centralized error handling |
| 2 | **Patient & Discharge Summary Management** | Full patient profiles, discharge documents, extracted clinical instructions (medication, activity, diet, wound care, follow-ups, warning signs) |
| 3 | **Medication Reminders** | Scheduled reminders with confirmation flow (`taken`, `not_taken`, `dismissed`, `no_response`) and strict semantic rules |
| 4 | **Medication Events & Adherence** | Audit-trail events, per-medication adherence metrics, and adherence rate calculation |
| 5 | **Daily Recovery Quiz** | 5-question quizzes grounded in verified discharge instructions with answer masking before submission |
| 6 | **Quiz Answer Storage & Scoring** | Sequential answer validation, auto-scoring on completion, and educational engagement signals |
| 7 | **Patient Insights** | AI-grounded insights with evidence tracing, strengths/weaknesses analysis, and mandatory disclaimers |
| 8 | **Nurse Dashboard** | Aggregated multi-patient overview with priority triage, flags, knowledge gaps, and recommended actions |
| 9 | **Nurse AI Summary** | 7-source synthesized summary with claim-level traceability and clinical safety boundary enforcement |
| 10 | **Escalations** | Rule-based escalation detection (warning signs, missed meds, low quiz scores) with grounded evidence |

---

## 🏗 System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client (React + Vite)"]
        LP[Landing Page]
        LOGIN[Login Page]
        subgraph PatientPortal["Patient Portal"]
            PD[Dashboard]
            MED[Medication Tracker]
            QUIZ[Daily Quiz]
            QR[Quiz Results]
            PI[Patient Insights]
            DI[Discharge Instructions]
        end
        subgraph NursePortal["Nurse Portal"]
            ND[Nurse Dashboard]
            PL[Patient List]
            PDET[Patient Detail]
            MA[Medication Adherence]
            QP[Quiz Performance]
            AIS[AI Summary]
            ESC[Escalations]
        end
    end

    subgraph Server["⚙️ Server (Node.js + Express)"]
        MW["Middleware Layer\n(CORS, Morgan, JWT Auth, Error Handler)"]
        subgraph Routes["API Routes (/api)"]
            R1["/health"]
            R2["/patients"]
            R3["/documents"]
            R4["/tasks"]
            R5["/reminders"]
            R6["/events"]
            R7["/adherence"]
            R8["/quiz"]
            R9["/insights"]
            R10["/nurse"]
            R11["/escalations"]
        end
        subgraph Services["Business Logic"]
            S1[patientService]
            S2[documentService]
            S3[reminderService]
            S4[eventService]
            S5[adherenceService]
            S6[quizService]
            S7[insightService]
            S8[nurseService]
            S9[escalationService]
        end
        DS[("DataStore\n(In-Memory / MongoDB)")]
    end

    subgraph Data["💾 Data Layer"]
        MOCK[("Mock JSON Files\n(data/mock/)")]
        MONGO[("MongoDB\n(Optional)")]
    end

    Client -->|HTTP REST| MW
    MW --> Routes
    Routes --> Services
    Services --> DS
    DS --> MOCK
    DS -.->|When connected| MONGO
```

---

## 🔄 Data Flow

### Patient Recovery Journey

```mermaid
flowchart LR
    A["🏥 Hospital Discharge"] --> B["📄 Discharge Summary\nUploaded"]
    B --> C["🤖 AI Extraction\n(Medications, Activities,\nDiet, Warnings)"]
    C --> D["✅ Verified Instructions\n(Confidence Scoring)"]
    D --> E["⏰ Medication Reminders\nGenerated"]
    D --> F["📝 Daily Quiz Questions\nGenerated"]
    
    E --> G{"Patient\nResponse?"}
    G -->|Taken| H["✅ Confirmed\n(Event Logged)"]
    G -->|Not Taken| I["⚠️ Flagged\n(Event Logged)"]
    G -->|No Response| J["❓ Not Confirmed\n(Event Logged)"]
    
    F --> K["🧠 Quiz Submission\n(5 Questions)"]
    K --> L["📊 Score Calculated\n(Educational Signal)"]
    
    H & I & J --> M["📈 Adherence\nMetrics"]
    L --> N["💡 Patient Insights\n(AI-Grounded)"]
    M --> N
    
    M & N & L --> O["👩‍⚕️ Nurse Dashboard\n(Priority Triage)"]
    O --> P["🤖 Nurse AI Summary\n(7-Source Synthesis)"]
    
    I --> Q["🚨 Escalation\nEvaluation"]
    L -->|Low Score| Q
    Q --> O

    style A fill:#f0f9ff,stroke:#0ea5e9
    style O fill:#fef3c7,stroke:#f59e0b
    style P fill:#f0fdf4,stroke:#22c55e
    style Q fill:#fef2f2,stroke:#ef4444
```

### Medication Confirmation Flow

```mermaid
flowchart TD
    START["⏰ Medication Reminder\nScheduled"] --> SENT["📤 Reminder Sent\n(Event: reminder_sent)"]
    SENT --> OPENED["👁️ Reminder Opened\n(Event: reminder_opened)"]
    OPENED --> RESPONSE{"Patient\nResponse"}
    
    RESPONSE -->|"'taken'"| TAKEN["✅ Status: taken\nconfirmationStatus: confirmed"]
    RESPONSE -->|"'not_taken'"| NOT_TAKEN["❌ Status: not_taken\nconfirmationStatus: declined"]
    RESPONSE -->|"'dismissed'"| DISMISSED["🔕 Status: dismissed\nconfirmationStatus: dismissed"]
    RESPONSE -->|"'no_response'"| NO_RESPONSE["❓ Status: no_response\nconfirmationStatus: not confirmed"]
    RESPONSE -->|"Timeout"| MISSED["⏱️ Status: missed\n(Auto-escalation)"]
    
    TAKEN --> EVENT_LOG["📋 Event Logged\n(medication_taken)"]
    NOT_TAKEN --> EVENT_LOG2["📋 Event Logged\n(medication_not_taken)"]
    NO_RESPONSE --> SEMANTIC["⚠️ SEMANTIC RULE\nNOT 'not taken'\nOnly 'not confirmed'"]
    MISSED --> ESCALATE["🚨 Escalation\nCreated"]

    style SEMANTIC fill:#fef3c7,stroke:#f59e0b
    style ESCALATE fill:#fef2f2,stroke:#ef4444
    style TAKEN fill:#f0fdf4,stroke:#22c55e
```

### Quiz Lifecycle

```mermaid
flowchart TD
    START["📝 Quiz Start\n(POST /api/quiz/start)"] --> GEN["🤖 Generate 5 Questions\n(Grounded in Verified Instructions)"]
    GEN --> SESSION["Session Created\nstatus: in_progress"]
    SESSION --> Q1["Q1: Answer Submitted"]
    Q1 --> Q2["Q2: Answer Submitted"]
    Q2 --> Q3["Q3: Answer Submitted"]
    Q3 --> Q4["Q4: Answer Submitted"]
    Q4 --> Q5["Q5: Answer Submitted\n(Auto-Score Triggered)"]
    Q5 --> SCORE["📊 Score Calculated\nSession → completed"]
    SCORE --> REVIEW["📋 Post-Submission Review\n(Correct Answers Revealed)"]
    REVIEW --> INSIGHT["💡 Insight Generated\n(Strengths, Weaknesses, Gaps)"]
    
    subgraph Invariants["🔒 Session Invariants"]
        INV1["Exactly 5 questions"]
        INV2["correctAnswer masked\nbefore submission"]
        INV3["No duplicate answers"]
        INV4["No answers after\ncompletion (409)"]
    end

    style SCORE fill:#f0fdf4,stroke:#22c55e
    style Invariants fill:#f0f9ff,stroke:#0ea5e9
```

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework & routing |
| **MongoDB / Mongoose** | Database & ODM (optional – gracefully degrades to in-memory) |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Morgan** | HTTP request logging |
| **dotenv** | Environment configuration |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI component library |
| **Vite 5** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Lucide React** | Icon library |

---

## 📁 Project Structure

```
MediBuddy/
├── client/                          # React Frontend (Vite)
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Images, fonts, etc.
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Card.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── SwipeConfirmButton.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   └── PageContainer.jsx
│   │   ├── context/
│   │   │   └── AppContext.jsx       # Global application state
│   │   ├── hooks/
│   │   │   └── useNavigation.js     # Navigation utilities
│   │   ├── layouts/
│   │   │   ├── AppLayout.jsx        # Root layout wrapper
│   │   │   ├── PatientLayout.jsx    # Patient portal layout
│   │   │   └── NurseLayout.jsx      # Nurse portal layout
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Public landing page
│   │   │   ├── LoginPage.jsx        # Authentication page
│   │   │   ├── patient/
│   │   │   │   ├── PatientDashboard.jsx
│   │   │   │   ├── Medication.jsx
│   │   │   │   ├── DailyQuiz.jsx
│   │   │   │   ├── QuizResult.jsx
│   │   │   │   ├── PatientInsight.jsx
│   │   │   │   └── DischargeInstructions.jsx
│   │   │   └── nurse/
│   │   │       ├── NurseDashboard.jsx
│   │   │       ├── PatientList.jsx
│   │   │       ├── PatientDetail.jsx
│   │   │       ├── MedicationAdherence.jsx
│   │   │       ├── QuizPerformance.jsx
│   │   │       ├── AISummary.jsx
│   │   │       └── Escalations.jsx
│   │   ├── services/                # API client services
│   │   │   ├── api.js               # Base API configuration
│   │   │   ├── authService.js
│   │   │   ├── patientService.js
│   │   │   ├── medicationService.js
│   │   │   ├── quizService.js
│   │   │   ├── insightService.js
│   │   │   └── nurseService.js
│   │   ├── store/                   # State management
│   │   ├── types/                   # Type definitions
│   │   ├── utils/                   # Helper utilities
│   │   ├── App.jsx                  # Root component & routing
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Express Backend
│   ├── config/
│   │   ├── index.js                 # Environment config loader
│   │   └── db.js                    # MongoDB connection manager
│   ├── controllers/                 # Route handlers
│   │   ├── adherence.controller.js
│   │   ├── document.controller.js
│   │   ├── escalation.controller.js
│   │   ├── event.controller.js
│   │   ├── health.controller.js
│   │   ├── insight.controller.js
│   │   ├── nurse.controller.js
│   │   ├── patient.controller.js
│   │   ├── quiz.controller.js
│   │   ├── reminder.controller.js
│   │   └── task.controller.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication & role authorization
│   │   └── errorHandler.js          # 404 catch-all & centralized error handler
│   ├── models/                      # Mongoose schemas
│   │   ├── patient.model.js
│   │   ├── document.model.js
│   │   ├── extractedItem.model.js
│   │   ├── task.model.js
│   │   ├── medicationReminder.model.js
│   │   ├── event.model.js
│   │   ├── quizSession.model.js
│   │   ├── quizQuestion.model.js
│   │   ├── quizAnswer.model.js
│   │   ├── patientInsight.model.js
│   │   ├── nurseBrief.model.js
│   │   ├── escalation.model.js
│   │   └── index.js                 # Model registry
│   ├── prompts/
│   │   └── index.js                 # AI prompt templates
│   ├── routes/                      # Express routers
│   │   ├── adherence.routes.js
│   │   ├── document.routes.js
│   │   ├── escalation.routes.js
│   │   ├── event.routes.js
│   │   ├── health.routes.js
│   │   ├── insight.routes.js
│   │   ├── nurse.routes.js
│   │   ├── patient.routes.js
│   │   ├── quiz.routes.js
│   │   ├── reminder.routes.js
│   │   ├── task.routes.js
│   │   └── index.js                 # Route aggregator
│   ├── seed/
│   │   └── seed.js                  # Mock data loader
│   ├── services/                    # Business logic layer
│   │   ├── adherence.service.js
│   │   ├── dataStore.js             # Unified data access (in-memory + MongoDB)
│   │   ├── document.service.js
│   │   ├── escalation.service.js
│   │   ├── event.service.js
│   │   ├── insight.service.js
│   │   ├── nurse.service.js
│   │   ├── patient.service.js
│   │   ├── quiz.service.js
│   │   ├── reminder.service.js
│   │   └── index.js                 # Service registry
│   ├── uploads/                     # File upload directory
│   ├── utils/
│   │   ├── logger.js                # Logging utility
│   │   └── response.js              # Response envelope helpers
│   ├── test_feature*.js             # Feature-level test scripts
│   ├── test_final_qa.js             # Final QA test suite
│   ├── app.js                       # Express app configuration
│   ├── server.js                    # Server entry point
│   ├── .env.example                 # Environment template
│   └── package.json
│
├── data/
│   └── mock/                        # Synthetic demo dataset
│       ├── patients.json            # 8 patient profiles
│       ├── documents.json           # Discharge summaries
│       ├── extractedItems.json      # Parsed clinical instructions
│       ├── tasks.json               # Recovery tasks
│       ├── medicationReminders.json # Scheduled reminders
│       ├── events.json              # Audit trail events
│       ├── quizSessions.json        # Quiz sessions
│       ├── quizQuestions.json        # Quiz questions
│       ├── quizAnswers.json         # Answer records
│       ├── patientInsights.json     # AI-generated insights
│       ├── nurseBriefs.json         # Nurse briefing reports
│       ├── escalations.json         # Escalation records
│       ├── users.json               # User accounts
│       ├── providers.json           # Healthcare providers
│       ├── dayColors.json           # Recovery day color codes
│       ├── checkIns.json            # Patient check-ins
│       ├── teachBacks.json          # Teach-back sessions
│       ├── auditLogs.json           # System audit logs
│       ├── agentTraces.json         # AI agent traces
│       ├── summaries/               # Raw discharge text files
│       │   └── patient001.txt ... patient008.txt
│       └── ground_truth/            # Validation ground truth
│           └── patient001.json ... patient008.json
│
├── BACKEND_API_CONTRACT.md          # Authoritative API documentation
├── package.json                     # Root workspace config
├── .gitignore
└── README.md                        # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ v18.x
- **npm** ≥ v9.x
- **MongoDB** ≥ v6.x *(optional — server runs in mock/in-memory mode without it)*

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/abhinavshankar17/MediBuddy.git
cd MediBuddy

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
```

### Configure Environment

```bash
# Copy the example env file
cp server/.env.example server/.env

# Edit as needed (defaults work out of the box)
```

### Run the Application

```bash
# Terminal 1: Start the backend server
cd server
npm run dev          # Runs on http://localhost:5000

# Terminal 2: Start the frontend dev server
cd client
npm run dev          # Runs on http://localhost:3000
```

Or from the project root:

```bash
npm run server:dev   # Start backend
npm run dev          # Start frontend
```

### Verify

Open your browser and navigate to:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **API Root**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/medibuddy` | MongoDB connection string |
| `JWT_SECRET` | `carebridge_medibuddy_jwt_secret_dev_2026` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

> **Note:** MongoDB is optional. If the connection fails, the server gracefully falls back to an in-memory data store powered by the synthetic dataset in `data/mock/`.

---

## 🌐 API Overview

All endpoints are mounted under the `/api` prefix. Below is a summary of the available route groups:

```mermaid
graph LR
    API["/api"] --> H["/health"]
    API --> PAT["/patients"]
    API --> DOC["/documents"]
    API --> TASK["/tasks"]
    API --> REM["/reminders"]
    API --> EVT["/events"]
    API --> ADH["/adherence"]
    API --> QZ["/quiz"]
    API --> INS["/insights"]
    API --> NRS["/nurse"]
    API --> ESC["/escalations"]

    PAT --> PAT1["GET / — List patients"]
    PAT --> PAT2["GET /:id — Patient profile"]
    PAT --> PAT3["GET /:id/recovery"]
    PAT --> PAT4["GET /:id/tasks"]
    PAT --> PAT5["GET /:id/document"]
    PAT --> PAT6["GET /:id/instructions"]
    PAT --> PAT7["GET /:id/discharge-summary"]

    REM --> REM1["GET / — List reminders"]
    REM --> REM2["GET /:id — Reminder detail"]
    REM --> REM3["GET /:id/status"]
    REM --> REM4["POST /:id/confirm"]

    QZ --> QZ1["GET /today"]
    QZ --> QZ2["POST /start"]
    QZ --> QZ3["POST /sessions/:id/answer"]
    QZ --> QZ4["POST /sessions/:id/submit"]
    QZ --> QZ5["GET /sessions/:id/score"]

    NRS --> NRS1["GET /dashboard"]
    NRS --> NRS2["GET /dashboard/patient/:id"]
    NRS --> NRS3["GET /ai-summary/:patientId"]
    NRS --> NRS4["POST /ai-summary/generate"]

    ESC --> ESC1["GET / — List all"]
    ESC --> ESC2["GET /:id — Detail"]
    ESC --> ESC3["POST / — Create"]
    ESC --> ESC4["PATCH /:id — Update"]
    ESC --> ESC5["POST /evaluate/:patientId"]
```

> 📖 For complete request/response schemas with examples, see [`BACKEND_API_CONTRACT.md`](./BACKEND_API_CONTRACT.md).

### Response Envelope

All API responses follow a consistent envelope format:

```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "error": { }
}
```

---

## 🗃 Database Schema

```mermaid
erDiagram
    Patient ||--o{ Document : "has"
    Patient ||--o{ ExtractedItem : "has instructions"
    Patient ||--o{ Task : "assigned"
    Patient ||--o{ MedicationReminder : "scheduled for"
    Patient ||--o{ Event : "generates"
    Patient ||--o{ QuizSession : "takes"
    Patient ||--o{ PatientInsight : "receives"
    Patient ||--o{ NurseBrief : "briefed in"
    Patient ||--o{ Escalation : "triggers"

    Document ||--o{ ExtractedItem : "source of"
    ExtractedItem ||--o{ MedicationReminder : "linked to"
    ExtractedItem ||--o{ QuizQuestion : "grounded by"

    QuizSession ||--o{ QuizQuestion : "contains exactly 5"
    QuizSession ||--o{ QuizAnswer : "records"
    QuizQuestion ||--o{ QuizAnswer : "answered by"

    MedicationReminder ||--o{ Event : "tracked by"

    Patient {
        string _id PK "e.g., P001"
        string name
        int age
        string gender
        string language
        string condition
        string procedure
        string recoveryPhase
        date admissionDate
        date dischargeDate
        string mobility
        string dietaryPreference
        object preferences
        string caregiverId FK
    }

    Document {
        string _id PK "e.g., D001"
        string patientId FK
        string documentType
        string hospitalName
        string doctorName
        string rawText
        datetime uploadedAt
    }

    ExtractedItem {
        string _id PK "e.g., EI001"
        string documentId FK
        string patientId FK
        string type "medication, activity, diet, etc."
        string name
        string dose
        string frequency
        float confidence
        string status "APPROVED, PENDING, FLAGGED"
        string trust "HIGH, MEDIUM, LOW"
        boolean verifiedSource
    }

    MedicationReminder {
        string _id PK "e.g., MR001"
        string patientId FK
        string extractedItemId FK
        string medicationName
        string dose
        datetime scheduledAt
        string status "scheduled, taken, missed, etc."
        string responseType
        string confirmationStatus
    }

    Event {
        string _id PK "e.g., E101"
        string patientId FK
        string type "medication_taken, quiz_completed, etc."
        string reminderId FK
        object payload
        datetime timestamp
        string actor
    }

    QuizSession {
        string _id PK "e.g., QS001"
        string patientId FK
        string date
        string status "in_progress, completed"
        int score
        int totalQuestions "always 5"
    }

    QuizQuestion {
        string _id PK "e.g., QQ001"
        string quizSessionId FK
        string question
        array options
        string correctAnswer "masked before submission"
        string sourceItemId FK
        string difficulty
    }

    QuizAnswer {
        string _id PK
        string quizSessionId FK
        string questionId FK
        string selectedAnswer
        boolean correct
        datetime answeredAt
    }

    PatientInsight {
        string _id PK "e.g., PI001"
        string patientId FK
        int score
        array strengths
        array weaknesses
        array missedInstructions
        string aiSummary
        string priority
        array evidenceEventIds
        boolean aiGenerated
        string disclaimer
    }

    NurseBrief {
        string _id PK "e.g., NB001"
        string patientId FK
        string priority
        object medicationAdherence
        object quizPerformance
        array flags
        array knowledgeGaps
        array questionsForNurse
        string aiSummary
    }

    Escalation {
        string _id PK "e.g., ESC001"
        string patientId FK
        string category "warning_sign, missed_medication, etc."
        string description
        string status "OPEN, IN_REVIEW, RESOLVED"
        string priority "LOW, MEDIUM, HIGH"
        string relatedEventId FK
        array evidence
    }

    Task {
        string _id PK "e.g., T001"
        string patientId FK
        string title
        string description
        datetime dueAt
        string priority
        string status
    }
```

---

## 💻 Client Application

### Routing Architecture

```mermaid
graph TD
    ROOT["/"] --> LANDING["LandingPage"]
    ROOT --> LOGIN["/login → LoginPage"]
    
    ROOT --> PATIENT["/patient → PatientLayout"]
    PATIENT --> P_DASH["/patient/dashboard"]
    PATIENT --> P_MED["/patient/medication"]
    PATIENT --> P_QUIZ["/patient/quiz"]
    PATIENT --> P_QR["/patient/quiz/result"]
    PATIENT --> P_INS["/patient/insights"]
    PATIENT --> P_DIS["/patient/discharge"]
    
    ROOT --> NURSE["/nurse → NurseLayout"]
    NURSE --> N_DASH["/nurse/dashboard"]
    NURSE --> N_PAT["/nurse/patients"]
    NURSE --> N_DET["/nurse/patients/:id"]
    NURSE --> N_ADH["/nurse/adherence"]
    NURSE --> N_QP["/nurse/quiz-performance"]
    NURSE --> N_AI["/nurse/ai-summary"]
    NURSE --> N_ESC["/nurse/escalations"]

    style PATIENT fill:#dbeafe,stroke:#3b82f6
    style NURSE fill:#fef3c7,stroke:#f59e0b
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `Header` | Navigation bar with role-based menu items |
| `Sidebar` | Collapsible side navigation for patient/nurse portals |
| `Card` | Reusable card container with consistent styling |
| `StatusBadge` | Color-coded badges for status display |
| `SwipeConfirmButton` | Mobile-friendly swipe-to-confirm for medication acknowledgment |
| `EmptyState` / `ErrorState` / `LoadingState` | Consistent feedback UI states |

---

## 🔒 Patient Isolation & Safety

MediBuddy enforces **strict patient data isolation** across every endpoint:

```mermaid
flowchart TD
    REQ["Incoming API Request"] --> AUTH{"JWT\nAuthenticated?"}
    AUTH -->|No| R401["401 Unauthorized"]
    AUTH -->|Yes| ROLE{"Role\nAuthorized?"}
    ROLE -->|No| R403A["403 Forbidden"]
    ROLE -->|Yes| PID{"patientId\nProvided?"}
    PID -->|No| R400["400 Bad Request\n(Missing patientId)"]
    PID -->|Yes| EXISTS{"Patient\nExists?"}
    EXISTS -->|No| R404["404 Not Found"]
    EXISTS -->|Yes| OWNS{"Data belongs to\nthis patient?"}
    OWNS -->|No| R403B["403 Forbidden\n(Cross-patient leak blocked)"]
    OWNS -->|Yes| SUCCESS["✅ 200 OK\n(Isolated data returned)"]

    style R401 fill:#fef2f2,stroke:#ef4444
    style R403A fill:#fef2f2,stroke:#ef4444
    style R403B fill:#fef2f2,stroke:#ef4444
    style R400 fill:#fef3c7,stroke:#f59e0b
    style R404 fill:#fef3c7,stroke:#f59e0b
    style SUCCESS fill:#f0fdf4,stroke:#22c55e
```

### Isolation Guarantees

| Rule | Description |
|------|-------------|
| **Mandatory Scoping** | Every data query requires `patientId` — either as a route param or query param |
| **Existence Check** | Invalid patient IDs (e.g., `P999`) return `404 Not Found` |
| **Zero Cross-Leakage** | Tasks, documents, reminders, events, quiz data, insights, and escalations are strictly isolated per patient |
| **Ownership Verification** | Confirmation/submission requests with mismatched patient IDs are blocked with `403 Forbidden` |

---

## 🤖 AI Safety Boundaries

MediBuddy integrates AI-generated content (patient insights, nurse summaries) with strict clinical safety guardrails:

> **⚠️ AI-generated content MUST NEVER:**
> - 🚫 Diagnose conditions
> - 🚫 Prescribe medications
> - 🚫 Recommend dosage changes
> - 🚫 Suggest treatment plans or medication discontinuation
> - 🚫 Use emergency classifications (`EMERGENCY`, `CRITICAL CARE`, `CODE BLUE`)

Every AI-generated response includes:
```json
{
  "aiGenerated": true,
  "disclaimer": "AI-generated — verify before acting."
}
```

**Quiz scores** are strictly classified as **educational knowledge and engagement signals** — never clinical scores, medical risk scores, or diagnoses.

---

## 🧪 Synthetic Demo Dataset

The `data/mock/` directory contains a curated synthetic dataset with **8 fictional patients** designed to demonstrate various recovery scenarios:

| Patient | Condition | Edge Case |
|---------|-----------|-----------|
| P001 | Post-op knee recovery | Baseline happy path |
| P002 | Cardiac recovery | Missing medication dose / low confidence extraction |
| P003 | Pneumonia recovery | Warning sign escalation |
| P004 | Hip replacement | Standard recovery flow |
| P005 | Post-surgery recovery | Missed medication / high-priority nurse review |
| P006 | Appendectomy recovery | Standard recovery flow |
| P007 | Spinal surgery recovery | Extended recovery timeline |
| P008 | Cataract post-op | Treatment question + teach-back reinforcement |

> ⚠️ **All names, providers, credentials, phone numbers, and clinical instructions are entirely fictional demo data. NOT for clinical use.**

---

## 🧪 Testing

Feature-level test scripts are available in the `server/` directory:

```bash
cd server

# Run individual feature tests
node test_feature2.js    # Patient & Discharge Summary
node test_feature3.js    # Medication Reminders
node test_feature4.js    # Events & Adherence
node test_feature5.js    # Daily Quiz
node test_feature6.js    # Quiz Answer Storage
node test_feature7.js    # Patient Insights
node test_feature8.js    # Nurse Dashboard
node test_feature9.js    # Nurse AI Summary
node test_feature10.js   # Escalations

# Run comprehensive QA suite
node test_final_qa.js
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation change |
| `refactor:` | Code refactoring |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance tasks |

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for better post-discharge patient care
</p>
