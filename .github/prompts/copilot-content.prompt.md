---
name: "vue copilot content
agent: "agent"
description: "This prompt contains the full content for the `ghb-cop-vue` copilot: agent definition, skills, instructions and prompts. It serves as the single source of truth for all assets in the repository."
tools:
  [
    vscode,
    execute,
    read,
    agent,
    edit,
    search,
    web,
    browser,
    "github/*",
    "context7/*",
    todo,
  ]
---

# Plan: Create Copilot `ghb-cop-vue` + `ghb-knb-vue`

## TL;DR

Create the Vue copilot (`ghb-cop-vue`) following the `xabier-lameirocardama_geci` organisation standard: a GitHub repository with a catalogue `README.md` + assets in `.github/` (agent, skills, prompts, instructions). In parallel, create the knowledge base `ghb-knb-vue`. Afterwards, register it in the "ECI Copilots Manager" Copilot Space so the installer can discover it.

**Prefix**: `vue` | **Version**: `0.1.0` | **Depends on**: `ghb-cop-devex`

---

## Session Overview

| Session                 | Content                                  | Phases |
| ----------------------- | ---------------------------------------- | ------ |
| **S1 — Foundation**     | Prerequisites + repository creation      | 1–2    |
| **S2 — Core Assets**    | README, Agent, Instructions              | 3–5    |
| **S3 — Skills**         | All 4 SKILL.md files                     | 6      |
| **S4 — Prompts**        | All 3 .prompt.md files                   | 7      |
| **S5 — Publish**        | Commit, push, Copilot Space registration | 8–9    |
| **S6 — Knowledge Base** | Create `ghb-knb-vue` docs structure      | 10     |
| **S7 — Verification**   | End-to-end install & functional testing  | 11     |

---

## Knowledge Base & Session Context

### Repositories consulted as knowledge base

| Repository                                               | Type         | Role in this plan                                                                                                                                       |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xabier-lameirocardama_geci/ghb-knb-registro-unico`      | `knb` (docs) | Reference architecture — batch job pattern, Campeador3, Mongo, RxJava3. Used as structural template for `ghb-knb-vue`                                   |
| `xabier-lameirocardama_geci/.github-private`             | Manager      | Source of the copilot lifecycle: install/update/uninstall flow, `eci-copilot-discovery` skill, `README.md` catalogue format, `eci-copilots.json` schema |
| `xabier-lameirocardama_geci/ghb-cop-devex`               | `cop` v0.4.0 | Direct dependency — CI/CD conventions, `actions.cfg`, feature branching. Asset structure used as design reference                                       |
| `xabier-lameirocardama_geci/ghb-cop-registro-unico`      | `cop` v0.1.0 | Peer copilot — Campeador3 job generation. Used as structural reference for skills and agent                                                             |
| `xabier-lameirocardama_geci/ghb-cop-firefly-v5`          | `cop` v0.1.2 | Peer copilot depending on `devex`. Confirms the `dependencies` pattern in `README.md`                                                                   |
| `xabier-lameirocardama_geci/ghb-cop-firefly-marketplace` | `cop` v0.1   | Peer copilot — Mirakl product catalogue. Provides an example of a domain-specific copilot                                                               |
| `xabier-lameirocardama_geci/ghb-cop-metodologia`         | `cop` v0.1.0 | Peer copilot (in progress). Confirms the minimum viable structure                                                                                       |

### Session context (13 March 2026)

This plan was produced in a GitHub Copilot session with the following working context:

- **Organisation**: `xabier-lameirocardama_geci` (GitHub, private)
- **Copilot infrastructure**: 3-tier — `ghb-knb-*` (knowledge bases), `ghb-cop-*` (installable copilots), `.github-private` (ECI Copilots Manager)
- **Installer agent**: `@eci-copilots-manager` — discovers copilots via the "ECI Copilots Manager" Copilot Space, clones to `{workspace}/tmp/`, copies assets to `{workspace}/.github/`, writes `eci-copilots.json`
- **CUC**: Código Único de Cliente — 10-digit primary key used in ECI's Registro Único system (context for understanding the `ghb-knb-registro-unico` reference)
- **`ghb`** = GitHub (prefix distinguishing repos from legacy Bitbucket at `almeci.io`)
- **`knb`** = Knowledge Base | **`cop`** = Copilot
- **Dependency resolution**: handled by `manager-dependency-resolver` skill — installing `ghb-cop-vue` automatically triggers install of `ghb-cop-devex`
- **Context7 MCP**: recommended in this session to prevent deprecated Vue API usage — added to Phase 1.3 and wired into every skill and the agent definition

---

## SESSION 1 — Foundation

### Phase 1 — Prerequisites

**1.1** Confirm write access to the `xabier-lameirocardama_geci` GitHub organisation.

**1.2** Verify `gh` CLI authentication:

```bash
gh auth status
```

The user account must follow the `_geci` convention (skill `gh-auth-validator`).

**1.3** Configure the **Context7 MCP** in VS Code.

Context7 allows the Vue agent and skills to query the **official Vue 3 documentation** in real time, preventing the generation of deprecated API recommendations (e.g., `Vue.set`, Options API patterns, removed lifecycle hooks).

Add the following to your workspace or user MCP configuration (`mcp.json` or `.vscode/settings.json`):

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "type": "http",
        "url": "https://mcp.context7.com/mcp"
      }
    }
  }
}
```

Verify the server is reachable and listed as available in your Copilot MCP panel.

**1.4** Verify access to the catalogue Copilot Space (required for the final registration step):

- Coordinate with the team responsible for `.github-private` / DevEx.

---

### Phase 2 — Create repository `ghb-cop-vue`

**2.1 Create the repository on GitHub:**

```bash
cd /Users/xlameiro/Proyectos
gh repo create xabier-lameirocardama_geci/ghb-cop-vue \
  --description "Vue 3 development copilot for ECI projects" \
  --private \
  --clone
cd /Users/xlameiro/Proyectos/ghb-cop-vue
```

**2.2 Create the directory structure:**

```bash
cd /Users/xlameiro/Proyectos/ghb-cop-vue
mkdir -p .github/agents
mkdir -p .github/instructions
mkdir -p .github/prompts
mkdir -p .github/skills/vue-component-generator
mkdir -p .github/skills/vue-test-generator
mkdir -p .github/skills/vue-composable-generator
mkdir -p .github/skills/vue-troubleshooting
```

---

## SESSION 2 — Core Assets

### Phase 3 — Write `README.md` (catalogue entry)

The `eci-copilot-discovery` skill reads **exactly** this format. This is the single source of truth for the catalogue.

**File**: `README.md`

```markdown
# Copiloto de Vue

## Versión

0.1.0

## Prefijo

vue

## Palabras clave

vue, vuejs, frontend, spa, composition-api, vitest, pinia, vue-router, playwright

## Repositorio

https://github.com/xabier-lameirocardama_geci/ghb-cop-vue.git

## Capacidades

1. Desarrollar componentes Vue 3 con Composition API siguiendo las convenciones de ECI
2. Desarrollar tests unitarios con Vitest para componentes y composables Vue
3. Desarrollar tests E2E con Playwright/Cypress
4. Crear y gestionar composables y estado global con Pinia
5. Configurar y gestionar routing con Vue Router
6. Integrar componentes con APIs REST
7. Troubleshooting de construcción y CI/CD específico de proyectos Vue

## Entornos soportados

Copilot CLI, Visual Studio Code, IntelliJ, Eclipse

## MCP Servers

| Nombre   | Tipo   | Descripción                                                |
| -------- | ------ | ---------------------------------------------------------- |
| github   | remoto | Github MCP Server                                          |
| context7 | remoto | Official Vue 3 docs lookup — prevents deprecated API usage |

## Dependencias

- https://github.com/xabier-lameirocardama_geci/ghb-cop-devex.git
```

---

### Phase 4 — Write the Agent (`.github/agents/vue.agent.md`)

**File**: `.github/agents/vue.agent.md`

The YAML frontmatter defines name, description and available tools:

```markdown
---
name: vue
description: "Expert agent for Vue 3 application development following ECI standards"
tools:
  [
    "read/readFile",
    "search/fileSearch",
    "search/listDirectory",
    "edit/createFile",
    "edit/editFiles",
    "execute/runInTerminal",
    "execute/getTerminalOutput",
    "mcp/context7",
  ]
---

# Vue Agent

## Version

v0.1.0

## Identity

You are the **Vue Agent**, specialist in Vue 3 frontend development at ECI. Your mission is to assist developers creating components, tests, composables, and resolving issues — always following ECI standards and verified against the official Vue 3 documentation.

## Available Skills

### 1. vue-component-generator

**When to use**: When asked to create a new Vue component.
**Function**: Generates Vue 3 components with Composition API, `<script setup lang="ts">` and ECI conventions.

### 2. vue-test-generator

**When to use**: When asked for unit tests (Vitest) or E2E tests (Playwright/Cypress).
**Function**: Generates tests following ECI testing patterns with minimum 80% coverage.

### 3. vue-composable-generator

**When to use**: When asked for reusable composables, Pinia stores or state management logic.
**Function**: Generates `use`-prefixed composables and Pinia stores following ECI conventions.

### 4. vue-troubleshooting

**When to use**: When there are build, CI/CD or runtime errors in Vue projects.
**Function**: Diagnoses and resolves common issues (Vite build, TypeScript, Vitest, CI pipelines).

## Workflow

Identify the user intent and invoke the corresponding skill:

- **Create component** → `vue-component-generator`
- **Create test** → `vue-test-generator`
- **Create composable / Pinia store** → `vue-composable-generator`
- **Resolve error / troubleshooting** → `vue-troubleshooting`

## Rules

- Always use `<script setup lang="ts">` in components
- Never use Options API in new code
- Composables are named with `use` prefix (e.g. `useProducto.ts`)
- Pinia stores use `Store` suffix and are defined with `defineStore`
- Unit tests are co-located with the component (`*.spec.ts`)
- Minimum required coverage: 80%
- **Before generating any code, consult Context7 to confirm the Vue 3 API is current and not deprecated**
- Always follow the conventions documented in the `ghb-knb-vue` knowledge base
```

---

### Phase 5 — Write Instructions (`.github/instructions/`)

Instructions are automatically applied by VS Code based on the `applyTo` pattern in the frontmatter.

**File**: `.github/instructions/vue-conventions.instructions.md`

```markdown
---
applyTo: "**/*.vue,**/*.spec.ts,**/*.composable.ts"
---

# Vue Conventions at ECI

## Component Structure

- Always use `<script setup lang="ts">`
- Block order: `<script setup>`, `<template>`, `<style scoped>`
- Typed props with `defineProps<Props>()`
- Typed emits with `defineEmits<Emits>()`

## Naming

- Components: PascalCase (`MiComponente.vue`)
- Composables: camelCase with `use` prefix (`useProducto.ts`)
- Pinia stores: camelCase, file with `Store` suffix (`productoStore.ts`)
- Tests: same name as the file + `.spec.ts` (`MiComponente.spec.ts`)

## Testing

- Unit tests in co-located `*.spec.ts` files
- Use Vitest + Vue Test Utils (`@vue/test-utils`)
- Minimum required coverage: 80%
- E2E tests in `/e2e/*.spec.ts` using Playwright

## API Currency

- Always verify Vue 3 APIs via Context7 before using patterns from online snippets or model training data
- Never use Vue 2 patterns: `Vue.set`, `Vue.observable`, `vm.$set`, `beforeDestroy`/`destroyed` hooks
```

---

## SESSION 3 — Skills

### Phase 6 — Write Skills (`.github/skills/`)

Each skill is a folder with a `SKILL.md`. The frontmatter defines name and description.

> **Note on Context7**: Each skill must call Context7 before generating code to verify that the suggested Vue APIs, composable patterns, or test helpers are current in the installed version of Vue 3.

#### Skill 1: `vue-component-generator`

**File**: `.github/skills/vue-component-generator/SKILL.md`

````markdown
---
name: vue-component-generator
description: Generates Vue 3 components with Composition API following ECI conventions
---

# Vue Component Generator

## When to Use This Skill

- When the user asks to create a new Vue component
- When refactoring a component to Composition API

## Expected Parameters

- **Component name**: PascalCase (e.g. `ProductoCard`)
- **Props**: list of props with name and TypeScript type
- **Emits**: list of events the component emits
- **Target directory**: relative path where the file should be created

## Workflow

### 1. Verify API Currency (Context7)

Before generating code, query Context7:

- Confirm `defineProps<T>()` and `defineEmits<T>()` syntax is current for the target Vue version
- Check for any breaking changes in `<script setup>` for the version in use

### 2. Gather Information

Ask the user:

- Component name
- Required props (name and type)
- Events to emit
- Does it need local state? (ref/reactive)
- Target directory

### 3. Generate the Component

Structure to generate:

```vue
<script setup lang="ts">
// Imports
// Props
// Emits
// Local state
// Functions
</script>

<template>
  <!-- Template -->
</template>

<style scoped>
/* Styles */
</style>
```
````

### 4. Create the File

Use `createFile` to create `{ComponentName}.vue` in the indicated directory.

### 5. Create Test Skeleton

Create `{ComponentName}.spec.ts` co-located with the component.

## Rules

- Always `<script setup lang="ts">`
- No Options API
- Props with `defineProps<Props>()`
- Emits with `defineEmits<Emits>()`

````

---

#### Skill 2: `vue-test-generator`
**File**: `.github/skills/vue-test-generator/SKILL.md`
```markdown
---
name: vue-test-generator
description: Generates Vitest unit tests or Playwright E2E tests for Vue 3 components and composables
---

# Vue Test Generator

## When to Use This Skill
- When the user asks for unit tests for a component or composable
- When the user asks for E2E tests
- When coverage needs to be improved

## Test Types

| Type | Framework | Location |
|------|-----------|----------|
| Unit | Vitest + Vue Test Utils | next to the component (`*.spec.ts`) |
| E2E | Playwright | `/e2e/*.spec.ts` |

## Workflow — Unit Test

### 1. Verify API Currency (Context7)
Before generating test code, query Context7:
- Confirm `mount` and wrapper API from `@vue/test-utils` is current
- Check for deprecated helpers

### 2. Read the Component/Composable
Use `readFile` to understand the implementation.

### 3. Identify Test Cases
- Props and edge values
- Emitted events
- Rendering behaviour
- User interactions

### 4. Generate the Test
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MiComponente from './MiComponente.vue'

describe('MiComponente', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(MiComponente)
    expect(wrapper.exists()).toBe(true)
  })
})
````

## Rules

- Descriptive test names (Spanish is acceptable for ECI projects)
- One describe block per component/composable
- Cover branches, not just the happy path

````

---

#### Skill 3: `vue-composable-generator`
**File**: `.github/skills/vue-composable-generator/SKILL.md`
```markdown
---
name: vue-composable-generator
description: Generates reusable Vue 3 composables and Pinia stores following ECI conventions
---

# Vue Composable Generator

## When to Use This Skill
- Create reusable composables (business logic, API calls, utilities)
- Create Pinia stores for global state

## Types

### Composable (`use*.ts`)
```typescript
import { ref, readonly } from 'vue'

export function useProducto(id: string) {
  const producto = ref<Producto | null>(null)
  const cargando = ref(false)

  async function cargar() {
    cargando.value = true
    try {
      producto.value = await apiProductos.obtener(id)
    } finally {
      cargando.value = false
    }
  }

  return { producto: readonly(producto), cargando, cargar }
}
````

### Pinia Store (`*Store.ts`)

```typescript
import { defineStore } from 'pinia'

export const useProductosStore = defineStore('productos', () => {
  const lista = ref<Producto[]>([])

  async function cargarTodos() { ... }

  return { lista: readonly(lista), cargarTodos }
})
```

## Workflow

### 1. Verify API Currency (Context7)

Before generating code, query Context7:

- Confirm the Pinia `defineStore` Composition API syntax is current
- Check for any changes in `storeToRefs` or `$patch` API

### 2. Generate the File

## Rules

- Composables expose only `readonly()` for external state
- Pinia stores use Composition API syntax (`defineStore` with a function)
- `use` prefix is mandatory for both

````

---

#### Skill 4: `vue-troubleshooting`
**File**: `.github/skills/vue-troubleshooting/SKILL.md`
```markdown
---
name: vue-troubleshooting
description: Diagnoses and resolves build, CI/CD and runtime errors in Vue 3 ECI projects
---

# Vue Troubleshooting

## When to Use This Skill
- Error during Vite build
- Vitest or Playwright failure in CI
- TypeScript errors in `.vue` files
- Unexpected warnings in the console

## Workflow

### 1. Collect the Error
Ask the user for the full error message and context (what action triggered it).

### 2. Categorise the Error
| Category | Typical symptoms |
|----------|-----------------|
| Build/Vite | `ENOENT`, `Cannot resolve module`, alias errors |
| TypeScript | `TS2xxx`, `Property does not exist`, wrong types |
| Tests | `Cannot find module`, `mount` errors, timeouts |
| CI/CD | `actions.cfg` failure, permissions, artefacts |
| Runtime | Vue warnings, `inject` outside `setup`, reactivity issues |

### 3. Verify with Context7
Before proposing a solution, query Context7 to confirm:
- The recommended fix aligns with current Vue 3 official guidance
- The suggested API or pattern has not been deprecated or changed

### 4. Apply Solution
Read the relevant files and propose a concrete fix.

### 5. Verify
Tell the user the verification command:
- Build: `npm run build`
- Tests: `npm run test`
- CI: review logs in GitHub Actions
````

---

## SESSION 4 — Prompts

### Phase 7 — Write Prompts (`.github/prompts/`)

Prompts have a `description` frontmatter. They are invoked with `#{name}` in Copilot Chat.

#### Prompt 1: `vue-component.prompt.md`

**File**: `.github/prompts/vue-component.prompt.md`

```markdown
---
description: Creates a Vue 3 component with Composition API following ECI conventions
---

Create a new Vue 3 component using Composition API.

Requirements:

1. Use `<script setup lang="ts">`
2. Define props with `defineProps<Props>()`
3. Define emits with `defineEmits<Emits>()`
4. Place `<style scoped>` at the end
5. Also create the co-located `*.spec.ts` test file

Describe the component you need: name, props, and expected behaviour.
```

#### Prompt 2: `vue-test.prompt.md`

**File**: `.github/prompts/vue-test.prompt.md`

```markdown
---
description: Generates Vitest unit tests or Playwright E2E tests for a Vue component or composable
---

Generate tests for the component or composable I specify.

For unit tests:

- Use Vitest + Vue Test Utils
- Cover happy path and edge cases
- Target coverage ≥ 80%

For E2E tests:

- Use Playwright
- Place the test in `/e2e/`

Specify the file to test and the type of test you need.
```

#### Prompt 3: `vue-composable.prompt.md`

**File**: `.github/prompts/vue-composable.prompt.md`

```markdown
---
description: Generates a reusable Vue 3 composable or a Pinia store
---

Generate a Vue 3 composable or a Pinia store.

For composables: `use` prefix, return state as `readonly`.
For Pinia stores: use `defineStore` with Composition API syntax.

Describe the logic it should encapsulate and whether it needs API calls.
```

---

## SESSION 5 — Publish

### Phase 8 — Commit and Push

```bash
cd /Users/xlameiro/Proyectos/ghb-cop-vue
git add .
git commit -m "feat: initial structure of ghb-cop-vue v0.1.0"
git push origin main
```

---

### Phase 9 — Register in Copilot Space "ECI Copilots Manager"

For the `@eci-copilots-manager` agent to discover and install `ghb-cop-vue`, the repo must be indexed in the Copilot Space.

**9.1** Contact the team responsible for `.github-private` / DevEx at ECI to add `ghb-cop-vue` to the "ECI Copilots Manager" Copilot Space index.

**9.2** Provide them with the repository URL:

```
https://github.com/xabier-lameirocardama_geci/ghb-cop-vue.git
```

**9.3** Verify the registration by running the following in a workspace with the Manager installed:

```
@eci-copilots-manager list all available copilots
```

The `vue` copilot must appear in the catalogue.

---

## SESSION 6 — Knowledge Base

### Phase 10 — Create repository `ghb-knb-vue`

**10.1 Create the repo:**

```bash
cd /Users/xlameiro/Proyectos
gh repo create xabier-lameirocardama_geci/ghb-knb-vue \
  --description "Knowledge base for the ECI Vue 3 Copilot" \
  --private \
  --clone
cd /Users/xlameiro/Proyectos/ghb-knb-vue
```

**10.2 Create the documentation structure** (following the pattern of `ghb-knb-registro-unico/rujobs/`):

```
/Users/xlameiro/Proyectos/ghb-knb-vue/
├── README.md                         ← brief description
└── vue-docs/
    ├── readme.md                     ← general index with table of all docs
    ├── architecture-overview.md      ← General architecture of Vue apps at ECI
    ├── 01.setup/
    │   └── setup-overview.md         ← Project creation, Vite, TypeScript, linting
    ├── 02.components/
    │   └── components-overview.md    ← Composition API, props, emits, slots
    ├── 03.composables/
    │   └── composables-overview.md   ← Composables, patterns, examples
    ├── 04.state/
    │   └── state-overview.md         ← Pinia, stores, reactive state
    ├── 05.routing/
    │   └── routing-overview.md       ← Vue Router, routes, navigation guards
    ├── 06.testing/
    │   └── testing-overview.md       ← Vitest, Vue Test Utils, Playwright, coverage
    └── 07.api-integration/
        └── api-integration-overview.md  ← HTTP client, interceptors, REST patterns
```

**10.3 Write the `README.md` for the knowledge base:**

```markdown
# Vue 3 Knowledge Base Repository

Technical documentation for the ECI Vue 3 Copilot.

## Contents

Detailed documentation on patterns, conventions, and best practices for
Vue 3 application development at ECI.
```

**10.4 Author each document** with real technical content:

- ECI-specific Vue conventions
- Component, composable and store patterns used in ECI projects
- REST API integration examples for ECI backends
- CI/CD configuration for Vue projects (in conjunction with `ghb-knb-devex`)

> **Note**: When authoring knowledge base documents, use Context7 to pull the official Vue 3 documentation for each topic and cross-reference it with ECI-specific conventions. This ensures the knowledge base stays accurate as Vue evolves.

**10.5 Commit and push:**

```bash
cd /Users/xlameiro/Proyectos/ghb-knb-vue
git add .
git commit -m "feat: initial structure of ghb-knb-vue knowledge base"
git push origin main
```

---

## SESSION 7 — Verification

### Phase 11 — End-to-End Verification

**11.1** Install the copilot in a test workspace:

```
@eci-copilots-manager install the vue copilot
```

**11.2** Verify that assets are installed under `.github/`:

- `.github/agents/vue.agent.md`
- `.github/instructions/vue-conventions.instructions.md`
- `.github/skills/vue-component-generator/SKILL.md`
- `.github/skills/vue-test-generator/SKILL.md`
- `.github/skills/vue-composable-generator/SKILL.md`
- `.github/skills/vue-troubleshooting/SKILL.md`
- `.github/prompts/vue-component.prompt.md`
- `.github/prompts/vue-test.prompt.md`
- `.github/prompts/vue-composable.prompt.md`

**11.3** Verify that the `ghb-cop-devex` dependency is installed automatically (by `manager-dependency-resolver`).

**11.4** Verify that Context7 MCP is active for the agent (check the MCP panel in VS Code).

**11.5** Test each agent capability:

- `@vue create a ProductoCard component with id and nombre props`
- `@vue generate tests for ProductoCard.vue`
- `@vue create a useProductos composable that calls the /api/productos API`
- `@vue troubleshoot: Vite fails with "Cannot resolve @/components/ProductoCard"`

**11.6** Verify the registry entry in `eci-copilots.json`:

```json
{
  "installedCopilots": [
    {
      "id": "vue",
      "nombre": "Copiloto de Vue",
      "prefix": "vue",
      "version": "0.1.0",
      "dependencies": ["devex"]
    }
  ]
}
```

---

## Files to Create (Summary)

| File                                                   | Session | Phase   |
| ------------------------------------------------------ | ------- | ------- |
| `README.md`                                            | S2      | Phase 3 |
| `.github/agents/vue.agent.md`                          | S2      | Phase 4 |
| `.github/instructions/vue-conventions.instructions.md` | S2      | Phase 5 |
| `.github/skills/vue-component-generator/SKILL.md`      | S3      | Phase 6 |
| `.github/skills/vue-test-generator/SKILL.md`           | S3      | Phase 6 |
| `.github/skills/vue-composable-generator/SKILL.md`     | S3      | Phase 6 |
| `.github/skills/vue-troubleshooting/SKILL.md`          | S3      | Phase 6 |
| `.github/prompts/vue-component.prompt.md`              | S4      | Phase 7 |
| `.github/prompts/vue-test.prompt.md`                   | S4      | Phase 7 |
| `.github/prompts/vue-composable.prompt.md`             | S4      | Phase 7 |

---

## Fixed Decisions

- Prefix: `vue` (unique in the org)
- Initial version: `0.1.0`
- 7 capabilities (components, unit tests, E2E tests, Pinia, Vue Router, REST APIs, CI/CD troubleshooting)
- Depends on `ghb-cop-devex` for inherited CI/CD capabilities
- `ghb-knb-vue` knowledge base created in parallel
- Supported environments: Copilot CLI, VS Code, IntelliJ, Eclipse
- Context7 MCP used across all skills to prevent deprecated API usage

---

## Plan Completion Checklist

Before considering this plan done, verify **every item** in each category. Mark with ✅ when confirmed, ❌ if not met (must be resolved before closing).

### Catalogue & Registration

- [ ] `README.md` follows the exact format read by `eci-copilot-discovery` (sections: Versión, Prefijo, Palabras clave, Repositorio, Capacidades, Entornos soportados, MCP Servers, Dependencias)
- [ ] Prefix `vue` is unique — no other repo in `xabier-lameirocardama_geci` uses it
- [ ] Version follows `MAJOR.MINOR.PATCH` semver and starts at `0.1.0`
- [ ] Repository URL in `README.md` is `https://github.com/xabier-lameirocardama_geci/ghb-cop-vue.git` (exact match)
- [ ] Copilot is registered and visible in the "ECI Copilots Manager" Copilot Space
- [ ] `@eci-copilots-manager` lists `vue` when queried for available copilots

### Asset Structure

- [ ] All 10 files exist in the repo under the correct paths (see Files to Create table)
- [ ] All SKILL.md files have valid YAML frontmatter (`name`, `description`)
- [ ] All `.prompt.md` files have valid YAML frontmatter (`description`)
- [ ] `vue.agent.md` frontmatter includes `name`, `description`, and `tools` (including `mcp/context7`)
- [ ] `vue-conventions.instructions.md` has `applyTo` set to `"**/*.vue,**/*.spec.ts,**/*.composable.ts"`
- [ ] No asset paths use spaces or uppercase letters in directory names

### Dependencies

- [ ] `ghb-cop-devex` is listed as a dependency in `README.md`
- [ ] Installing `ghb-cop-vue` via `@eci-copilots-manager` automatically installs `ghb-cop-devex` (via `manager-dependency-resolver`)
- [ ] No circular dependencies introduced

### Context7 MCP Integration

- [ ] Context7 MCP configured in workspace (`mcp.json` or `.vscode/settings.json`) before agent testing
- [ ] `mcp/context7` present in the agent `tools` list
- [ ] Each SKILL.md includes a "Verify API Currency (Context7)" step before code generation
- [ ] `vue-conventions.instructions.md` includes the `## API Currency` section
- [ ] Vue 2 legacy patterns (`Vue.set`, `beforeDestroy`, Options API) are explicitly forbidden in instructions

### Code Quality Standards

- [ ] All generated component templates use `<script setup lang="ts">` — never Options API
- [ ] All composables use `use` prefix and expose state via `readonly()`
- [ ] All Pinia stores use `defineStore` with Composition API (function) syntax
- [ ] Unit test coverage target (≥ 80%) is stated in skills, prompts, and instructions
- [ ] Test files follow co-location convention (`*.spec.ts` alongside source)
- [ ] E2E tests are placed under `/e2e/`

### Knowledge Base (`ghb-knb-vue`)

- [ ] Repo `xabier-lameirocardama_geci/ghb-knb-vue` created and pushed
- [ ] `vue-docs/` structure matches the 7-section template (01.setup → 07.api-integration)
- [ ] Each section document exists and contains real technical content (not placeholder stubs)
- [ ] Knowledge base cross-references ECI-specific patterns, not generic Vue tutorials
- [ ] Content verified against official Vue 3 docs via Context7 before publishing

### Git & Versioning

- [ ] All files committed with message `feat: initial structure of ghb-cop-vue v0.1.0`
- [ ] `main` branch is the default and protected
- [ ] No secrets, tokens, or internal API URLs hardcoded in any asset file

### End-to-End Verification (Session S7)

- [ ] All 9 asset files are present in `.github/` after install
- [ ] `eci-copilots.json` contains the correct `vue` entry with `dependencies: ["devex"]`
- [ ] Agent responds correctly to: create component, generate test, create composable, troubleshoot
- [ ] Context7 MCP is active during agent operation (visible in MCP panel)
- [ ] No deprecated Vue APIs appear in any agent-generated output
