# Zustand Slice Organization

## When to Use Slices

Slices are for **large stores only**. Before reaching for slices, consider whether the store is genuinely large enough to warrant the overhead.

**Signs a store needs slices:**

- More than ~5–6 state fields
- More than 3 related action groups with distinct responsibilities
- Test files are growing hard to navigate due to mixed concerns

**When slices are overkill:**

- A simple UI store with 2–4 fields (e.g., `isOpen`, `theme`, `activeTab`)
- A single-domain store where all state and actions are closely related

If in doubt, keep it flat. Slices add overhead — use them only when the store is genuinely hard to reason about as a single file.

---

## Canonical Slice Pattern — StateCreator

The official Zustand pattern for splitting a store into focused slices. Each slice is a `StateCreator` function that receives the combined store's `set`, `get`, and `store` API.

```ts
import { create, type StateCreator } from "zustand";

// ── Types ──────────────────────────────────────────────────────────────────

type BearSlice = {
  bears: number;
  addBear: () => void;
  resetBears: () => void;
};

type FishSlice = {
  fishes: number;
  addFish: () => void;
};

// The combined store type — intersect all slices
type StoreState = BearSlice & FishSlice;

// ── Slice Creators ─────────────────────────────────────────────────────────

const createBearSlice: StateCreator<StoreState, [], [], BearSlice> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  resetBears: () => set({ bears: 0 }),
});

const createFishSlice: StateCreator<StoreState, [], [], FishSlice> = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
});

// ── Combined Store ─────────────────────────────────────────────────────────

export const useStore = create<StoreState>()((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
}));
```

> The generic signature for `StateCreator` is `StateCreator<TState, TMutators, TActions, TSlice>`. When writing slices, pass the combined `StoreState` as the first argument and the slice type as the last — this gives each slice full access to the combined store's `get()`.

---

## File Structure for Slice-Based Stores

For a store split into slices, co-locate all files under a single directory:

```plaintext
store/
└── use-app-store/
    ├── index.ts             ← Combined store (exported hook)
    ├── bear-slice.ts        ← BearSlice type + createBearSlice
    ├── fish-slice.ts        ← FishSlice type + createFishSlice
    └── selectors.ts         ← Derived selectors (optional)
```

Each slice file exports its type and creator function only — never the store itself:

```ts
// store/use-app-store/bear-slice.ts
import type { StateCreator } from "zustand";
import type { StoreState } from "./index";

export type BearSlice = {
  bears: number;
  addBear: () => void;
};

export const createBearSlice: StateCreator<StoreState, [], [], BearSlice> = (
  set,
) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
});
```

```ts
// store/use-app-store/index.ts
import { create } from "zustand";
import { createBearSlice, type BearSlice } from "./bear-slice";
import { createFishSlice, type FishSlice } from "./fish-slice";

export type StoreState = BearSlice & FishSlice;

export const useAppStore = create<StoreState>()((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
}));
```

---

## Slices with Middleware

When adding middleware (devtools, persist) to a slice-based store, apply the middleware at the **combined store level** — not in individual slices. Slices stay pure `StateCreator` functions.

```ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension";
import { createBearSlice, type BearSlice } from "./bear-slice";
import { createFishSlice, type FishSlice } from "./fish-slice";

type StoreState = BearSlice & FishSlice;

export const useAppStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...createBearSlice(...args),
        ...createFishSlice(...args),
      }),
      { name: "app-store" },
    ),
    { name: "AppStore" },
  ),
);
```

---

## Cross-Slice Access

Slices can read state from other slices via the `get` argument:

```ts
const createBearSlice: StateCreator<StoreState, [], [], BearSlice> = (
  set,
  get,
) => ({
  bears: 0,
  addBear: () => {
    const { fishes } = get(); // access FishSlice state
    if (fishes > 0) {
      set((state) => ({ bears: state.bears + 1 }));
    }
  },
});
```

> Keep cross-slice dependencies minimal and unidirectional. If slice A needs slice B's state, slice B should not also need slice A's state — this is a sign the slice boundary is wrong.

---

## Selectors with Sliced Stores

Keep selectors in a co-located `selectors.ts` file. Selectors are plain functions — they do not import the store, only the state type:

```ts
// store/use-app-store/selectors.ts
import type { StoreState } from "./index";

export const selectBearCount = (state: StoreState) => state.bears;
export const selectFishCount = (state: StoreState) => state.fishes;
export const selectTotalAnimals = (state: StoreState) =>
  state.bears + state.fishes;
```

```ts
// In a component
import { useAppStore } from "@/store/use-app-store";
import { selectTotalAnimals } from "@/store/use-app-store/selectors";

const total = useAppStore(selectTotalAnimals);
```

Reference: [Zustand — Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
