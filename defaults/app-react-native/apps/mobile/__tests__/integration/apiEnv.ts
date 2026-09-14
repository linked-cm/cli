// Shared by globalSetup, globalTeardown and the tests: where the test API and Fuseki live.
export const API_PORT = 4100;
export const API_URL = `http://localhost:${API_PORT}`;
export const FUSEKI_DATASET = 'app-test';
export const FUSEKI_BASE_URL = (
  process.env.FUSEKI_BASE_URL || `http://localhost:${process.env.FUSEKI_PORT || '3030'}`
).replace(/\/$/, '');
