WORDPILOT v8.1.0 — CONVERSATION COACH 3.1 TESTER BETA

Deployment test address:
https://wordpilot-7a574.web.app/?wpbuild=8.1.0

STATUS
Commercial-clean Tester Beta. This package is not Demo 1.0 and is not yet a public commercial release.

WHAT CHANGED IN v8.1
- English bank: 2000 learning cards.
  - 1000 reviewed word cards.
  - 1000 original WordPilot context/pattern cards linked to the base words.
- Pronunciation is present on all 2000 cards.
- Synonym and antonym fields are present on all base words. Real quiz links are used only where a direct reviewed relation exists; “no direct relation” is shown otherwise.
- Old Google Drive study-PDF links were removed from the commercial-clean branch.
- The Turkish flag now uses a consistent local SVG instead of an operating-system emoji.
- Games have an always-visible quick-start area.
- SM-2 wording was simplified to “Kişisel Tekrar Planı”.
- Correct answers can be moved to “Ezberledim” in one action after a session. Mastered cards are excluded from normal quiz pools and can be returned with “Zorlandım”.
- Difficult, very-difficult, unmarked and due-review cards are prioritised.
- Large historical points are migrated once to a smaller Pilot Points (PP) scale.
- Conversation Coach 3.1 prioritises natural female voices, uses a calmer default rate, allows more thinking time and applies gentler evaluation differences.
- Mira, the Coach robot, was added.
- Google, Microsoft/Hotmail and email/password account interfaces were added. Local email-free guest mode remains available.
- Privacy, terms, copyright and data-deletion information is available in legal.html.

IMPORTANT CONTENT NOTE
“2000 learning cards” does not mean 2000 unique headwords. The bank contains 1000 unique reviewed headword cards plus 1000 original context/pattern cards. No third-party vocabulary list was imported for the additional 1000 cards.

AUTHENTICATION SETUP
The UI is ready, but Firebase Console configuration is still required before email/password and Microsoft/Hotmail can work in production. Follow V8_1_AUTH_SETUP.txt.

SECURITY LIMITS
- security-config.js keeps paid cloud AI and cloud voice transcription disabled by default.
- API keys must never be placed in browser code.
- Protected paid content should later be delivered through authenticated server functions with App Check, quotas and rate limiting.
- Static HTML, CSS, JavaScript and JSON sent to the browser cannot be made completely invisible.

DEPLOYMENT
1. Review V8_1_AUTH_SETUP.txt and SECURITY_SETUP.txt.
2. Enable required Firebase Authentication providers.
3. Deploy Firestore rules:
   firebase deploy --only firestore:rules
4. Deploy Hosting:
   firebase deploy --only hosting
5. Open the test URL once with ?wpbuild=8.1.0, then refresh after the service worker updates.
6. Test with a new account and an existing v8.0 account.

FILES TO REVIEW
- V8_1_RELEASE_NOTES.txt
- V8_1_TESTER_GUIDE.txt
- V8_1_AUTH_SETUP.txt
- legal.html
- CONTENT_RIGHTS_POLICY.txt
- THIRD_PARTY_LICENSES.txt
- SECURITY_SETUP.txt
