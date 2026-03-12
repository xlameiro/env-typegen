---
name: zustand
description: Zustand state management guide. Use when working with store code (src/store/**), implementing actions, managing state, or creating slices. Triggers on Zustand store development, state management questions, or action implementation.
---

# Zustand State Management

Zustand is a lightweight, unopinionated state management library for React. In this project, Zustand is used for **client-side UI state only** — keep server data in Server Components and use Next.js caching primitives for fetched data.

## v5 Key Changes (from v4)

If you are migrating from Zustand v4 or reading v4 documentation, be aware of these breaking changes:

- **Named imports only.** There is no default export in v5 — `import { create } from "zustand"`. Any `import create from "zustand"` (v4 pattern) is a compile error.
- **`persist` no longer seeds storage on creation.** In v4, store creation wrote initial state to `localStorage`. In v5 it does not. To seed persisted state on first load, call `yourStore.setState({...})` explicitly **after** the store is defined.
- **`createWithEqualityFn` moved to `zustand/traditional`.** If you need custom equality checks (e.g., a `shallow` updater), `import { createWithEqualityFn } from "zustand/traditional"`. Do not import it from `"zustand"`.
- **React 18 minimum.** `use-sync-external-store` is a peer dependency; React 16/17 are no longer supported.
- **TypeScript 4.5+ required.** Older TypeScript versions fail on the updated generic signatures.
- **Stricter `setState` replace flag.** The third argument to `set()` is now typed `boolean | undefined` instead of `boolean` — passing `false` explicitly where `undefined` was expected produces a type error.

```ts
// v4 (broken in v5)
import create from "zustand"; // ❌ no default export
import { createWithEqualityFn } from "zustand"; // ❌ moved

// v5 (correct)
import { create } from "zustand"; // ✅
import { createWithEqualityFn } from "zustand/traditional"; // ✅
```

## Core Pattern (TypeScript)

Always use the curried `create<State>()()` syntax. This ensures correct type inference with TypeScript:

```ts
import { create } from "zustand";

interface BearStore {
  bears: number;
  increase: (by: number) => void;
  reset: () => void;
}

const useBearStore = create<BearStore>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  reset: () => set({ bears: 0 }),
}));
```

## Selectors — avoid subscribing to the full store

Select only what a component needs to prevent unnecessary re-renders:

```ts
// ✅ Select a primitive — component only re-renders when `bears` changes
const bears = useBearStore((state) => state.bears);

// ✅ Shallow equality for objects/arrays
import { useShallow } from "zustand/react/shallow";
const { bears, increase } = useBearStore(
  useShallow((state) => ({ bears: state.bears, increase: state.increase })),
);

// ❌ Avoid — subscribes to entire store, re-renders on any change
const store = useBearStore();
```

## Accessing the store outside React

Use the static methods on the store hook:

```ts
// Read state
const { bears } = useBearStore.getState();

// Write state
useBearStore.setState({ bears: 5 });

// Subscribe to changes (always unsubscribe to avoid leaks)
const unsub = useBearStore.subscribe(
  (state) => state.bears,
  (bears) => console.log("bears:", bears),
);
unsub();
```

## Slices pattern — organizing large stores

Split large stores into focused slices using `StateCreator`:

```ts
import { create, StateCreator } from "zustand";

interface BearSlice {
  bears: number;
  addBear: () => void;
}

interface FishSlice {
  fishes: number;
  addFish: () => void;
}

type StoreState = BearSlice & FishSlice;

const createBearSlice: StateCreator<StoreState, [], [], BearSlice> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
});

const createFishSlice: StateCreator<StoreState, [], [], FishSlice> = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
});

const useStore = create<StoreState>()((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
}));
```

## devtools middleware

Wrap with `devtools` to enable Redux DevTools integration. Pass a human-readable label as the third `set` argument for readable action logs:

```ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing

const useBearStore = create<BearStore>()(
  devtools(
    (set) => ({
      bears: 0,
      increase: (by) =>
        set(
          (state) => ({ bears: state.bears + by }),
          undefined,
          "bear/increase",
        ),
      reset: () => set({ bears: 0 }, undefined, "bear/reset"),
    }),
    { name: "bear-store" },
  ),
);
```

## persist middleware — localStorage persistence

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "settings" }, // localStorage key
  ),
);
```

> **v5 breaking change:** The initial state is **no longer written to storage** on store creation. To seed persisted state on first load, call `useSettingsStore.setState({ ... })` after the store is defined.

## Combining middlewares

Apply in innermost-to-outermost order — `devtools` wraps `persist`:

```ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension";

const useBearStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        bears: 0,
        increase: (by) => set((state) => ({ bears: state.bears + by })),
      }),
      { name: "bear-storage" },
    ),
  ),
);
```

## Rules for this project

- **Client UI state only.** Do not duplicate server data in Zustand; fetch in Server Components and pass as props.
- **No data fetching in stores.** Stores contain state and synchronous actions. Use Server Actions or Route Handlers for mutations.
- **One store per feature domain.** Prefer focused stores (`useCartStore`, `useUIStore`) over a single monolithic store.
- **Co-locate store files** near the feature they serve, e.g., `src/features/cart/cart-store.ts`.
- **`useShallow` for object selectors.** Always use `useShallow` when selecting object/array values to avoid spurious re-renders.

## SSR-safe stores (Next.js App Router)

When a Zustand store holds initial state derived from the server (user preferences, session data), use the `unstable_ssrSafe` middleware (added in v5.0.9) to prevent hydration mismatches:

```ts
import { create } from "zustand";
import { unstable_ssrSafe } from "zustand/middleware";

type ThemeStore = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

// Each server render gets an isolated store instance — no cross-request contamination.
// On the client, the store is shared as normal after hydration.
export const useThemeStore = create<ThemeStore>()(
  unstable_ssrSafe((set) => ({
    theme: "light",
    setTheme: (theme) => set({ theme }),
  })),
);
```

**When to use**: any store that reads initial state from `cookies()`, `headers()`, or session data passed as Server Component props. Without `unstable_ssrSafe`, the store is a module-level singleton — two concurrent SSR requests share the same store instance and corrupt each other's state.

**When NOT to use**: pure client-only stores (UI toggles, modal state) that always start from a static default — the standard `create()` is fine there.

## immer middleware — nested state mutations

Use the `immer` middleware when your state has deeply nested objects and spreading would be verbose or error-prone. Immer lets you write mutations directly using a draft; it produces a new immutable state automatically.

```ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer"; // named sub-path, not "immer" package

type UserStore = {
  user: {
    profile: {
      name: string;
      bio: string;
    };
    settings: {
      notifications: boolean;
      theme: "light" | "dark";
    };
  };
  updateBio: (bio: string) => void;
  toggleNotifications: () => void;
};

const useUserStore = create<UserStore>()(
  immer((set) => ({
    user: {
      profile: { name: "Alice", bio: "" },
      settings: { notifications: true, theme: "light" },
    },
    updateBio: (bio) =>
      set((state) => {
        state.user.profile.bio = bio; // direct mutation — Immer handles immutability
      }),
    toggleNotifications: () =>
      set((state) => {
        state.user.settings.notifications = !state.user.settings.notifications;
      }),
  })),
);
```

> **Import from `"zustand/middleware/immer"`** — not from the `"immer"` package directly. The Zustand sub-path export wraps Immer's `produce` with Zustand's middleware interface.
>
> **When to reach for immer:** state depth > 2 levels, or more than 2 spread-and-override operations in the same action. For flat state, plain `set()` with spread is cleaner.

## subscribeWithSelector — reactive subscriptions outside React

Use `subscribeWithSelector` when you need to **react to a specific slice of state changing** from outside a React component (e.g., in a game loop, service worker, or non-React code). It enables `subscribe(selector, listener, options)` instead of just `subscribe(listener)`.

```ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type GameStore = {
  score: number;
  level: number;
  incrementScore: (by: number) => void;
};

const useGameStore = create<GameStore>()(
  subscribeWithSelector((set) => ({
    score: 0,
    level: 1,
    incrementScore: (by) => set((state) => ({ score: state.score + by })),
  })),
);

// Subscribe to score only — listener fires ONLY when score changes
const unsub = useGameStore.subscribe(
  (state) => state.score, // selector
  (score, prevScore) => {
    if (score >= 100 && prevScore < 100) {
      console.log("Level up!");
    }
  },
  { equalityFn: Object.is, fireImmediately: false }, // options are optional
);
unsub(); // always clean up
```

**`subscribeWithSelector` vs `useShallow`:**

| Situation                                                | Use                                              |
| -------------------------------------------------------- | ------------------------------------------------ |
| Inside a React component — select multiple values        | `useShallow` selector                            |
| Outside React — react to a specific state change         | `subscribeWithSelector`                          |
| Complex derived state that needs to trigger side effects | `subscribeWithSelector` with a computed selector |
