import { ButtonLink } from "@/components/ui/button-link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <main
      id="maincontent"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      tabIndex={-1}
    >
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <ButtonLink href="/">Go back home</ButtonLink>
    </main>
  );
}
