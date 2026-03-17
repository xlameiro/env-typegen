// Use default import from picocolors — it is a CJS-only module.
// Named ESM imports (`import { green } from "picocolors"`) resolve in the
// bundled CLI build (noExternal inlines it), but fail at runtime in the
// unbundled library build (dist/index.js) because Node.js cannot find named
// exports on a CJS module.  Default import + destructuring works in both.
import pc from "picocolors";
const { green, red, yellow } = pc;

/** Prints a plain informational message to stdout. */
export function log(message: string): void {
  console.log(message);
}

/** Prints a yellow ⚠ warning message to stderr. */
export function warn(message: string): void {
  console.warn(yellow(`⚠ ${message}`));
}

/** Prints a red ✖ error message to stderr. */
export function error(message: string): void {
  console.error(red(`✖ ${message}`));
}

/** Prints a green ✔ success message to stdout. */
export function success(message: string): void {
  console.log(green(`✔ ${message}`));
}
