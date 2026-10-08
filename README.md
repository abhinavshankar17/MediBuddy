# CareBridge Synthetic Demo Dataset

Synthetic data only. NOT for clinical use.

## Collections
- users.json
- patients.json
- documents.json
- extractedItems.json
- tasks.json
- events.json
- checkIns.json
- teachBacks.json
- escalations.json
- dayColors.json
- nurseBriefs.json
- providers.json
- auditLogs.json
- agentTraces.json

## Source documents
summaries/patient001.txt ... patient008.txt

## Ground truth
ground_truth/patient001.json ... patient008.json

## Intentional edge cases
- P002: medication instruction with missing dose / low confidence
- P003: warning-sign escalation
- P005: missed medication / high-priority nurse review
- P008: treatment question + teach-back reinforcement

All names, providers, credentials, phone numbers, and clinical instructions are fictional demo data.
