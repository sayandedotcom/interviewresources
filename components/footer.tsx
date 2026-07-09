import Link from "next/link";

import { siteConfig } from "@/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <h3 className="font-display text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Company</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Resources</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/how-it-works"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Guides
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <div className="flex items-center gap-2">
            <span className="bg-primary relative inline-block h-2.5 w-2.5 rotate-45">
              <span className="bg-tertiary/40 absolute inset-0 rounded-sm blur-md" />
            </span>
            <span className="font-display text-sm font-semibold">Scouting Report</span>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground font-mono text-[10px]">
              Prep intelligence, not prophecy.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-muted-foreground hover:text-foreground text-[10px] tracking-widest uppercase transition-colors">
                Twitter
              </a>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-muted-foreground hover:text-foreground text-[10px] tracking-widest uppercase transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
