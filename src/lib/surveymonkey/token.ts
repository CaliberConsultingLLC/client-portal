export function getSurveyMonkeyToken() {
  return process.env.SURVEYMONKEY_ACCESS_TOKEN ?? process.env.SURVEYMONKEY_TOKEN ?? "";
}

export function requireSurveyMonkeyToken() {
  const token = getSurveyMonkeyToken();

  if (!token) {
    throw new Error(
      "Missing SurveyMonkey API token. Set SURVEYMONKEY_ACCESS_TOKEN (or SURVEYMONKEY_TOKEN) in the environment."
    );
  }

  return token;
}
