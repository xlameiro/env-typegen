/** @type {import("@xlameiro/env-typegen").EnvContract} */
const legacy = {
  vars: [
    {
      name: "DATABASE_URL",
      expectedType: "url",
      required: true,
      runtime: "server",
      description: "Legacy DB URL",
    },
    {
      name: "PORT",
      expectedType: "number",
      required: true,
      constraints: { min: 1, max: 65535 },
      runtime: "server",
    },
  ],
};

export default legacy;
