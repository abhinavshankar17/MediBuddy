# CareBridge / MediBuddy Backend API Contract & Route Inventory

## 1. System Overview & Baseline Inventory

This document defines the authoritative API contract and architecture for the MediBuddy / CareBridge backend service, updated through **Backend Feature 2 (Patient & Discharge-Summary Management)**.

The server is built with Node.js and Express.js, featuring a modular architecture:
- `server/controllers/`: Route handlers and response formatting
- `server/routes/`: Router endpoints mounted under `/api`
- `server/middleware/`: CORS, Morgan logging, authentication, and error handling
- `server/models/`: Canonical Mongoose models (`Patient`, `Document`, `ExtractedItem`, `Task`)
- `server/services/`: Business logic and unified DataStore with strict patient isolation
- `server/seed/`: Mock data loader reading from `data/mock/`
- `server/utils/`: Response envelope and logging utilities

---

## 2. Active Implemented Routes

### Baseline / System Endpoints

```text
METHOD: GET
PATH: /
AUTH: None (Public)
PURPOSE: Root server status check and ping
REQUEST:
  Headers: None
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "message": "CareBridge / MediBuddy API Server",
      "status": "running",
      "health": "/api/health",
      "api": "/api"
    }

---

METHOD: GET
PATH: /api
AUTH: None (Public)
PURPOSE: API root metadata and discovery endpoint
REQUEST:
  Headers: None
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "name": "CareBridge / MediBuddy API",
      "version": "1.0.0",
      "documentation": "/api/docs",
      "health": "/api/health",
      "endpoints": {
        "health": "/api/health",
        "patients": "/api/patients",
        "documents": "/api/documents",
        "tasks": "/api/tasks"
      },
      "status": "active"
    }

---

METHOD: GET
PATH: /api/health
AUTH: None (Public)
PURPOSE: Service health check verifying system uptime and database connectivity state
REQUEST:
  Headers: None
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "System is healthy and operational",
      "data": {
        "service": "CareBridge / MediBuddy API Server",
        "version": "1.0.0",
        "status": "ok",
        "uptimeSeconds": 15,
        "timestamp": "2026-10-08T10:14:01.189Z",
        "database": {
          "connected": false,
          "readyState": 0,
          "host": null,
          "name": null
        }
      }
    }
```

---

### Feature 2: Patient Endpoints (`/api/patients`)

```text
METHOD: GET
PATH: /api/patients
AUTH: Optional / Role-based (caregiver, nurse, clinician)
PURPOSE: List all patients with optional filtering
REQUEST:
  Headers: None
  Query Parameters:
    - caregiverId (string, optional)
    - language (string, optional)
    - recoveryPhase (string, optional)
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Patients retrieved successfully",
      "data": [
        {
          "_id": "P001",
          "syntheticId": "CB-P001",
          "name": "Meena Krishnan",
          "age": 54,
          "gender": "Female",
          "language": "ta",
          "condition": "Post-operative knee recovery",
          "procedure": "Right total knee replacement",
          "recoveryPhase": "Week 1",
          "admissionDate": "2026-10-01",
          "dischargeDate": "2026-10-05",
          "mobility": "Walker",
          "dietaryPreference": "Vegetarian",
          "preferences": {
            "wakeTime": "06:30",
            "breakfastTime": "08:00",
            "lunchTime": "13:00",
            "dinnerTime": "20:00",
            "sleepTime": "22:30"
          },
          "caregiverId": "U101"
        }
      ]
    }

---

METHOD: GET
PATH: /api/patients/:id
AUTH: Required / Patient-scoped
PURPOSE: Retrieve full patient profile and demographic details
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier (e.g., "P001")
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Patient profile for P001 retrieved successfully",
      "data": {
        "_id": "P001",
        "syntheticId": "CB-P001",
        "name": "Meena Krishnan",
        "age": 54,
        "gender": "Female",
        "language": "ta",
        "condition": "Post-operative knee recovery",
        "procedure": "Right total knee replacement",
        "recoveryPhase": "Week 1",
        "admissionDate": "2026-10-01",
        "dischargeDate": "2026-10-05",
        "mobility": "Walker",
        "dietaryPreference": "Vegetarian",
        "preferences": { ... },
        "caregiverId": "U101"
      }
    }
  Error Status: 404 Not Found (if patient ID does not exist)

---

METHOD: GET
PATH: /api/patients/:id/recovery
AUTH: Required / Patient-scoped
PURPOSE: Retrieve patient recovery milestones, phase, procedure, mobility, and schedule preferences
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Recovery information for P001 retrieved successfully",
      "data": {
        "patientId": "P001",
        "name": "Meena Krishnan",
        "condition": "Post-operative knee recovery",
        "procedure": "Right total knee replacement",
        "recoveryPhase": "Week 1",
        "admissionDate": "2026-10-01",
        "dischargeDate": "2026-10-05",
        "mobility": "Walker",
        "dietaryPreference": "Vegetarian",
        "dailySchedulePreferences": {
          "wakeTime": "06:30",
          "breakfastTime": "08:00",
          "lunchTime": "13:00",
          "dinnerTime": "20:00",
          "sleepTime": "22:30"
        },
        "caregiverId": "U101"
      }
    }

---

METHOD: GET
PATH: /api/patients/:id/tasks
AUTH: Required / Patient-scoped
PURPOSE: Retrieve recovery tasks strictly isolated to this patient
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier
  Query Parameters:
    - status (string, optional): Filter by task status ("pending", "completed")
    - priority (string, optional): Filter by priority ("low", "medium", "high")
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Tasks for patient P001 retrieved successfully",
      "data": [
        {
          "_id": "T001",
          "patientId": "P001",
          "itemId": "EI001",
          "title": "Paracetamol",
          "description": "Take Paracetamol 500 mg twice daily after meals for 5 days.",
          "dueAt": "2026-10-06T13:00:00+05:30",
          "recurrence": "twice daily",
          "priority": "medium",
          "status": "completed",
          "assignedTo": "P001",
          "sourceSentence": "Take Paracetamol 500 mg twice daily after meals for 5 days."
        }
      ]
    }

---

METHOD: GET
PATH: /api/patients/:id/document
AUTH: Required / Patient-scoped
PURPOSE: Retrieve the patient's discharge summary document (hospital, doctor, dates, rawText)
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Discharge document for patient P001 retrieved successfully",
      "data": {
        "_id": "D001",
        "patientId": "P001",
        "documentType": "discharge_summary",
        "hospitalName": "CareBridge Demo Hospital",
        "doctorName": "Dr. Vivek Iyer",
        "admissionDate": "2026-10-01",
        "dischargeDate": "2026-10-05",
        "rawText": "DISCHARGE SUMMARY\nPatient: Meena Krishnan\nDiagnosis: Osteoarthritis of the right knee...",
        "uploadedAt": "2026-10-08T09:01:00Z"
      }
    }

---

METHOD: GET
PATH: /api/patients/:id/instructions
AUTH: Required / Patient-scoped
PURPOSE: Retrieve verified extracted clinical instructions categorized by medication, activity, restriction, diet, wound care, follow-up, and warning signs
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier
  Query Parameters:
    - type (string, optional): Filter by instruction type
    - status (string, optional): Filter by status
    - verifiedOnly (boolean, default true): Filter to verified instructions
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Verified extracted instructions for patient P001 retrieved successfully",
      "data": {
        "patientId": "P001",
        "totalInstructions": 5,
        "instructions": [
          {
            "_id": "EI001",
            "documentId": "D001",
            "patientId": "P001",
            "type": "medication",
            "name": "Paracetamol",
            "dose": "500 mg",
            "frequency": "twice daily",
            "foodRelation": "after meals",
            "duration": "5 days",
            "sourceSentence": "Take Paracetamol 500 mg twice daily after meals for 5 days.",
            "confidence": 0.96,
            "status": "APPROVED",
            "trust": "HIGH",
            "verifiedSource": true
          }
        ],
        "categories": {
          "medications": [ ... ],
          "activities": [ ... ],
          "restrictions": [ ... ],
          "dietAndHydration": [ ... ],
          "woundCare": [ ... ],
          "followUps": [ ... ],
          "warningSigns": [ ... ],
          "monitoring": [ ... ]
        }
      }
    }

---

METHOD: GET
PATH: /api/patients/:id/discharge-summary
AUTH: Required / Patient-scoped
PURPOSE: Retrieve comprehensive aggregated discharge summary package combining patient recovery data, discharge document, verified instructions, and tasks summary
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient identifier
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Discharge summary package for patient P001 retrieved successfully",
      "data": {
        "patientId": "P001",
        "patientName": "Meena Krishnan",
        "condition": "Post-operative knee recovery",
        "procedure": "Right total knee replacement",
        "recoveryPhase": "Week 1",
        "admissionDate": "2026-10-01",
        "dischargeDate": "2026-10-05",
        "document": { ... },
        "instructionsSummary": {
          "total": 5,
          "medicationsCount": 2,
          "activitiesCount": 2,
          "warningSignsCount": 0,
          "followUpsCount": 1
        },
        "instructions": [ ... ],
        "categories": { ... },
        "tasksSummary": {
          "total": 5,
          "pending": 4,
          "completed": 1
        }
      }
    }
```

---

### Feature 2: Document Endpoints (`/api/documents`)

```text
METHOD: GET
PATH: /api/documents/patient/:patientId
AUTH: Required / Patient-scoped
PURPOSE: Retrieve the discharge document for a specific patient
REQUEST:
  Headers: None
  Params:
    - patientId (string, required): Patient identifier
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Discharge document for patient P001 retrieved successfully",
      "data": {
        "_id": "D001",
        "patientId": "P001",
        "documentType": "discharge_summary",
        "doctorName": "Dr. Vivek Iyer",
        "rawText": "..."
      }
    }

---

METHOD: GET
PATH: /api/documents/:id
AUTH: Required / Patient-scoped
PURPOSE: Retrieve document by document ID with patient isolation verification
REQUEST:
  Headers: None
  Params:
    - id (string, required): Document ID (e.g., "D001")
  Query Parameters:
    - patientId (string, optional): When provided, verifies that the document belongs to this patient; returns 404 if mismatch occurs
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "data": { ... }
    }
  Error Status: 404 Not Found (if document not found or cross-patient check fails)
```

---

### Feature 2: Task Endpoints (`/api/tasks`)

```text
METHOD: GET
PATH: /api/tasks
AUTH: Required / Patient-scoped
PURPOSE: Retrieve tasks for a patient with mandatory patientId parameter for patient isolation
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED): Patient identifier
    - status (string, optional)
    - priority (string, optional)
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Tasks for patient P001 retrieved successfully",
      "data": [ ... ]
    }
  Error Status: 400 Bad Request (if patientId parameter is missing to ensure patient isolation)
```

---

### Feature 3: Medication Reminders Endpoints (`/api/reminders`, `/api/patients/:patientId/reminders`)

```text
METHOD: GET
PATH: /api/reminders
PATH (nested): /api/patients/:patientId/reminders
AUTH: Required / Patient-scoped
PURPOSE: Retrieve medication reminders for a patient
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED if not in URL): Patient identifier
    - status (string, optional): Filter by status ('scheduled', 'reminded', 'taken', 'missed', 'overdue')
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Reminders for patient P001 retrieved successfully",
      "data": [
        {
          "_id": "MR001",
          "patientId": "P001",
          "extractedItemId": "EI001",
          "medicationName": "Paracetamol",
          "dose": "500 mg",
          "scheduledAt": "2026-10-08T08:00:00+05:30",
          "status": "taken",
          "responseType": "taken",
          "confirmationStatus": "confirmed",
          "isConfirmed": true,
          "instructionDetails": {
            "foodRelation": "after meals",
            "frequency": "twice daily",
            "duration": "5 days",
            "sourceSentence": "Take Paracetamol 500 mg twice daily after meals for 5 days."
          }
        }
      ]
    }

---

METHOD: GET
PATH: /api/reminders/:id
PATH (nested): /api/patients/:patientId/reminders/:id
AUTH: Required / Patient-scoped
PURPOSE: Retrieve a specific medication reminder by ID with instruction details
REQUEST:
  Headers: None
  Params:
    - id (string, required): Reminder ID (e.g., "MR001")
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Reminder MR001 retrieved successfully",
      "data": { ... }
    }
  Error Status: 404 Not Found (invalid reminder ID)

---

METHOD: GET
PATH: /api/reminders/:id/status
PATH (nested): /api/patients/:patientId/reminders/:id/status
AUTH: Required / Patient-scoped
PURPOSE: Retrieve current status and confirmation details of a reminder
REQUEST:
  Headers: None
  Params:
    - id (string, required): Reminder ID
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Status for reminder MR001 retrieved successfully",
      "data": {
        "reminderId": "MR001",
        "patientId": "P001",
        "medicationName": "Paracetamol",
        "dose": "500 mg",
        "scheduledAt": "2026-10-08T08:00:00+05:30",
        "status": "taken",
        "responseType": "taken",
        "confirmationStatus": "confirmed",
        "isConfirmed": true,
        "reminderSentAt": "2026-10-08T08:00:00+05:30",
        "respondedAt": "2026-10-08T08:07:00+05:30"
      }
    }

---

METHOD: POST / PATCH
PATH: /api/reminders/:id/confirm
PATH (nested): /api/patients/:patientId/reminders/:id/confirm
AUTH: Required / Patient-scoped
PURPOSE: Confirm or record patient response to a medication reminder
REQUEST:
  Headers: Content-Type: application/json
  Params:
    - id (string, required): Reminder ID
  Body:
    {
      "patientId": "P001",
      "response": "taken", // Allowed: 'taken', 'not_taken', 'dismissed', 'no_response'
      "respondedAt": "2026-10-08T16:00:00+05:30", // optional, defaults to now
      "notes": "optional notes"
    }
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Medication response 'taken' recorded for reminder MR001",
      "data": {
        "_id": "MR001",
        "patientId": "P001",
        "status": "taken",
        "responseType": "taken",
        "confirmationStatus": "confirmed",
        "isConfirmed": true,
        "respondedAt": "2026-10-08T16:00:00+05:30"
      }
    }
  Error Statuses:
    - 400 Bad Request: Invalid response parameter or missing patientId
    - 403 Forbidden: Wrong patient attempting to confirm another patient's reminder
    - 404 Not Found: Invalid/non-existent reminder ID
    - 409 Conflict: Reminder has already been completed and confirmed as taken

---

### Critical Semantic Rule on 'no_response'

When patient response is `no_response`:
- The system represents the medication confirmation status as **`not confirmed`**.
- It **MUST NOT** claim the medication was **`not taken`**.
- An audit event is created in `events` recording `responseType: "no_response"` and `note: "not confirmed"`.

---

### Feature 4: Medication Events & Adherence Endpoints (`/api/events`, `/api/adherence`)

```text
METHOD: GET
PATH: /api/events
PATH (nested): /api/patients/:patientId/events
AUTH: Required / Patient-scoped
PURPOSE: Retrieve audit and clinical events for a patient with patient isolation
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED if not in URL): Patient identifier
    - type (string, optional): Specific event type filter
    - medicationOnly (boolean, optional): Filter for medication events only
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Events for patient P001 retrieved successfully",
      "data": [
        {
          "_id": "E103",
          "patientId": "P001",
          "type": "medication_taken",
          "reminderId": "MR001",
          "payload": {
            "medicationName": "Paracetamol",
            "dose": "500 mg",
            "scheduledAt": "2026-10-08T08:00:00+05:30",
            "responseType": "taken",
            "responseTime": "2026-10-08T08:07:00+05:30"
          },
          "timestamp": "2026-10-08T08:07:00+05:30",
          "actor": "P001"
        }
      ]
    }

---

METHOD: GET
PATH: /api/events/medication
PATH (nested): /api/patients/:patientId/events/medication
AUTH: Required / Patient-scoped
PURPOSE: Retrieve medication-related events ('reminder_sent', 'reminder_opened', 'medication_taken', 'medication_not_taken', 'medication_missed')
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED): Patient identifier
    - type (string, optional)
    - reminderId (string, optional)
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Medication events for patient P001 retrieved successfully",
      "data": [ ... ]
    }

---

METHOD: POST
PATH: /api/events
PATH (nested): /api/patients/:patientId/events
AUTH: Required / Patient-scoped
PURPOSE: Track a new medication event with full traceability to patient, reminder, timestamp, and source
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "patientId": "P001",
      "type": "reminder_opened", // e.g. reminder_sent, reminder_opened, medication_taken, medication_not_taken, medication_missed
      "reminderId": "MR001",
      "source": "patient_mobile_app",
      "actor": "P001",
      "payload": { ... }
    }
RESPONSE:
  Status: 201 Created
  Body:
    {
      "success": true,
      "message": "Event 'reminder_opened' recorded successfully",
      "data": { ... }
    }
  Error Statuses:
    - 400 Bad Request: Missing required event attributes
    - 403 Forbidden: Mismatch between patientId and reminderId
    - 404 Not Found: Patient does not exist

---

METHOD: GET
PATH: /api/adherence
PATH (nested): /api/patients/:patientId/adherence
AUTH: Required / Patient-scoped
PURPOSE: Calculate medication adherence metrics without medical judgment
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED if not in URL): Patient identifier
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Medication adherence for patient P001 calculated successfully",
      "data": {
        "patientId": "P001",
        "total": 5,
        "confirmed": 4,
        "notConfirmed": 1,
        "missed": 0,
        "adherenceRate": 80,
        "byMedication": {
          "Paracetamol": { "total": 3, "confirmed": 2, "notConfirmed": 1, "missed": 0 },
          "Omeprazole": { "total": 2, "confirmed": 2, "notConfirmed": 0, "missed": 0 }
        }
      }
    }
```

---

### Feature 5: Daily Quiz API Endpoints (`/api/quiz`, `/api/quizzes`, `/api/patients/:patientId/quiz`)

```text
METHOD: GET
PATH: /api/quiz/today
PATH (nested): /api/patients/:patientId/quiz/today
AUTH: Required / Patient-scoped
PURPOSE: Retrieve today's daily quiz (exactly 5 questions, API safe with correct answer masked)
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, REQUIRED if not in URL): Patient identifier
    - date (string, optional, defaults to '2026-10-08')
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Today's quiz for patient P001 retrieved successfully",
      "data": {
        "session": {
          "_id": "QS001",
          "patientId": "P001",
          "date": "2026-10-08",
          "status": "in_progress",
          "totalQuestions": 5
        },
        "totalQuestions": 5,
        "isCompleted": false,
        "questions": [
          {
            "_id": "QQ001",
            "quizSessionId": "QS001",
            "question": "When should you take Paracetamol?",
            "options": ["Before breakfast", "After meals", "At bedtime", "Only when in pain"],
            "sourceItemId": "EI001",
            "sourceSentence": "Take Paracetamol 500 mg twice daily after meals for 5 days.",
            "difficulty": "easy"
            // Note: correctAnswer is omitted before submission for API safety
          }
        ]
      }
    }

---

METHOD: POST
PATH: /api/quiz/start
PATH (nested): /api/patients/:patientId/quiz/start
AUTH: Required / Patient-scoped
PURPOSE: Start a new daily quiz session with exactly 5 grounded questions
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "patientId": "P001",
      "date": "2026-10-09"
    }
RESPONSE:
  Status: 201 Created
  Body:
    {
      "success": true,
      "message": "Quiz session started successfully for patient P001",
      "data": {
        "session": { ... },
        "totalQuestions": 5,
        "questions": [ ... ]
      }
    }

---

METHOD: GET
PATH: /api/quiz/sessions/:id/questions
PATH (nested): /api/patients/:patientId/quiz/sessions/:id/questions
AUTH: Required / Patient-scoped
PURPOSE: Retrieve the exactly 5 questions for a session (correct answer masked unless completed)
REQUEST:
  Headers: None
  Params:
    - id (string, required): Quiz session ID
  Body: None
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Questions for quiz session QS001 retrieved successfully",
      "data": {
        "sessionId": "QS001",
        "patientId": "P001",
        "totalQuestions": 5,
        "isCompleted": false,
        "questions": [ ... ]
      }
    }

---

METHOD: POST
PATH: /api/quiz/sessions/:id/submit
PATH (nested): /api/patients/:patientId/quiz/sessions/:id/submit
AUTH: Required / Patient-scoped
PURPOSE: Submit answers, calculate score, record audit event, and return post-submission review with correct answers
REQUEST:
  Headers: Content-Type: application/json
  Params:
    - id (string, required): Quiz session ID
  Body:
    {
      "patientId": "P001",
      "answers": [
        { "questionId": "QQ001", "selectedAnswer": "After meals" },
        { "questionId": "QQ002", "selectedAnswer": "Before breakfast" },
        { "questionId": "QQ003", "selectedAnswer": "Twice daily" },
        { "questionId": "QQ004", "selectedAnswer": "A walker" },
        { "questionId": "QQ005", "selectedAnswer": "After 1 week" }
      ]
    }
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Quiz session QS001 submitted successfully with score 100%",
      "data": {
        "session": {
          "_id": "QS001",
          "patientId": "P001",
          "status": "completed",
          "score": 100,
          "correctAnswers": 5,
          "totalQuestions": 5
        },
        "score": 100,
        "correctAnswers": 5,
        "totalQuestions": 5,
        "review": [
          {
            "questionId": "QQ001",
            "question": "When should you take Paracetamol?",
            "selectedAnswer": "After meals",
            "correctAnswer": "After meals",
            "isCorrect": true,
            "sourceItemId": "EI001",
            "sourceSentence": "Take Paracetamol 500 mg twice daily after meals for 5 days."
          }
        ]
      }
    }
```

---

### Feature 6: Quiz Answer Storage & Scoring

```text
METHOD: POST
PATH: /api/quiz/sessions/:id/answer
PATH (nested): /api/patients/:patientId/quiz/sessions/:id/answer
AUTH: Required / Patient-scoped
PURPOSE: Store an individual quiz answer with strict sequential validation and auto-scoring on completion
REQUEST:
  Headers: Content-Type: application/json
  Params:
    - id (string, required): Quiz session ID
    - patientId (string, optional on flat route, required on nested route)
  Body:
    {
      "patientId": "P001",
      "questionId": "QQ001",
      "selectedAnswer": "After meals"
    }
VALIDATION RULES (in sequential order):
  1. Session exists -> 404 Not Found if missing
  2. Question exists -> 404 Not Found if missing
  3. Question belongs to session -> 400 Bad Request if question.quizSessionId != id
  4. Session belongs to patient -> 403 Forbidden if session.patientId != patientId
  5. Session not completed -> 409 Conflict if session.status == 'completed'
  6. Question not answered twice -> 409 Conflict if answer already recorded
STORED ANSWER SCHEMA:
  - quizSessionId: string
  - questionId: string
  - selectedAnswer: string
  - correct: boolean
  - answeredAt: ISO timestamp string
RESPONSE:
  Status: 200 OK
  Body (in-progress):
    {
      "success": true,
      "message": "Answer recorded successfully for question QQ001",
      "data": {
        "answer": {
          "_id": "QA_QS001_QQ001",
          "quizSessionId": "QS001",
          "questionId": "QQ001",
          "selectedAnswer": "After meals",
          "correct": true,
          "answeredAt": "2026-10-08T11:20:19.594Z"
        },
        "progress": {
          "answeredCount": 1,
          "totalQuestions": 5,
          "isComplete": false
        }
      }
    }
  Body (on 5th question answered - auto-scored):
    {
      "success": true,
      "message": "Answer recorded successfully for question QQ005",
      "data": {
        "answer": { ... },
        "progress": {
          "answeredCount": 5,
          "totalQuestions": 5,
          "isComplete": true
        },
        "scoreResult": {
          "score": 60,
          "correctAnswers": 3,
          "totalQuestions": 5,
          "engagementSignal": "educational_knowledge"
        },
        "session": { ... }
      }
    }

---

METHOD: GET
PATH: /api/quiz/sessions/:id/score
PATH (nested): /api/patients/:patientId/quiz/sessions/:id/score
AUTH: Required / Patient-scoped
PURPOSE: Retrieve educational knowledge and engagement score after all 5 questions are answered
REQUEST:
  Headers: None
  Params:
    - id (string, required): Quiz session ID
    - patientId (string, optional on flat route, required on nested route)
VALIDATION RULES:
  - If quiz session has < 5 answers answered -> 400 Bad Request ("Incomplete Quiz Error")
  - If patientId provided does not match session -> 403 Forbidden
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Educational score for quiz session QS001 retrieved successfully",
      "data": {
        "sessionId": "QS001",
        "patientId": "P001",
        "status": "completed",
        "score": 60,
        "correctAnswers": 3,
        "totalQuestions": 5,
        "engagementSignal": "educational_knowledge",
        "completedAt": "2026-10-08T11:20:19.615Z"
      }
    }
---

### Feature 7: Patient Insights (`/api/insights` & `/api/patients/:id/insight`)

```text
METHOD: GET
PATH: /api/insights/latest?patientId=...
PATH (nested): /api/patients/:id/insight
PATH (nested alias): /api/patients/:id/insights/latest
AUTH: Required / Patient-scoped
PURPOSE: Retrieve the latest grounded patient insight with verified evidence event references and AI disclaimer
REQUEST:
  Headers: None
  Params:
    - id / patientId (string, required): Patient ID
  Query:
    - regenerate (boolean, optional): Set to true to re-synthesize a fresh grounded insight
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Patient insight for P001 retrieved successfully",
      "data": {
        "_id": "PI001",
        "patientId": "P001",
        "quizSessionId": "QS001",
        "score": 80,
        "strengths": [
          "Medication timing",
          "Exercise frequency",
          "Follow-up scheduling"
        ],
        "weaknesses": [
          "Mobility aid awareness"
        ],
        "missedInstructions": [
          "Walk with the assistance of a walker."
        ],
        "aiSummary": "Patient understands medication timing, exercise schedule, and follow-up dates well. However, the patient may not fully recognise the importance of using a walker for mobility. Evening Paracetamol dose was not confirmed. Recommend a brief reinforcement of walker-assisted walking during the next check-in.",
        "priority": "MEDIUM",
        "evidenceEventIds": [
          "E101",
          "E102",
          "E105"
        ],
        "generatedAt": "2026-10-08T13:10:00+05:30",
        "disclaimer": "AI-generated — verify before acting.",
        "aiGenerated": true
      }
    }

---

METHOD: GET
PATH: /api/insights?patientId=...
PATH (nested): /api/patients/:id/insights
AUTH: Required / Patient-scoped
PURPOSE: Retrieve all historical grounded insights for a patient
REQUEST:
  Headers: None
  Params:
    - id / patientId (string, required): Patient ID
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Patient insights for P001 retrieved successfully",
      "data": [
        {
          "_id": "PI001",
          "patientId": "P001",
          "quizSessionId": "QS001",
          "score": 80,
          "strengths": [ ... ],
          "weaknesses": [ ... ],
          "missedInstructions": [ ... ],
          "aiSummary": "...",
          "priority": "MEDIUM",
          "evidenceEventIds": [ "E101", "E102", "E105" ],
          "generatedAt": "2026-10-08T13:10:00+05:30",
          "disclaimer": "AI-generated — verify before acting.",
          "aiGenerated": true
        }
      ]
    }

---

METHOD: GET
PATH: /api/insights/:id
PATH (nested): /api/patients/:patientId/insights/:id
AUTH: Required / Patient-scoped
PURPOSE: Retrieve specific patient insight by its ID with patient isolation
REQUEST:
  Headers: None
  Params:
    - id (string, required): Insight ID (e.g. PI001)
    - patientId (string, optional on flat route, required on nested route)
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Patient insight PI001 retrieved successfully",
      "data": { ... }
    }

---

METHOD: POST
PATH: /api/insights/generate
PATH (nested): /api/patients/:id/insight/generate
AUTH: Required / Patient-scoped
PURPOSE: Dynamically synthesize a fresh insight strictly grounded on patient records
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "patientId": "P001"
    }
RESPONSE:
  Status: 201 Created
  Body:
    {
      "success": true,
      "message": "Fresh patient insight generated successfully for P001",
      "data": { ... }
    }
```

---

### Feature 8: Nurse Dashboard APIs (`/api/nurse/dashboard` & `/api/nurse/patients`)

```text
METHOD: GET
PATH: /api/nurse/dashboard
PATH (alias): /api/nurse/patients
AUTH: Required / Nurse or Clinician role
PURPOSE: Retrieve aggregated nurse dashboard overview across all monitored patients
REQUEST:
  Headers: None
  Query:
    - priority (string, optional): Filter by priority ('HIGH', 'MEDIUM', 'LOW')
    - caregiverId (string, optional): Filter by assigned caregiver
    - recoveryPhase (string, optional): Filter by recovery phase
    - search (string, optional): Search across patient name, ID, surgery, room
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Nurse dashboard retrieved successfully (8 patients)",
      "data": {
        "totalPatients": 8,
        "highPriorityCount": 2,
        "mediumPriorityCount": 4,
        "lowPriorityCount": 2,
        "patients": [
          {
            "patient": {
              "_id": "P003",
              "name": "Lakshmi Devi",
              "age": 47,
              "gender": "Female",
              "condition": "Pneumonia recovery",
              "procedure": "Medical admission and discharge",
              "surgery": "Medical admission and discharge",
              "recoveryPhase": "Week 1",
              "admissionDate": "2026-10-02",
              "dischargeDate": "2026-10-07",
              "mobility": "Independent",
              "caregiverId": "U103"
            },
            "medicationAdherence": {
              "total": 3,
              "confirmed": 2,
              "notConfirmed": 0,
              "missed": 1
            },
            "quizPerformance": {
              "score": 60,
              "correct": 3,
              "total": 5
            },
            "knowledgeGaps": [
              "Antibiotic duration",
              "Warning sign recognition"
            ],
            "flags": [
              "Missed medication",
              "Medication duration knowledge gap",
              "Warning sign knowledge gap"
            ],
            "latestRelevantEvents": [
              {
                "_id": "E118",
                "patientId": "P003",
                "type": "medication_missed",
                "timestamp": "2026-10-08T15:15:00+05:30"
              }
            ],
            "priority": "HIGH",
            "summary": "Patient missed the afternoon Amoxicillin dose and scored only 60% on the recovery quiz. Immediate nurse intervention recommended."
          }
        ]
      }
    }

---

METHOD: GET
PATH: /api/nurse/dashboard/patient/:id
PATH (alias): /api/nurse/dashboard/:id
PATH (alias): /api/nurse/patients/:id
PATH (nested): /api/patients/:id/nurse-dashboard
AUTH: Required / Nurse or Clinician role
PURPOSE: Retrieve single patient detailed dashboard view including nurse brief questions and follow-ups
REQUEST:
  Headers: None
  Params:
    - id (string, required): Patient ID (e.g. P001, P003)
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Nurse dashboard detail for patient P003 retrieved successfully",
      "data": {
        "patient": { ... },
        "medicationAdherence": {
          "total": 3,
          "confirmed": 2,
          "notConfirmed": 0,
          "missed": 1
        },
        "quizPerformance": {
          "score": 60,
          "correct": 3,
          "total": 5
        },
        "knowledgeGaps": [
          "Antibiotic duration",
          "Warning sign recognition"
        ],
        "flags": [
          "Missed medication",
          "Medication duration knowledge gap",
          "Warning sign knowledge gap"
        ],
        "latestRelevantEvents": [ ... ],
        "priority": "HIGH",
        "summary": "...",
        "questionsForNurse": [
          "Confirm reason for missed afternoon Amoxicillin.",
          "Educate on the importance of completing the full 7-day course.",
          "Reinforce warning signs: breathlessness, high fever, confusion, blue lips."
        ],
        "recommendedFollowUp": "Priority nurse call.",
        "brief": { ... },
        "insight": { ... }
      }
    }
```

---

### Feature 9: Nurse AI Summary Endpoints (`/api/nurse/ai-summary` & `/api/patients/:id/nurse-ai-summary`)

```text
METHOD: GET
PATH: /api/nurse/ai-summary/:patientId
PATH (alias): /api/nurse/ai-summary?patientId=:patientId
PATH (alias): /api/nurse/patients/:id/ai-summary
PATH (alias): /api/nurse/patients/:id/summary
PATH (alias): /api/nurse/dashboard/:id/ai-summary
PATH (nested): /api/patients/:id/nurse-ai-summary
AUTH: Required / Nurse or Clinician role
PURPOSE: Retrieve Nurse AI Summary combining 7 data sources:
         1. Medication adherence
         2. Medication events
         3. Quiz performance
         4. Quiz answers
         5. Knowledge gaps
         6. Verified discharge instructions
         7. Relevant escalations
REQUEST:
  Headers: None
  Params:
    - patientId / id (string, required): Patient ID (e.g. P001, P003)
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Nurse AI Summary for patient P001 retrieved successfully",
      "data": {
        "_id": "NB006",
        "patientId": "P001",
        "priority": "MEDIUM",
        "medicationAdherence": {
          "total": 3,
          "confirmed": 2,
          "notConfirmed": 1,
          "missed": 0
        },
        "quizPerformance": {
          "score": 80,
          "correct": 4,
          "total": 5
        },
        "flags": [
          "Medication not confirmed",
          "Mobility aid knowledge gap"
        ],
        "knowledgeGaps": [
          "Mobility aid usage"
        ],
        "questionsForNurse": [
          "Confirm whether evening Paracetamol was taken.",
          "Reinforce the importance of using a walker."
        ],
        "recommendedFollowUp": "Routine nurse review.",
        "aiSummary": "Patient confirmed 2 of 3 medications and scored 80% in today's recovery quiz. The patient may need reinforcement of walker-assisted walking instructions. Evening Paracetamol was not confirmed.",
        "summary": "Patient confirmed 2 of 3 medications and scored 80% in today's recovery quiz. The patient may need reinforcement of walker-assisted walking instructions. Evening Paracetamol was not confirmed.",
        "evidenceEventIds": [
          "E101",
          "E105",
          "E107"
        ],
        "evidence": {
          "medicationEvents": [ ... ],
          "quizAnswers": [ ... ],
          "verifiedInstructions": [ ... ],
          "escalations": [ ... ],
          "traces": [
            {
              "claim": "Medication not confirmed",
              "sourceType": "medication_event",
              "sourceId": "E107",
              "details": "Event E107 (medication_not_taken) recorded at 2026-10-08T18:00:00+05:30"
            },
            {
              "claim": "Knowledge gap: Which mobility aid should you use?",
              "sourceType": "quiz_answer",
              "sourceId": "QQ004",
              "sourceItemId": "EI005",
              "sourceSentence": "Use walker when walking."
            }
          ]
        },
        "aiGenerated": true,
        "disclaimer": "AI-generated — verify before acting.",
        "generatedAt": "2026-10-08T13:10:00+05:30"
      }
    }

---

METHOD: POST
PATH: /api/nurse/ai-summary/generate
PATH (alias): /api/nurse/patients/:id/ai-summary/generate
PATH (nested): /api/patients/:id/nurse-ai-summary/generate
AUTH: Required / Nurse or Clinician role
PURPOSE: Dynamically synthesize a fresh grounded Nurse AI Summary strictly verified against safety boundaries
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "patientId": "P001"
    }
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Nurse AI Summary for patient P001 generated successfully",
      "data": { ... }
    }
```

---

### Feature 10: Escalations Endpoints (`/api/escalations` & `/api/patients/:id/escalations`)

```text
METHOD: GET
PATH: /api/escalations
PATH (alias): /api/nurse/escalations
AUTH: Required / Nurse or Caregiver
PURPOSE: Retrieve all escalations with optional filtering by patientId, category, status, priority
REQUEST:
  Headers: None
  Query Parameters:
    - patientId (string, optional)
    - category (string, optional): Filter by category
    - status (string, optional): Filter by status ('OPEN', 'IN_REVIEW', 'RESOLVED')
    - priority (string, optional): Filter by priority ('LOW', 'MEDIUM', 'HIGH')
RESPONSE:
  Status: 200 OK
  Body:
    {
      "success": true,
      "message": "Retrieved 5 escalation(s) successfully",
      "data": [
        {
          "_id": "ESC001",
          "patientId": "P003",
          "patient": {
            "_id": "P003",
            "name": "Lakshmi Devi",
            "age": 47,
            "condition": "Pneumonia recovery"
          },
          "category": "warning_sign",
          "description": "Patient reported increased breathing difficulty / warning sign context",
          "reason": "Patient reported increased breathing difficulty / warning sign context",
          "timestamp": "2026-10-08T13:10:00+05:30",
          "status": "OPEN",
          "priority": "HIGH",
          "severity": "HIGH",
          "relatedEvent": {
            "_id": "E003",
            "type": "task_snoozed"
          },
          "evidence": [
            "increased breathlessness",
            "pain level 7"
          ]
        }
      ]
    }

---

METHOD: GET
PATH: /api/escalations/:id
AUTH: Required
PURPOSE: Retrieve a specific escalation by ID
REQUEST:
  Headers: None
  Params:
    - id (string, required): Escalation ID (e.g. ESC001)
RESPONSE:
  Status: 200 OK

---

METHOD: GET
PATH: /api/escalations/patient/:patientId
PATH (nested): /api/patients/:patientId/escalations
AUTH: Required / Scoped to patient
PURPOSE: Retrieve all escalations belonging strictly to a specific patient

---

METHOD: POST
PATH: /api/escalations
PATH (nested): /api/patients/:patientId/escalations
AUTH: Required
PURPOSE: Create a new escalation grounded in actual patient data
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "patientId": "P001",
      "category": "missed_medication", // Supported: warning_sign, missed_medication, missing_information, overdue_task, medication_question, repeated_missed_medication, low_quiz_score, knowledge_gap
      "description": "Patient missed scheduled dose of Paracetamol.",
      "priority": "MEDIUM", // Allowed: LOW, MEDIUM, HIGH (emergency classifications prohibited)
      "relatedEventId": "E107" // Must strictly belong to the patient
    }
RESPONSE:
  Status: 201 Created

---

METHOD: PATCH / PUT
PATH: /api/escalations/:id
AUTH: Required
PURPOSE: Update escalation status or resolution
REQUEST:
  Headers: Content-Type: application/json
  Body:
    {
      "status": "RESOLVED",
      "resolution": "Nurse contacted patient to verify current breathing status."
    }
RESPONSE:
  Status: 200 OK

---

METHOD: POST
PATH: /api/escalations/evaluate/:patientId
PATH (nested): /api/patients/:patientId/escalations/evaluate
AUTH: Required
PURPOSE: Automatically evaluate patient records (events, reminders, quiz answers) to detect and record grounded escalations
RESPONSE:
  Status: 200 OK
```

---

## 3. Strict Patient Isolation & Semantic Guarantees

1. **Mandatory Patient Scoping**: Every query requires `patientId` either as a route path parameter (`/api/patients/:id/*`, `/api/documents/patient/:patientId`) or as a mandatory query parameter (`/api/tasks?patientId=...`, `/api/reminders?patientId=...`, `/api/events?patientId=...`, `/api/adherence?patientId=...`, `/api/quiz/today?patientId=...`, `/api/insights?patientId=...`, `/api/nurse/ai-summary?patientId=...`, `/api/escalations/patient/:patientId`).
2. **Existence Verification**: Queries against invalid or non-existent patient IDs (e.g. `P999`) return `404 Not Found`.
3. **Zero Cross-Patient Leakage**: Tasks, documents, extracted instructions, reminders, events, adherence counts, quiz data, patient insights, nurse dashboard cards, nurse AI summaries, and escalations are strictly isolated. Confirmations, event logs, answer submissions, score queries, or insight lookups with mismatched IDs are blocked with `403 Forbidden` or `400 Bad Request`.
4. **Critical Quiz Session Invariant**: Every quiz session strictly enforces `totalQuestions === 5`. Sessions with 4 questions, 6 questions, or duplicate questions are rejected with `400 Bad Request`.
5. **API Safety Guarantee**: `correctAnswer` is strictly stripped and hidden from the patient prior to quiz submission or completion.
6. **Feature 6 Semantic Rule (Educational Signal)**: The quiz score is strictly an **educational knowledge and engagement signal**. It must **NEVER** be termed a clinical score, medical risk score, or diagnosis.
7. **Answer Storage & Integrity**: Answers store `quizSessionId`, `questionId`, `selectedAnswer`, `correct`, and `answeredAt`. Duplicate answers for the same question within a session or answers after session completion are rejected with `409 Conflict`.
8. **Feature 7 Grounding & Evidence Integrity**: Every patient insight is strictly grounded on the patient's own quiz answers, verified discharge instructions (`extractedItems`), and medication events (`events`). Every ID in `evidenceEventIds` is validated to ensure it exists and belongs strictly to the requested patient.
9. **Feature 7 AI Boundary Safety**: Insights must **NEVER**:
   - diagnose
   - prescribe
   - change medication
   - recommend dosage changes
   All summaries are validated against these strict clinical boundary rules.
10. **Feature 7 Frontend Disclaimer**: Insights supply the mandatory safety disclaimer: `disclaimer: "AI-generated — verify before acting."` with `aiGenerated: true`.
11. **Feature 8 Nurse Dashboard Association Guarantee**: For each patient card, `patient`, `medicationAdherence` (`{ total, confirmed, notConfirmed, missed }`), `quizPerformance` (`{ score, correct, total: 5 }`), `knowledgeGaps`, `flags`, and `latestRelevantEvents` are strictly derived from and associated with that specific patient's data. Cross-patient data mixing is prohibited and verified.
12. **Feature 9 Nurse AI Summary Multi-Source & Traceability Guarantee**: The Nurse AI Summary strictly synthesizes 7 distinct sources (medication adherence, medication events, quiz performance, quiz answers, knowledge gaps, verified instructions, escalations). Every claim is traceable through `evidenceEventIds` and `evidence.traces` (linking unconfirmed/missed meds to events, low quiz performance to quiz answers, and knowledge gaps to questions and verified instructions).
13. **Feature 9 Clinical AI Safety Boundaries**: Nurse AI summaries strictly enforce that generated text must **NEVER** contain:
    - Diagnosis
    - Prescription
    - Dosage changes (e.g., increase/decrease dose)
    - Treatment plans or medication discontinuation
    All summaries strictly feature the mandatory disclaimer: `"AI-generated — verify before acting."`.
14. **Feature 10 Category Preservation & Expansion**: All pre-existing escalation categories (`warning_sign`, `missed_medication`, `missing_information`, `overdue_task`, `medication_question`) are strictly preserved alongside newer categories (`repeated_missed_medication`, `low_quiz_score`, `knowledge_gap`).
15. **Feature 10 Escalation Grounding & Non-Clinical Severity**: Every escalation must be strictly traceable to actual patient records (events, reminders, quiz scores, knowledge gaps). Escalations must **NEVER** turn a missed medication into a diagnosis, nor invent arbitrary clinical emergency classifications (e.g., `EMERGENCY`, `CRITICAL CARE`, `CODE BLUE` are rejected with `400 Bad Request`). Only supported priorities (`LOW`, `MEDIUM`, `HIGH`) are permitted.
16. **Frontend Integration & Compatibility Endpoints**:
    - `client/vite.config.js`: Reverse proxy configured on port 3000 mapping `/api` to Express backend on `http://localhost:5000` with `changeOrigin: true`.
    - `GET /api/nurse/dashboard-overview`: Cohort summary metrics for nurse dashboard stats cards (`totalPatients`, `activeEscalations`, `medAdherenceRate`, `avgQuizScore`).
    - `GET /api/nurse/alerts`: Direct alias to escalation list filtered for clinical nurse dashboard view.
    - `GET /api/patients/:patientId/medication-reminders`: Compatible alias to `/api/patients/:patientId/reminders`.
    - `POST /api/patients/:patientId/medication-reminders/:id/confirm`: Compatible alias to `/api/reminders/:id/confirm`.
    - `GET /api/patients/:patientId/quiz-session`: Direct alias returning today's daily quiz with exactly 5 questions.
    - `POST /api/quiz-sessions/:id/submit`: Top-level mount supporting quiz answer evaluation and educational knowledge scoring.
    - Envelope unwrapping: All frontend service adapters (`insightService`, `medicationService`, `nurseService`, `patientService`, `quizService`) seamlessly unpack `{ success: true, data: ... }` response payloads while preserving robust mock fallback when backend is offline.
17. **Feature 11 Caregiver & Family Member Portal API Contract**:
    - `GET /api/caregiver/patients?caregiverId=...`: Returns linked patients, familial relationship (e.g., Mother, Father), condition, and quick recovery status.
    - `GET /api/caregiver/patients/:patientId/daily-report`: Executive loved-one daily report compiling recovery day, traffic-light status (`GREEN`/`YELLOW`/`RED`), executive AI digest in empathetic family-friendly language, family action tips, medication checklist, care tasks, vitals check-in snapshot, and safety warning signs.
    - `GET /api/caregiver/patients/:patientId/calendar?year=...&month=...`: 30-day recovery calendar providing daily recovery score, dose counts, milestones, and scheduled appointments.
    - `GET /api/caregiver/patients/:patientId/feedback`: Feed of patient feedback entries (symptoms, pain ratings, personal comments) awaiting or marked reviewed.
    - `POST /api/caregiver/patients/:patientId/feedback/:feedbackId/review`: Caregiver acknowledgment endpoint updating status to `reviewed`, storing caregiver note, reviewer timestamp, and audit event.
    - `POST /api/caregiver/patients/:patientId/encouragement`: Endpoint to submit family encouragement notes with emotional support tags (`love`, `strength`, `celebration`).
    - **Family AI Safety & Tone Guarantee**: The caregiver digest and action tips use empathetic, plain-language guidance and strictly never generate clinical diagnoses, prescriptions, or dosage modifications. Every summary includes the explicit informational disclaimer: `"AI-generated family digest — for informational support only. Consult attending physician for medical decisions."`.


