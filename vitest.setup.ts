import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Ensure DOM cleanup happens after every test that uses @testing-library/react.
// Required when globals: true is not set in vitest.config.ts.
afterEach(cleanup);
