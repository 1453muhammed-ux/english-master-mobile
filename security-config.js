/* WordPilot security switches. Public reCAPTCHA site keys may safely live in frontend code.
   Never put OpenAI or any private API key in this file. */
window.WORDPILOT_SECURITY={
  appCheckSiteKey:'',
  aiEnabled:false,
  protectedContentEnabled:false,
  aiRegion:'us-central1'
};
