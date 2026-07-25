import { Footer } from "@/components/footer";
import { SimpleHeader } from "@/components/simple-header";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SimpleHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
