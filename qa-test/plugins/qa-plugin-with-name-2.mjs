/** @type {import('@xlameiro/env-typegen').EnvTypegenPlugin} */
const plugin = {
  name: "qa-plugin-2",
  transformSource(input) {
    return { ...input.values };
  },
};

export default plugin;
