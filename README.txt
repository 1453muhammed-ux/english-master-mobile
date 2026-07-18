WORDPILOT v8.3.0 — TESTER BETA

MAIN CHANGES
- Conversation Coach 4.0 with Mira
- 10 structured real-life speaking scenarios
- Scenario goals, mission progress, useful phrases and session reports
- Smoothed grammar, clarity and fluency scoring
- Female system-voice preference for coach replies when available
- Word, sentence and scenario pronunciation modes
- Transcript-based pronunciation accuracy, completion, fluency and
  recognition-confidence metrics
- 2000 unique English vocabulary records
- A1–C2 Academy and Reader 2.0 enabled

IMPORTANT AI NOTE
The GitHub/Hosting build works in structured local scenario mode. Generative
cloud AI is intentionally disabled by default. Enabling it requires deploying
the included Firebase Functions, adding OPENAI_API_KEY through Secret Manager
and changing aiEnabled only after usage limits and billing are reviewed.
No private API key belongs in frontend files.

IMPORTANT EDITORIAL NOTE
The first 1000 English records are the reviewed core. Records 1001–2000 are
a beta, auto-enriched expansion and still require human editorial review of
Turkish glosses, CEFR estimates and pronunciations before a final commercial
release.

CACHE
Open the deployment once with ?wpbuild=8.3.0. The service-worker cache is
versioned as wordpilot-v8.3.0. Existing user progress is preserved.
