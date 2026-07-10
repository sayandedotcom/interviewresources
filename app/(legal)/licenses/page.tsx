import { Metadata } from "next";

import { siteConfig } from "@/site";

export const metadata: Metadata = {
  title: "Open Source Licenses",
  description: `Open Source Licenses for ${siteConfig.name}`,
};

export default function LicensesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Open Source Licenses</h1>
      <p className="text-muted-foreground mt-4">
        {siteConfig.name} is built with the following open source projects. We are grateful to all
        the developers who contribute to these projects.
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold">Next.js</h2>
          <p className="text-muted-foreground mt-2">
            MIT License - Copyright (c) Vercel, Inc. and its affiliates.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://nextjs.org</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">React</h2>
          <p className="text-muted-foreground mt-2">
            MIT License - Copyright (c) Meta Platforms, Inc. and its affiliates.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://react.dev</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Tailwind CSS</h2>
          <p className="text-muted-foreground mt-2">
            MIT License - Copyright (c) Tailwind Labs, Inc.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://tailwindcss.com</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">shadcn/ui</h2>
          <p className="text-muted-foreground mt-2">MIT License - Copyright (c) shadcn.</p>
          <p className="text-muted-foreground mt-1 text-sm">https://ui.shadcn.com</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Better Auth</h2>
          <p className="text-muted-foreground mt-2">
            MIT License - Copyright (c) better-auth contributors.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://better-auth.com</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Drizzle ORM</h2>
          <p className="text-muted-foreground mt-2">MIT License - Copyright (c) Drizzle Team.</p>
          <p className="text-muted-foreground mt-1 text-sm">https://orm.drizzle.team</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Vercel AI SDK</h2>
          <p className="text-muted-foreground mt-2">MIT License - Copyright (c) Vercel, Inc.</p>
          <p className="text-muted-foreground mt-1 text-sm">https://sdk.vercel.ai</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Lucide Icons</h2>
          <p className="text-muted-foreground mt-2">
            ISC License - Copyright (c) Lucide Contributors.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://lucide.dev</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Class Variance Authority</h2>
          <p className="text-muted-foreground mt-2">
            MIT License - Copyright (c) Class Variance Author.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">https://cva.style</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Clsx</h2>
          <p className="text-muted-foreground mt-2">MIT License - Copyright (c) Luke Edwards.</p>
          <p className="text-muted-foreground mt-1 text-sm">https://github.com/lukeed/clsx</p>
        </section>

        <section className="border-t pt-8">
          <h2 className="font-display text-xl font-semibold">Full License Text</h2>
          <p className="text-muted-foreground mt-2">
            The complete license texts for all dependencies are available at their respective GitHub
            repositories. MIT License is the most common license used by our dependencies.
          </p>
        </section>
      </div>
    </div>
  );
}
