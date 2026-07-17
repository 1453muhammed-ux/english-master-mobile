WORDPILOT v7.1.2 — COMMERCIAL CLEAN ALPHA

Test URL:
https://wordpilot-7a574.web.app/?wpbuild=7.1.2

This package is the commercial-clean development branch. V7.0 remains a separate private legacy archive.

MAIN CHANGES
- Native language and interface language are one setting and support 12 languages.
- Target-language choice persists and becomes the selected course on the home screen.
- Changing the home course also updates the saved target route.
- The home screen, learning centre, course routing and feedback interface are localised in English, Turkish, Russian, Uzbek, Spanish, German, French, Italian, Portuguese, Japanese, Korean and Chinese.
- Specialised legacy tools may still fall back to English during Alpha when a translation is missing.
- Clean connected concept graph expanded from 120 to 1000 entries.
- Russian expanded to 1500 entries; Uzbek expanded to 1000 entries.
- Spanish is active with the 1000-concept core and Conversation Coach scenarios.
- Internal SHA-256, content-origin and proprietary-license metadata is not displayed in learner Notes. Audit metadata remains in internal JSON fields.
- Complete 12-language flag styles were added.
- Target-language routing now wins over stale cloud course state, and the word cache is separated by target/support language.
- A signed-in Feedback & Ideas form writes constrained submissions to the Firestore feedback collection.

EDITORIAL STATUS
- The original first 120 clean concepts retain their polished review status.
- The additional 880 aligned concepts use an MIT-licensed lexical seed and are marked lexical-review-required. They must receive human language review before Demo 1.0.
- Expanded Russian and Uzbek rows also require final editorial review before public commercial launch.

PRESERVED
Firebase authentication and sync, App Check configuration, XP, leagues, profile, PWA/offline support and the wordpilot_v34 progress key are preserved.

STATUS
Commercial Clean Alpha — not yet Demo 1.0.
