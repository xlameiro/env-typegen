export default function Loading() {
  return (
    <main
      id="maincontent"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center"
    >
      {/* <output> has implicit role="status" — semantically correct for live regions */}
      <output>
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-foreground"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </output>
    </main>
  );
}
