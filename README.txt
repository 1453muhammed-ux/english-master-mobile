WORDPILOT v8.0.0 — CONVERSATION COACH 3.0 TESTER BETA

Test address after Hosting deployment:
https://wordpilot-7a574.web.app/?wpbuild=8.0.0

PURPOSE
This package is a limited tester build for the commercial-clean WordPilot branch. V7.0 remains a separate private legacy archive. V8.0 is not Demo 1.0 and is not yet a public commercial release.

V8.0 HIGHLIGHTS
- Conversation Coach 3.0 is the primary development focus.
- Voice input waits 5 seconds by default after the last detected speech segment. Testers may select 3, 5 or 8 seconds.
- The browser speech recogniser is restarted when it ends unexpectedly, reducing premature microphone closure.
- Coach speech defaults to 0.72x and may be changed from very slow to normal/fast.
- Spoken responses are not penalised merely for missing capitalisation or punctuation.
- Feedback shows corrected sentence, reason, natural alternative, grammar, clarity and fluency scores.
- Local follow-up questions use recent conversation context and avoid recent repeats.
- Language route dialog has a close button and one-tap native/target language swap.
- Language changes apply without reloading the page.
- League scores are course-specific. Old global XP is never reused as the score of every language.
- A leaderboard language tab reads only that language's coursePoints value.
- Users whose old cloud row has no course-specific data show 0 with a migration note until that account opens and syncs V8 once.

LANGUAGE AND CONTENT CORE
- 12 language routes: English, Turkish, Russian, Uzbek, Spanish, German, French, Italian, Portuguese, Japanese, Korean and Chinese.
- 1000 connected clean concepts.
- 1500 Russian controlled entries.
- 1000 Uzbek controlled entries.
- Existing Firebase Authentication, App Check, profile, progress, PWA/offline and wordpilot_v34 keys are preserved.

IMPORTANT TESTER LIMITS
- security-config.js keeps aiEnabled:false and voiceTranscriptionEnabled:false.
- Therefore the tester build uses the improved local Conversation Coach 3.0 engine by default.
- The Cloud Functions package contains the advanced AI Coach 3.0 prompt and transcription endpoint, but those functions are not live until separately configured and deployed.
- Web Speech Recognition behaviour can vary by Chrome version, operating system and microphone quality.
- Additional clean-core language rows still require human editorial review before Demo 1.0.

STATUS
Commercial Clean Tester Beta — not Demo 1.0.
