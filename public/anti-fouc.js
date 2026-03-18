try {
  const persistedStore = globalThis.localStorage.getItem("app-store");
  const parsedStore =
    persistedStore === null ? null : JSON.parse(persistedStore);
  const selectedTheme = parsedStore?.state?.theme;
  const prefersDark = globalThis.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const shouldUseDarkTheme =
    selectedTheme === "dark" ||
    ((selectedTheme === undefined || selectedTheme === "system") && prefersDark);

  if (shouldUseDarkTheme) {
    document.documentElement.classList.add("dark");
  }
} catch (error) {
  console.warn("Failed to initialize anti-FOUC theme script.", error);
}
