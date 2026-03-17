/** @type {import('@xlameiro/env-typegen').EnvTypegenPlugin} */
const plugin = {
  name: 'qa-plugin',
  transformSource(input) {
    return { ...input.values };
  },
};
export default plugin;
