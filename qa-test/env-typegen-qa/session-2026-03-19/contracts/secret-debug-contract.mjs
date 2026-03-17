/** @type {import("@xlameiro/env-typegen").EnvContract} */
const contract = {
  schemaVersion: 1,
  variables: {
    NEXT_PUBLIC_CLIENT_SECRET: {
      expected: { type: "string" },
      required: true,
      clientSide: true,
      secret: true,
    },
  },
};

export default contract;
