import { siteConfig } from "@/site";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/blog",
  title: "Blog",
  description: `${siteConfig.name} Blog - Interview tips and insights`,
});

const posts = [
  {
    title: "How AI is Transforming Interview Preparation",
    excerpt:
      "Exploring how artificial intelligence is changing the way candidates prepare for technical interviews.",
    date: "January 2025",
    readTime: "5 min read",
  },
  {
    title: "Top 10 Questions to Ask Your Interviewer",
    excerpt:
      "Make a lasting impression with these thoughtful questions that showcase your interest and preparation.",
    date: "December 2024",
    readTime: "4 min read",
  },
  {
    title: "How to Research a Company Before Your Interview",
    excerpt: "A comprehensive guide to gathering intelligence about your potential employer.",
    date: "November 2024",
    readTime: "6 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Blog</h1>
      <p className="text-muted-foreground mt-4">
        Insights, tips, and best practices for interview preparation.
      </p>

      <div className="mt-8 grid gap-6">
        {posts.map((post, i) => (
          <article
            key={i}
            className="group hover:border-primary/50 cursor-pointer rounded-lg border p-6 transition-colors">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
            <h2 className="font-display group-hover:text-primary mt-2 text-xl font-semibold transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground mt-2">{post.excerpt}</p>
            <span className="text-primary mt-3 inline-block text-sm font-medium">Read more →</span>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          More articles coming soon. Subscribe to our newsletter to stay updated.
        </p>
      </div>
    </div>
  );
}
