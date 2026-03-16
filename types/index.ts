// ──────────────────────────────────────────
// Generic utility types
// ──────────────────────────────────────────

/**
 * Make specific keys of T required while keeping the rest of the shape unchanged.
 * Use when creating a stricter variant of an existing type that requires certain optional fields.
 * @example type RequiredId<T> = RequiredKeys<T, 'id'>
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Make specific keys of T optional while keeping the rest of the shape unchanged.
 * Inverse of `RequiredKeys`. Use when relaxing a type for partial-update contexts.
 * @example type UserPatch = PartialKeys<User, 'name' | 'email'>
 */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Standard API response envelope used by Route Handlers and Server Actions.
 * Discriminate on `success` to narrow to the data or error branch.
 * @example
 * const result: ApiResponse<User> = { success: true, data: user };
 * if (result.success) console.log(result.data.name);
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/** Pagination metadata returned alongside paginated API results. */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/**
 * Paginated API response envelope. Combines a data array with `PaginationMeta`.
 * Use with `ApiResponse<PaginatedResponse<T>>` for paginated endpoints.
 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

// ──────────────────────────────────────────
// App-specific types (extend as needed)
// ──────────────────────────────────────────

/** Color scheme preference. Used by the theme store and CSS variables. */
export type Theme = "light" | "dark" | "system";

/** Generic async operation status. Use in UI state machines to track loading / success / error transitions. */
export type Status = "idle" | "loading" | "success" | "error";
