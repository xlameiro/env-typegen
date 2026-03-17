export default {
  name: "contract-plugin",
  transformContract(contract) {
    return {
      ...contract,
      variables: {
        ...contract.variables,
        PLUGIN_REQUIRED: {
          expected: { type: "string" },
          required: true,
          clientSide: false,
        },
      },
    };
  },
};
