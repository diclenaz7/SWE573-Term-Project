const ENVS = {
  LOCAL: "local",
  DEVELOPMENT: "development",
  STAGE: "stage",
  PRODUCTION: "production",
};

export const ENV = ENVS.PRODUCTION;
export const BASE_URL =
  ENV === ENVS.PRODUCTION
    ? "https://django-app-494208442673.europe-west1.run.app"
    : "http://localhost:8000";
