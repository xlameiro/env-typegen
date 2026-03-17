// Plugin: mask-secrets
// Masks values of variables that contain SECRET, PASSWORD, TOKEN, or KEY in their name.
// Used to test plugin loading and transformSource hook.
export default {
  name: "mask-secrets",
  transformSource({ environment, values }) {
    const masked = { ...values };
    for (const key of Object.keys(masked)) {
      if (/SECRET|PASSWORD|TOKEN|KEY/i.test(key)) {
        masked[key] = "[MASKED]";
      }
    }
    return masked;
  },
};
