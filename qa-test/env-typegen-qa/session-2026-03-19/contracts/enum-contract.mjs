/** @type {import("@xlameiro/env-typegen").EnvContract} */
const contract = {
  schemaVersion: 1,
  variables: {
    APP_MODE: {
      expected: { type: "enum", values: ["dev", "staging", "prod"] },
      required: true,
      clientSide: false,
    },
  },
};

export default contract;
