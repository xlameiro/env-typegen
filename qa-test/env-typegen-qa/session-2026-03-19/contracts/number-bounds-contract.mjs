/** @type {import("@xlameiro/env-typegen").EnvContract} */
const contract = {
  schemaVersion: 1,
  variables: {
    PORT: {
      expected: { type: "number", min: 1, max: 65535 },
      required: true,
      clientSide: false,
    },
  },
};

export default contract;
