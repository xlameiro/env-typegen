export default {
  schemaVersion: 1,
  variables: {
    NODE_ENV: {
      expected: { type: "string" },
      required: true,
      clientSide: false,
    },
    PORT: { expected: { type: "number" }, required: true, clientSide: false },
    APP_URL: { expected: { type: "url" }, required: true, clientSide: false },
    DATABASE_URL: {
      expected: { type: "url" },
      required: true,
      clientSide: false,
    },
    DATABASE_READONLY_URL: {
      expected: { type: "url" },
      required: true,
      clientSide: false,
    },
    AUTH_SECRET: {
      expected: { type: "string" },
      required: true,
      clientSide: false,
    },
    JWT_EXPIRY_SECONDS: {
      expected: { type: "number" },
      required: true,
      clientSide: false,
    },
    ENABLE_BETA_FEATURES: {
      expected: { type: "boolean" },
      required: true,
      clientSide: false,
    },
    MAX_UPLOAD_SIZE: {
      expected: { type: "number" },
      required: true,
      clientSide: false,
    },
    ALLOWED_ORIGINS: {
      expected: { type: "string" },
      required: true,
      clientSide: false,
    },
  },
};
