import { ResearchExperience } from "@/features/research/research-experience";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { faqJsonLd } from "@/lib/seo/json-ld";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />

      <section className="mx-auto w-full max-w-3xl px-5 pt-12 pb-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Reconnaissance before the interview
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Get the questions
          <br />
          before they ask them.
        </h1>
        <p className="mt-4 max-w-xl font-display text-[15px] leading-relaxed text-muted-foreground">
          Paste a company. We research its product, stack, engineering culture,
          reported interview loop, and — if you name one — the
          interviewer&rsquo;s public work, then predict the questions
          you&rsquo;re likely to face. Each one cites the evidence it came from.
        </p>
      </section>

      <ResearchExperience />

      <section className="mx-auto w-full max-w-3xl px-5 py-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          How it works
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-display text-sm font-semibold">1. Name a target</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the company — and an interviewer, if you know one.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">2. We research</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Product, stack, engineering culture, and reported interview loops
              from public sources.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">3. Get cited questions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every predicted question links back to the evidence it came from.
            </p>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

<Footer />
    </main>
  );
}
