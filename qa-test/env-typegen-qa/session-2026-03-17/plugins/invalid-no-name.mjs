// Invalid plugin: missing 'name' field required by the plugin interface
export default {
  transformSource({ environment, values }) {
    return values;
  },
};
