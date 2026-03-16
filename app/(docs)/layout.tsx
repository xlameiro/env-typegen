import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { NPM_URL } from "@/lib/constants";
import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export default function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: "env-typegen",
        url: "/",
        // Keep the same background as the page — no distinct nav bar
        transparentMode: "top",
      }}
      links={[
        {
          type: "main",
          text: "npm",
          url: NPM_URL,
          external: true,
        },
      ]}
      // Swap fumadocs' next-themes toggle with our Zustand-based one
      themeSwitch={{ component: <ThemeToggle mode="light-dark" /> }}
      sidebar={{
        collapsible: true,
        defaultOpenLevel: 1,
        footer: <SiteFooter />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
