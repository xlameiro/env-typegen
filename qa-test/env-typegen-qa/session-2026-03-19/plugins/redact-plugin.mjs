export default {
  name: "redact-plugin",
  transformSource(input) {
    const values = { ...input.values };
    for (const key of Object.keys(values)) {
      if (key.includes("SECRET") || key.includes("TOKEN")) {
        values[key] = "[REDACTED]";
      }
    }
    return values;
  },
};
