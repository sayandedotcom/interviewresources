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
                <Link href="/" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Company</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Resources</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Guides
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="font-display text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-primary" aria-hidden />
            <span className="font-display text-sm font-semibold">Scouting Report</span>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] text-muted-foreground">
              Prep intelligence, not prophecy.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Twitter
              </a>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
