import Link from "next/link";

import { siteConfig } from "@/site";

import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { LogoMark } from "@/components/logo";

/** One footer column. Links are deliberately a step larger than the old text-sm. */
function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {/* Tight `space-y` because each link now carries its own 44px tap
          target — stacking both would leave the columns absurdly tall. */}
      <ul className="mt-3 space-y-0.5">{children}</ul>
    </div>
  );
}

/** `min-h-11` = the 44px minimum touch target; footer links were ~21-24px. */
const linkClass =
  "font-display text-muted-foreground hover:text-foreground flex min-h-11 items-center text-base transition-colors";

export function Footer() {
  return (
    <footer className="mt-auto [background-image:var(--wash-bottom)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-8">
        {/* Brand block leads, then the four link columns. */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="group flex min-h-11 items-center gap-2.5">
              <LogoMark size="xl" glowClassName="bg-primary/40 opacity-0 group-hover:opacity-100" />
              <span className="font-display text-xl font-semibold tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
            <p className="font-display text-muted-foreground mt-4 max-w-xs text-base leading-relaxed">
              {siteConfig.copy.footerTagline}
            </p>
          </div>
          <Column title="Product">
            <li>
              <Link href="/#pricing" className={linkClass}>
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/interview-questions" className={linkClass}>
                Questions by company
              </Link>
            </li>
            <li>
              <Link href="/changelog" className={linkClass}>
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/help" className={linkClass}>
                Help
              </Link>
            </li>
          </Column>
          <Column title="Company">
            <li>
              <Link href="/about" className={linkClass}>
                About
              </Link>
            </li>
            <li>
              <Link href="/blog" className={linkClass}>
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                Contact
              </Link>
            </li>
          </Column>
          <Column title="Resources">
            <li>
              <Link href="/#how-it-works" className={linkClass}>
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#how-agent-works" className={linkClass}>
                Under the hood
              </Link>
            </li>
            <li>
              <Link href="/#why-us" className={linkClass}>
                Why us
              </Link>
            </li>
            <li>
              <Link href="/#trust" className={linkClass}>
                Trust
              </Link>
            </li>
            <li>
              <Link href="/licenses" className={linkClass}>
                Open Source
              </Link>
            </li>
          </Column>
          <Column title="Legal">
            <li>
              <Link href="/privacy-policy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className={linkClass}>
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/cookies" className={linkClass}>
                Cookie Policy
              </Link>
            </li>
            <li>
              <CookiePreferencesLink />
            </li>
            <li>
              <Link href="/security" className={linkClass}>
                Security
              </Link>
            </li>
          </Column>
        </div>
        <div className="border-border/50 mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <p className="font-display text-muted-foreground text-sm">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          {/* <div className="flex items-center gap-6">
            <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
              Twitter
            </a>
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-muted-foreground hover:text-foreground text-sm transition-colors">
              GitHub
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
