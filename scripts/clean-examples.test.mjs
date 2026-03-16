import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_SCRIPT = join(CURRENT_DIR, "clean-examples.mjs");

const createdTempDirs = [];

async function writeFixtureFile(root, relPath, content) {
  const abs = join(root, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "clean-examples-fixture-"));
  createdTempDirs.push(root);

  await mkdir(join(root, "scripts"), { recursive: true });
  await cp(SOURCE_SCRIPT, join(root, "scripts", "clean-examples.mjs"));

  await writeFixtureFile(
    root,
    "package.json",
    JSON.stringify(
      { name: "nextjs16-starter-template", private: true },
      null,
      2,
    ) + "\n",
  );
  await writeFixtureFile(root, "README.md", "# Template README\n");
  await writeFixtureFile(
    root,
    "AGENTS.md",
    "## Starting a New Project from This Template\n@template-example\n",
  );
  await writeFixtureFile(
    root,
    "app/page.tsx",
    "export default function Page(){return null;}\n",
  );

  await writeFixtureFile(
    root,
    "app/dashboard/page.tsx",
    "export default function Dashboard(){return null;}\n",
  );
  await writeFixtureFile(
    root,
    "app/profile/page.tsx",
    "export default function Profile(){return null;}\n",
  );
  await writeFixtureFile(
    root,
    "app/settings/page.tsx",
    "export default function Settings(){return null;}\n",
  );

  await writeFixtureFile(
    root,
    "lib/stats.ts",
    "export const stats = [] as const;\n",
  );
  await writeFixtureFile(
    root,
    "lib/stats.test.ts",
    "import { describe, it } from 'vitest'; describe('stats',()=>{ it('noop',()=>{});});\n",
  );

  await writeFixtureFile(root, "tests/dashboard.spec.ts", "");
  await writeFixtureFile(root, "tests/home.spec.ts", "");
  await writeFixtureFile(root, "tests/profile.spec.ts", "");
  await writeFixtureFile(root, "tests/settings.spec.ts", "");
  await writeFixtureFile(root, "tests/authenticated.spec.ts", "");

  await writeFixtureFile(
    root,
    "store/use-app-store.ts",
    "export const useAppStore = () => ({ sidebarOpen: true, theme: 'system' as const });\n",
  );
  await writeFixtureFile(
    root,
    "store/use-app-store.test.ts",
    "import { describe, it } from 'vitest'; describe('store',()=>{ it('noop',()=>{});});\n",
  );

  await writeFixtureFile(
    root,
    "proxy.ts",
    [
      "const isProtectedRoute =",
      '  nextUrl.pathname.startsWith("/dashboard") ||',
      '  nextUrl.pathname.startsWith("/profile") ||',
      '  nextUrl.pathname.startsWith("/settings");',
      "",
      'const value = new URL("/dashboard", nextUrl);',
      "",
    ].join("\n"),
  );

  await writeFixtureFile(
    root,
    "lib/constants.ts",
    [
      "export const ROUTES = {",
      '  home: "/",',
      '  dashboard: "/dashboard",',
      '  settings: "/settings",',
      '  profile: "/profile",',
      "} as const;",
      "",
    ].join("\n"),
  );

  await writeFixtureFile(
    root,
    "lib/schemas/user.schema.ts",
    "export const userSchema = {};\nexport const createUserSchema = {};\nexport const updateUserSchema = {};\n",
  );
  await writeFixtureFile(
    root,
    "lib/schemas/user.schema.test.ts",
    "import { describe, it } from 'vitest'; describe('schema',()=>{ it('noop',()=>{});});\n",
  );

  await writeFixtureFile(
    root,
    "app/setup.test.ts",
    "expect(ROUTES.dashboard).toMatch(/^\\//);\n",
  );

  await writeFixtureFile(
    root,
    "lib/utils.ts",
    [
      "function sanitizeReturnTo(url) {",
      '  if (!url || !url.startsWith("/") || url.startsWith("//")) {',
      "    return ROUTES.dashboard;",
      "  }",
      "}",
      "",
      " * Returns the dashboard route as the safe fallback.",
      "",
    ].join("\n"),
  );

  await writeFixtureFile(
    root,
    "lib/utils.test.ts",
    [
      'it("should return the dashboard route when given undefined", () => {',
      '  expect(sanitizeReturnTo(undefined)).toBe("/dashboard");',
      "});",
      "",
    ].join("\n"),
  );

  await writeFixtureFile(
    root,
    "app/auth/sign-in/page.tsx",
    "export default function SignIn(){return null;}\n",
  );
  await writeFixtureFile(
    root,
    "app/api/auth/[...nextauth]/route.ts",
    "export {};\n",
  );
  await writeFixtureFile(
    root,
    "components/ui/google-icon.tsx",
    "export function GoogleIcon(){return null;}\n",
  );
  await writeFixtureFile(
    root,
    "components/ui/google-icon.test.tsx",
    "import { describe, it } from 'vitest'; describe('icon',()=>{ it('noop',()=>{});});\n",
  );
  await writeFixtureFile(root, "tests/auth.spec.ts", "");
  await writeFixtureFile(root, "tests/sign-in.spec.ts", "");
  await writeFixtureFile(root, "tests/auth.setup.ts", "");
  await writeFixtureFile(root, "auth.ts", "export {};\n");
  await writeFixtureFile(root, "lib/auth.ts", "export {};\n");
  await writeFixtureFile(
    root,
    "lib/auth.test.ts",
    "import { describe, it } from 'vitest'; describe('auth',()=>{ it('noop',()=>{});});\n",
  );

  return root;
}

async function runCleaner(root, mode) {
  const scriptPath = join(root, "scripts", "clean-examples.mjs");
  const { stdout } = await execFileAsync(
    "node",
    [scriptPath, `--mode=${mode}`],
    {
      cwd: root,
    },
  );
  return stdout;
}

afterEach(async () => {
  while (createdTempDirs.length > 0) {
    const dir = createdTempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("clean-examples script", () => {
  it("should keep auth files in keep-auth mode", async () => {
    const root = await createFixture();

    await runCleaner(root, "keep-auth");

    expect(existsSync(join(root, "app", "auth"))).toBe(true);
    expect(existsSync(join(root, "components", "ui", "google-icon.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(root, "tests", "auth.spec.ts"))).toBe(true);
  });

  it("should remove all auth artifacts in no-auth mode", async () => {
    const root = await createFixture();

    await runCleaner(root, "no-auth");

    expect(existsSync(join(root, "app", "auth"))).toBe(false);
    expect(existsSync(join(root, "app", "api", "auth"))).toBe(false);
    expect(existsSync(join(root, "components", "ui", "google-icon.tsx"))).toBe(
      false,
    );
    expect(existsSync(join(root, "tests", "auth.spec.ts"))).toBe(false);

    expect(existsSync(join(root, "components", "ui", "form.tsx"))).toBe(false);
    expect(existsSync(join(root, "hooks", "use-debounce.ts"))).toBe(false);
    expect(existsSync(join(root, "scripts", "verify-skills.mjs"))).toBe(false);

    const proxyContents = await readFile(join(root, "proxy.ts"), "utf-8");
    assert.match(
      proxyContents,
      /import \{ NextResponse \} from "next\/server"/,
    );
    assert.doesNotMatch(proxyContents, /from "@\/auth"/);
    assert.match(proxyContents, /export default function proxy/);

    const packageJsonContents = await readFile(
      join(root, "package.json"),
      "utf-8",
    );
    const packageJson = JSON.parse(packageJsonContents);
    expect(packageJson.dependencies?.["next-auth"]).toBeUndefined();
    expect(packageJson.dependencies?.["react-hook-form"]).toBeUndefined();
    expect(packageJson.dependencies?.["@hookform/resolvers"]).toBeUndefined();

    const readmeContents = await readFile(join(root, "README.md"), "utf-8");
    assert.doesNotMatch(readmeContents, /\/new-project/);

    const agentsContents = await readFile(join(root, "AGENTS.md"), "utf-8");
    assert.match(agentsContents, /clean archetype scaffold/);
    assert.doesNotMatch(
      agentsContents,
      /Starting a New Project from This Template/,
    );
    assert.doesNotMatch(agentsContents, /@template-example/);
  });

  it("should be idempotent on repeated runs", async () => {
    const root = await createFixture();

    await runCleaner(root, "no-auth");
    const secondRunOutput = await runCleaner(root, "no-auth");

    assert.match(secondRunOutput, /Already clean:/);
    assert.match(secondRunOutput, /Failed: 0/);
  });
});
