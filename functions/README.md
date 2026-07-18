# WordPilot v9 Firebase Functions

Secure callable endpoints:
- `aiHealth` — checks whether the bound secret is ready without exposing it.
- `aiCoach` — Conversation Coach 4.0.
- `sentencePractice` — creates three natural, target-validated practice sentences.
- `transcribeAudio` — authenticated speech transcription.
- `getContentPack` — optional protected content delivery.
- `generateLanguageDraftBatch` — admin-only, private translation drafts (max 20 rows).

Never place `OPENAI_API_KEY` in JavaScript, GitHub, `.env`, screenshots or chat.
Set it with Firebase CLI Secret Manager and deploy the functions.
