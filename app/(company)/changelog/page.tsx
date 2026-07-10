import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Changelog",
  description: `${siteConfig.name} changelog - new features and improvements`,
};

const changelog = [
  {
    version: "v1.0.0",
    date: "January 2025",
    changes: [
      "Initial public release",
      "AI-powered interview research",
      "Credit-based pricing system",
      "Google OAuth authentication",
    ],
  },
  {
    version: "v0.9.0",
    date: "December 2024",
    changes: [
      "Beta testing with select users",
      "Research pipeline improvements",
      "UI/UX refinements",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Changelog</h1>
      <p className="text-muted-foreground mt-4">
        Stay updated with the latest features and improvements to {siteConfig.name}.
      </p>

      <div className="mt-8 space-y-8">
        {changelog.map((release) => (
          <div key={release.version} className="relative">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center rounded-full bg-[#AEF05A]/10 px-3 py-1 text-sm font-medium text-[#AEF05A]">
                {release.version}
              </span>
              <span className="text-muted-foreground text-sm">{release.date}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {release.changes.map((change, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#AEF05A]" />
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
