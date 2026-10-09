# 🏥 MediBuddy — CareBridge Post-Discharge Care Platform

> **A full-stack MERN application** for post-discharge patient care monitoring, connecting patients, family caregivers, and clinical nurses in a unified, multilingual health platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Role-Based Portals](#role-based-portals)
5. [Application Routes](#application-routes)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [MongoDB Data Models](#mongodb-data-models)
8. [Key Feature Flows](#key-feature-flows)
9. [Multilingual System](#multilingual-system)
10. [AI & Clinical Safety](#ai--clinical-safety)
11. [Project Structure](#project-structure)
12. [Environment Variables](#environment-variables)
13. [Setup & Installation](#setup--installation)
14. [Demo Users](#demo-users)

---

## Overview

**MediBuddy** (also known as *CareBridge*) is a post-discharge care monitoring platform designed to improve patient outcomes after hospital discharge. It provides:

- 📱 **Patient Portal** — Daily health quizzes, medication tracking, discharge instructions, personal insights, and direct feedback submission.
- 👨‍👩‍👧 **Family Caregiver Portal** — Real-time updates on their loved one's recovery, daily reports, medication adherence calendars, and encouragement messaging.
- 🏥 **Nurse/Clinical Portal** — AI-powered patient summaries, escalation management, medication adherence monitoring, and multi-patient dashboard.

The system is fully **multilingual** (English 🇬🇧 · हिंदी 🇮🇳 · தமிழ் 🇮🇳) and integrates a **Groq-powered LLM AI** for clinical brief generation — with strict safety boundaries to prevent diagnosis or prescription.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite, React Router v6 |
| **State Management** | React Context API (`AppContext`) |
| **Styling** | Vanilla CSS (custom design system) |
| **Internationalisation** | `i18next` + `react-i18next` |
| **Backend** | Node.js + Express 4 |
| **Database** | MongoDB 8 via Mongoose 8 |
| **Authentication** | JWT (jsonwebtoken + bcryptjs) |
| **AI Integration** | Groq API (LLaMA 3.3 70B / LLaMA 3 8B) |
| **File Upload** | Multer (PDF prescription upload) |
| **PDF Parsing** | `pdf-parse` |
| **Dev Server** | `node --watch` (backend), Vite HMR (frontend) |

---

## System Architecture

```mermaid
graph TB
    subgraph Client ["🖥️ Client (Vite / React)"]
        LP[Landing Page] --> LG[Login Page]
        LG --> PP[Patient Portal]
        LG --> CP[Caregiver Portal]
        LG --> NP[Nurse Portal]

        PP --- PCTX["AppContext\npatientId · language · role"]
        CP --- PCTX
        NP --- PCTX

        PCTX --> I18N["i18next\nen / hi / ta"]
        PCTX --> LS[LanguageSwitcher]
    end

    subgraph Server ["⚙️ Server (Express)"]
        API["/api Router"] --> PR[Patient Routes]
        API --> NR[Nurse Routes]
        API --> CGR[Caregiver Routes]
        API --> QR[Quiz Routes]
        API --> IR[Insight Routes]
        API --> NOT[Notification Routes]
        API --> ESC[Escalation Routes]

        PR --> PC[Patient Controller]
        NR --> NC[Nurse Controller]
        CGR --> CC[Caregiver Controller]
        QR --> QC[Quiz Controller]
        IR --> IC[Insight Controller]

        PC --> DS["dataStore.js\nAbstraction Layer"]
        NC --> DS
        CC --> DS
        QC --> DS
        IC --> DS

        DS --> MG[(MongoDB)]
        DS --> CACHE[In-Memory Cache]
    end

    subgraph AI ["🤖 AI Layer"]
        GS["GeminiService\nGroq API Caller"]
        IS["InsightService\nPatient Insights"]
        NS["NurseService\nAI Briefs"]
        ABE["AI Boundary\nEnforcer"]

        IS --> GS
        NS --> GS
        IS --> ABE
        NS --> ABE
    end

    subgraph Workers ["⏰ Background Workers"]
        NW["Notification Worker\nEvery 15s"]
        FSW["Mock File Watcher\nchokidar"]
        NW --> DS
        FSW --> DS
    end

    Client -- "fetch /api/*" --> Server
    Server --> AI
```

---

## Role-Based Portals

```mermaid
graph LR
    U[User Login] --> R{Role?}

    R -->|patient| P["🧑‍⚕️ Patient Portal\n/patient/*"]
    R -->|caregiver| C["👨‍👩‍👧 Caregiver Portal\n/caregiver/*"]
    R -->|"nurse / clinician"| N["🏥 Nurse Portal\n/nurse/*"]

    P --> P1[Dashboard]
    P --> P2[Prescription Viewer]
    P --> P3[Medication Tracker]
    P --> P4[Daily Quiz]
    P --> P5[Care Insights]
    P --> P6[Discharge Instructions]
    P --> P7[Feedback & Appointments]

    C --> C1["Family Dashboard\nDaily Report"]
    C --> C2[Recovery Calendar]
    C --> C3["Patient Feedback Review\n+ Encouragement"]

    N --> N1["Nurse Dashboard\nCohort Overview"]
    N --> N2[Patient List]
    N --> N3["Patient Detail\nAI Summary"]
    N --> N4[Medication Adherence]
    N --> N5[AI Briefs]
    N --> N6[Escalation Management]
```

---

## Application Routes

### Frontend (React Router)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | Marketing / product landing page |
| `/login` | `LoginPage` | One-click persona login |
| `/patient` | `PatientDashboard` | Today's overview, reminders, encouragement |
| `/patient/prescription` | `PatientPrescription` | Uploaded prescription PDF viewer + AI extraction |
| `/patient/medication` | `Medication` | Medication list + swipe-to-confirm |
| `/patient/insights` | `PatientInsight` | AI-grounded care insights + caregiver encouragement |
| `/patient/discharge` | `DischargeInstructions` | Post-discharge instructions |
| `/patient/feedback` | `PatientFeedback` | Submit condition feedback + book appointments |
| `/caregiver` | `CaregiverDashboard` | Daily report, adherence overview |
| `/caregiver/calendar` | `CaregiverCalendar` | Month-view recovery calendar |
| `/caregiver/feedback` | `CaregiverFeedback` | View patient feedback + send encouragement |
| `/nurse` | `NurseDashboard` | Cohort overview, alerts, recent events |
| `/nurse/patients` | `PatientList` | Searchable patient list with status badges |
| `/nurse/patients/:id` | `PatientDetail` | Full patient detail with AI summary |
| `/nurse/adherence` | `MedicationAdherence` | Adherence charts across all patients |
| `/nurse/ai-summary` | `AISummary` | AI-generated nurse briefs |
| `/nurse/escalations` | `Escalations` | Open/In-Review/Resolved escalation queue |

---

## API Endpoints Reference

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |

### Patients — `/api/patients`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients` | List all patients |
| `GET` | `/api/patients/:id` | Get patient profile |
| `GET/PUT/PATCH` | `/api/patients/:id/language` | Get / update language preference |
| `GET` | `/api/patients/:id/recovery` | Recovery summary |
| `GET` | `/api/patients/:id/tasks` | Patient task list |
| `GET` | `/api/patients/:id/discharge-summary` | Full discharge summary package |
| `GET` | `/api/patients/:patientId/reminders` | Medication reminders |
| `POST` | `/api/patients/:patientId/reminders/:id/confirm` | Confirm medication taken |
| `GET` | `/api/patients/:patientId/adherence` | Medication adherence stats |
| `GET/POST` | `/api/patients/:patientId/events` | Patient events |
| `GET` | `/api/patients/:patientId/quiz/today` | Today's quiz session |
| `POST` | `/api/patients/:patientId/quiz/start` | Start a new quiz |
| `GET` | `/api/patients/:patientId/quiz/sessions/:id/questions` | Quiz questions |
| `POST` | `/api/patients/:patientId/quiz/sessions/:id/submit` | Submit quiz |
| `POST` | `/api/patients/:patientId/quiz/sessions/:id/answer` | Record single answer |
| `GET` | `/api/patients/:id/insights/latest` | Latest AI insight |
| `POST` | `/api/patients/:id/insights/generate` | Generate AI insight |
| `GET/POST` | `/api/patients/:id/escalations` | Patient escalations |
| `GET/POST` | `/api/patients/:id/feedback` | Patient feedbacks |
| `GET/POST` | `/api/patients/:id/appointments` | Patient appointments |

### Nurse — `/api/nurse`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nurse/dashboard` | Cohort overview |
| `POST` | `/api/nurse/prescriptions/upload` | Upload prescription PDF |
| `GET` | `/api/nurse/patients` | Patient list |
| `GET` | `/api/nurse/patients/:id` | Single patient detail |
| `GET` | `/api/nurse/ai-summary/:patientId` | AI summary for patient |
| `POST` | `/api/nurse/patients/:id/ai-summary/generate` | Generate AI summary |
| `GET` | `/api/nurse/escalations` | All escalations |
| `PATCH` | `/api/nurse/escalations/:id` | Update escalation status |

### Caregiver — `/api/caregiver`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/caregiver/patients` | Patients linked to caregiver |
| `GET` | `/api/caregiver/patients/:patientId/daily-report` | Daily report |
| `GET` | `/api/caregiver/patients/:patientId/calendar` | Recovery calendar data |
| `GET` | `/api/caregiver/patients/:patientId/feedback` | Patient feedback list |
| `POST` | `/api/caregiver/patients/:patientId/feedback/:feedbackId/review` | Review feedback |
| `GET` | `/api/caregiver/patients/:patientId/encouragement` | Get encouragements |
| `POST` | `/api/caregiver/patients/:patientId/encouragement` | Send encouragement |

### Quiz — `/api/quiz`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quiz/today` | Today's quiz |
| `POST` | `/api/quiz/start` | Start quiz session |
| `GET` | `/api/quiz/sessions/:id/questions` | Questions for session |
| `POST` | `/api/quiz/sessions/:id/submit` | Submit all answers |
| `GET` | `/api/quiz/sessions/:id/score` | Get final score |

### Notifications — `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | All notifications |
| `GET` | `/api/notifications/unread` | Unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark as read |
| `POST` | `/api/notifications/process-reminders` | Trigger reminder processing |

---

## MongoDB Data Models

```mermaid
erDiagram
    Patient {
        string _id PK
        string name
        number age
        string gender
        string language
        string condition
        string procedure
        string recoveryPhase
        string caregiverId FK
        object preferences
    }

    MedicationReminder {
        string _id PK
        string patientId FK
        string medicationName
        string dose
        string scheduledAt
        string status
        string responseType
        object notificationState
    }

    Notification {
        string _id PK
        string recipientId FK
        string recipientRole
        string patientId FK
        string reminderId FK
        string type
        string title
        string message
        boolean read
    }

    Escalation {
        string _id PK
        string patientId FK
        string category
        string reason
        string severity
        string status
        string assignedTo
    }

    PatientInsight {
        string _id PK
        string patientId FK
        string quizSessionId FK
        number score
        string aiSummary
        string priority
        boolean aiGenerated
        string disclaimer
    }

    NurseBrief {
        string _id PK
        string patientId FK
        string priority
        string aiSummary
        string disclaimer
        object medicationAdherence
        object quizPerformance
        boolean aiGenerated
    }

    QuizSession {
        string _id PK
        string patientId FK
        string status
        number score
    }

    QuizQuestion {
        string _id PK
        string patientId FK
        string quizSessionId FK
        string questionText
        string correctAnswer
    }

    Document {
        string _id PK
        string patientId FK
        string type
        string filename
        string filePath
    }

    ExtractedItem {
        string _id PK
        string patientId FK
        string documentId FK
        string category
        string instruction
        boolean verified
    }

    Patient ||--o{ MedicationReminder : "has"
    Patient ||--o{ Notification : "receives"
    Patient ||--o{ Escalation : "generates"
    Patient ||--o{ PatientInsight : "has"
    Patient ||--o{ NurseBrief : "has"
    Patient ||--o{ QuizSession : "takes"
    Patient ||--o{ Document : "has"
    Patient ||--o{ ExtractedItem : "has"
    QuizSession ||--o{ QuizQuestion : "contains"
```

---

## Key Feature Flows

### Authentication & Session Flow

```mermaid
sequenceDiagram
    actor User
    participant Login as LoginPage
    participant Auth as authService.js
    participant Ctx as AppContext
    participant LS as localStorage
    participant i18n as i18next

    User->>Login: Select demo persona
    Login->>Auth: getAllDemoUsers() - picks user
    Login->>Ctx: loginUser(user)
    Ctx->>LS: save "medi_buddy_auth_user"
    Ctx->>i18n: changeLanguage(user.language)
    i18n->>LS: save "medi_buddy_language"
    Ctx-->>Login: portalRole updated
    Login-->>User: Navigate to /patient or /nurse or /caregiver
```

---

### Medication Reminder Notification Workflow

The background worker runs every **15 seconds** and processes timed notifications through three escalating stages.

```mermaid
flowchart TD
    A["⏰ Background Worker\nEvery 15 seconds"] --> B["Fetch all MedicationReminders\nstatus ≠ taken"]
    B --> C{scheduledAt in past?}
    C -- No --> Z[Skip]
    C -- Yes --> D{Initial reminder sent?}
    D -- No --> E["📬 Send Medication Reminder\nNotification to Patient"]
    E --> F[Mark initialReminderSent = true]
    D -- Yes --> G{Patient confirmed taken?}
    G -- Yes --> Z
    G -- No --> H{"+10 min elapsed &\nfollowUp not sent?"}
    H -- Yes --> I["📲 Send Follow-Up\nNotification to Patient"]
    H -- No --> K{"+25 min elapsed &\nsimCall not sent?"}
    K -- Yes --> L["📞 Send Simulated Call\nNotification to Patient"]
    L --> M["Mark reminder as missed"]
    K -- No --> N{"+30 min elapsed &\ncaregiver not notified?"}
    N -- Yes --> O["🔔 Send Caregiver\nNotification"]
    N -- No --> Z
```

---

### AI Insight Pipeline

```mermaid
flowchart TD
    A["POST /patients/:id/insights/generate"] --> B[insightService.generateInsight]
    B --> D["Fetch patient profile,\nquiz sessions, events, adherence"]
    D --> E{Quiz data available?}
    E -- Yes --> F["Build factual evidence context:\nQuiz score, Correct/incorrect topics,\nAdherence stats, Recent events"]
    E -- No --> G["Minimal context:\nPatient demographics only"]
    F --> H["Determine target language\nen / hi / ta"]
    G --> H
    H --> I["Build multilingual prompt\nwith localized disclaimers"]
    I --> J["GeminiService → Groq API\nLLaMA 3.3 70B"]
    J --> K{AI response valid?}
    K -- No --> L["Use deterministic\nfallback insight"]
    K -- Yes --> M[sanitizeAndVerifyInsight]
    M --> N{enforceAIBoundary — check forbidden patterns}
    N -- Violation --> O["❌ 400 Error\nAI Boundary Violation"]
    N -- Safe --> P["Save PatientInsight\nto MongoDB"]
    P --> Q["Return insight with\ndisclaimer to client"]
```

---

### Patient–Caregiver Feedback Loop

```mermaid
sequenceDiagram
    actor Patient
    actor Caregiver
    participant PF as PatientFeedback Page
    participant CF as CaregiverFeedback Page
    participant API as Express API
    participant DB as MongoDB

    Patient->>PF: Fill feedback form
    PF->>API: POST /api/patients/:id/feedback
    API->>DB: Save to feedbacks collection

    Caregiver->>CF: Open Feedback tab
    CF->>API: GET /api/caregiver/patients/:id/feedback
    DB-->>CF: Return feedback list

    Caregiver->>CF: Click Send Encouragement
    CF->>API: POST /api/caregiver/patients/:id/encouragement
    API->>DB: Save encouragement

    Patient->>PF: Open Care Insights
    PF->>API: GET /api/caregiver/patients/:id/encouragement
    API-->>PF: Return encouragement messages
    PF-->>Patient: Display in Care Insights section
```

---

### Nurse AI Summary Generation

```mermaid
flowchart LR
    A[Nurse opens PatientDetail] --> B["Fetch patient data:\nadherence, quiz, feedback, events"]
    B --> C[nurseService.getAISummary]
    C --> D{Cached NurseBrief exists?}
    D -- Yes --> E[Return cached brief]
    D -- No --> F[Collect multi-factor evidence]
    F --> G["Build structured prompt\nfor Groq LLaMA model"]
    G --> H[GeminiService.callGroqApi]
    H --> I[enforceAIBoundary validation]
    I --> J{Safe?}
    J -- No --> K[Return safe fallback summary]
    J -- Yes --> L["Save NurseBrief\nto MongoDB"]
    L --> M["Return to nurse\nwith disclaimer badge"]
```

---

## Multilingual System

The application supports **English (en)**, **Hindi (hi)**, and **Tamil (ta)** throughout the UI and AI-generated content.

```mermaid
flowchart TD
    A["User clicks Language Switcher\nen | हि | த"] --> B[AppContext.changeLanguage]
    B --> C["i18n.changeLanguage\nupdate all UI strings"]
    B --> D["Save to localStorage\nmedi_buddy_language"]
    B --> E["PUT /api/patients/:id/language\nPersist to MongoDB"]

    C --> F[All React components re-render with t-key]

    subgraph UITranslation ["UI Translation Keys"]
        F --> G[Navigation labels]
        F --> H[Page headings]
        F --> I[Form placeholders]
        F --> J[Status badges]
        F --> K[Error messages]
    end

    subgraph AITranslation ["AI Content Localisation"]
        E --> L["Quiz questions fetch with ?language=hi/ta"]
        L --> M["quizService.localizeSingleQuestion\nReturns translated fields\n+ original English for audit"]
        E --> N["Insight generation with ?language=hi/ta"]
        N --> O["Localized prompt to Groq API"]
        O --> P["Response in target language\n+ localized disclaimer"]
    end

    subgraph Safety ["Clinical Safety Preserved"]
        P --> R["AI Boundary Enforcer\nNo diagnosis / prescription\nregardless of language"]
    end
```

### Language Persistence

| Step | Mechanism |
|------|-----------|
| Initial Load | Read `medi_buddy_language` from `localStorage` |
| Runtime Change | `AppContext.changeLanguage()` → `i18n.changeLanguage()` + backend sync |
| Backend Sync | `PUT /api/patients/:id/language` updates `Patient.language` in MongoDB |
| AI Content | All dynamic endpoints accept `?language=en/hi/ta` query parameter |
| Fallback | Always falls back to `en` if translation key is missing |

---

## AI & Clinical Safety

> ⚠️ **IMPORTANT**: MediBuddy's AI integration is strictly non-clinical. The system cannot diagnose, prescribe, or modify medication plans.

### Forbidden AI Patterns (enforced on every AI output)

The following regex patterns are checked against every AI-generated response before it is saved or returned:

```
❌ diagnose / diagnosis / diagnosed / diagnosing
❌ prescribe / prescribed / prescribing / prescription
❌ increase / decrease / change / modify / adjust the dose / dosage / medication
❌ start / stop / discontinue taking medication / drug / pill
❌ treatment plan
❌ emergency classification / code blue / critical care / ICU admission / life-threatening
```

If any AI output matches these patterns, the server returns **400 Bad Request** — `AI Boundary Violation`.

### AI Disclaimer Requirements

Every AI-generated insight or nurse brief includes a disclaimer:

- 🇬🇧 English: *"AI-generated — verify before acting."*
- 🇮🇳 Hindi: *"AI द्वारा निर्मित — कार्रवाई से पहले सत्यापित करें।"*
- 🇮🇳 Tamil: *"AI உருவாக்கியது — செயல்படுவதற்கு முன் சரிபார்க்கவும்।"*

---

## Project Structure

```
MediBuddy/
├── client/                          # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Route definitions
│       ├── i18n.js                  # i18next configuration
│       ├── index.css                # Global CSS design tokens
│       ├── locales/
│       │   ├── en.json              # English translations
│       │   ├── hi.json              # Hindi translations
│       │   └── ta.json              # Tamil translations
│       ├── context/
│       │   └── AppContext.jsx       # Global state: user, language, role, patientId
│       ├── layouts/
│       │   ├── AppLayout.jsx
│       │   ├── PatientLayout.jsx
│       │   ├── NurseLayout.jsx
│       │   └── CaregiverLayout.jsx
│       ├── components/
│       │   ├── Header.jsx           # Top nav with role badge + search
│       │   ├── Sidebar.jsx          # Role-aware sidebar
│       │   ├── LanguageSwitcher.jsx # en / हि / த switcher
│       │   ├── Card.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── SwipeConfirmButton.jsx
│       │   ├── EmptyState.jsx
│       │   ├── ErrorState.jsx
│       │   └── LoadingState.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── patient/
│       │   │   ├── PatientDashboard.jsx
│       │   │   ├── PatientPrescription.jsx
│       │   │   ├── Medication.jsx
│       │   │   ├── PatientInsight.jsx
│       │   │   ├── DischargeInstructions.jsx
│       │   │   ├── PatientFeedback.jsx
│       │   │   ├── DailyQuiz.jsx
│       │   │   └── QuizResult.jsx
│       │   ├── nurse/
│       │   │   ├── NurseDashboard.jsx
│       │   │   ├── PatientList.jsx
│       │   │   ├── PatientDetail.jsx    # AI summary integration
│       │   │   ├── MedicationAdherence.jsx
│       │   │   ├── AISummary.jsx
│       │   │   ├── Escalations.jsx
│       │   │   └── QuizPerformance.jsx
│       │   └── caregiver/
│       │       ├── CaregiverDashboard.jsx
│       │       ├── CaregiverCalendar.jsx
│       │       └── CaregiverFeedback.jsx
│       └── services/
│           ├── api.js
│           ├── authService.js
│           ├── patientService.js
│           ├── nurseService.js
│           ├── caregiverService.js
│           ├── quizService.js
│           ├── insightService.js
│           ├── feedbackService.js
│           ├── medicationService.js
│           └── notificationService.js
│
├── server/                          # Express backend
│   ├── server.js                    # Entry: DB connect, workers, listen
│   ├── app.js                       # Express middleware + routing setup
│   ├── config/
│   │   ├── index.js                 # Environment config
│   │   └── db.js                    # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js                  # JWT authenticate + authorize
│   │   ├── errorHandler.js          # Centralised error handler
│   │   └── upload.js                # Multer PDF upload
│   ├── routes/                      # API route definitions
│   ├── controllers/                 # Request handlers
│   ├── services/
│   │   ├── dataStore.js             # Central data access layer
│   │   ├── gemini.service.js        # Groq / Gemini AI integration
│   │   ├── insight.service.js       # Patient insight + AI safety
│   │   ├── nurse.service.js         # Nurse AI briefs
│   │   ├── caregiver.service.js     # Caregiver dashboard
│   │   ├── quiz.service.js          # Quiz + multilingual localisation
│   │   ├── notification.service.js  # Timed medication notifications
│   │   ├── feedback.service.js      # Patient feedback + appointments
│   │   ├── escalation.service.js    # Clinical escalation management
│   │   ├── document.service.js      # PDF upload + extraction
│   │   └── mockSync.service.js      # Mock JSON to MongoDB sync
│   ├── models/                      # Mongoose schemas
│   ├── prompts/                     # LLM prompt templates
│   ├── seed/                        # Database seeder
│   └── uploads/                     # Uploaded prescription PDFs
│
└── data/
    └── mock/                        # Seed / fixture JSON files
        ├── patients.json
        ├── users.json
        ├── medicationReminders.json
        ├── events.json
        ├── tasks.json
        ├── quizSessions.json
        ├── quizQuestions.json
        ├── patientInsights.json
        ├── nurseBriefs.json
        ├── escalations.json
        ├── documents.json
        ├── feedbacks.json
        └── ...
```

---

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/medibuddy

# JWT Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# AI Integration (at least one required for AI features)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Medication Notification Timing (minutes)
MEDICATION_FOLLOWUP_NOTIFICATION_MINUTES=10
MEDICATION_SIMULATED_CALL_MINUTES=25
MEDICATION_CAREGIVER_NOTIFICATION_MINUTES=30
```

> The application works without AI API keys — AI features return deterministic fallback responses. All other features remain fully functional.

---

## Setup & Installation

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm >= 9

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
# Create .env and fill in values (see Environment Variables section)
```

### 3. Seed the Database (optional)

```bash
cd server
npm run seed
```

### 4. Start Development Servers

**Backend** (terminal 1):
```bash
cd server
npm run dev
# Runs on http://localhost:5000
# Health: http://localhost:5000/api/health
```

**Frontend** (terminal 2):
```bash
cd client
npm run dev
# Runs on http://localhost:5173
# Proxies /api/* to http://localhost:5000
```

---

## Demo Users

The application includes pre-seeded demo personas for instant one-click login:

| Name | Role | Patient ID | Language | Portal |
|------|------|-----------|----------|--------|
| Meena Krishnan | Patient | P001 | Tamil (ta) | `/patient` |
| Arjun Sharma | Patient | P002 | Hindi (hi) | `/patient` |
| Priya Nair | Patient | P003 | English (en) | `/patient` |
| Dr. Kavitha Rajan | Nurse | — | English (en) | `/nurse` |
| Rajesh Krishnan | Caregiver | — | Tamil (ta) | `/caregiver` |

All demo users are defined in `data/mock/users.json`.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **dataStore.js abstraction** | Single data access layer wrapping MongoDB + in-memory cache; allows graceful offline operation |
| **Mock file watcher** | `mockSync.service.js` watches `data/mock/*.json` and hot-reloads into MongoDB without restarts |
| **Groq primary, Gemini fallback** | Groq's LLaMA models are faster for structured JSON generation |
| **Language in Patient model** | Persists language preference so AI endpoints serve the correct language server-side |
| **AI boundary enforcement** | Regex pattern matching on all AI output before saving or returning — prevents any clinical overreach |
| **English preserved for audit** | All multilingual quiz questions and AI insights preserve original English text for clinical review |

---

*MediBuddy / CareBridge — Built for post-discharge patient care* 🏥
