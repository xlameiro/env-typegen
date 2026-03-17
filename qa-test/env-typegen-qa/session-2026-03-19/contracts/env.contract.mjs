/** @type {import("@xlameiro/env-typegen").EnvContract} */
const contract = {
  schemaVersion: 1,
  variables: {
    SERVICE_URL: {
      expected: { type: "url" },
      required: true,
      clientSide: false,
    },
    PORT: { expected: { type: "number" }, required: true, clientSide: false },
    ENABLE_ANALYTICS: {
      expected: { type: "boolean" },
      required: true,
      clientSide: false,
    },
    NODE_ENV: {
      expected: {
        type: "enum",
        values: ["development", "staging", "production"],
      },
      required: true,
      clientSide: false,
    },
    CONTACT_EMAIL: {
      expected: { type: "email" },
      required: false,
      clientSide: false,
    },
    FEATURE_FLAGS: {
      expected: { type: "json" },
      required: false,
      clientSide: false,
    },
    APP_VERSION: {
      expected: { type: "semver" },
      required: false,
      clientSide: false,
    },
    SECRET_TOKEN: {
      expected: { type: "string" },
      required: true,
      clientSide: false,
      secret: true,
    },
  },
};

export default contract;
