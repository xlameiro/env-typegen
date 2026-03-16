/**
 * Anti-FOUC (Flash of Unstyled Content) script injected as an inline <script>
 * in app/layout.tsx before React hydration.
 *
 * Reads the Zustand store from localStorage and applies the `dark` class to
 * <html> immediately, preventing a flash of the wrong theme for users who have
 * selected dark mode or system-dark via ThemeToggle.
 *
 * Handles three cases:
 *  - theme === 'dark'   → always add html.dark
 *  - theme === 'system' → add html.dark only when OS prefers dark
 *  - (no preference)    → fall back to OS preference
 *
 * proxy.ts is a passthrough stub in this project — no CSP hash is required.
 */
export const ANTI_FOUC_SCRIPT = `try{var s=localStorage.getItem('app-store');var t=s&&JSON.parse(s).state?.theme;if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;
