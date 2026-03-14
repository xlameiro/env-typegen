/**
 * Anti-FOUC (Flash of Unstyled Content) script injected as an inline <script>
 * in app/layout.tsx before React hydration.
 *
 * Reads the Zustand store from localStorage and applies the `dark` class to
 * <html> immediately, preventing a flash of the light theme for users who have
 * manually selected dark mode via ThemeToggle.
 *
 * The script content is static — its SHA-256 hash is allow-listed in
 * `proxy.ts` script-src CSP, so no per-request nonce is required here.
 *
 * IMPORTANT: If you modify this script, you MUST also update the SHA-256 hash
 * in proxy.ts. Compute the new hash with:
 *   echo -n "<new-script-content>" | openssl dgst -sha256 -binary | base64
 *
 * The unit test `lib/anti-fouc-script.test.ts` will fail if the hash is stale.
 */
export const ANTI_FOUC_SCRIPT = `try{var s=localStorage.getItem('app-store');if(s&&JSON.parse(s).state?.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;
