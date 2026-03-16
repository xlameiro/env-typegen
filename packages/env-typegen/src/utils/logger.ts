import { green, red, yellow } from "picocolors";

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
