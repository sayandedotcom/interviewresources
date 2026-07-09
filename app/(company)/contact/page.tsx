import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Scouting Report",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Contact Us</h1>
      <p className="text-muted-foreground mt-4">
        Have questions or feedback? We would love to hear from you.
      </p>

      <div className="mt-8 grid gap-8">
        <div className="rounded-lg border p-6">
          <h2 className="font-display text-lg font-semibold">General Inquiries</h2>
          <p className="text-muted-foreground mt-2">
            For general questions about Scouting Report, partnership opportunities, or press
            inquiries.
          </p>
          <a
            href="mailto:hello@scoutingreport.io"
            className="mt-3 inline-block text-[#AEF05A] hover:underline">
            hello@scoutingreport.io
          </a>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-display text-lg font-semibold">Technical Support</h2>
          <p className="text-muted-foreground mt-2">
            Experiencing issues with the platform? Our technical support team is here to help.
          </p>
          <a
            href="mailto:support@scoutingreport.io"
            className="mt-3 inline-block text-[#AEF05A] hover:underline">
            support@scoutingreport.io
          </a>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-display text-lg font-semibold">Security Issues</h2>
          <p className="text-muted-foreground mt-2">
            Discovered a security vulnerability? Please report it responsibly.
          </p>
          <a
            href="mailto:security@scoutingreport.io"
            className="mt-3 inline-block text-[#AEF05A] hover:underline">
            security@scoutingreport.io
          </a>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-display text-lg font-semibold">Response Time</h2>
          <p className="text-muted-foreground mt-2">
            We typically respond to all inquiries within 24-48 hours during business days. For
            urgent matters, please include &ldquo;URGENT&rdquo; in your email subject line.
          </p>
        </div>
      </div>
    </div>
  );
}
