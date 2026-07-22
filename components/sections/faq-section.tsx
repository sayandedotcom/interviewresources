import { siteConfig } from "@/site";

import { Section } from "@/components/sections/section";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqSection() {
  const { landing } = siteConfig.copy;

  return (
    <Section tone="plain">
      <h2 className="font-display mb-10 text-4xl font-semibold tracking-tight sm:text-5xl">
        {landing.faq.title}
      </h2>
      <Accordion defaultValue={[0]}>
        {siteConfig.faqs.map((faq, i) => (
          <AccordionItem key={i} value={i}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionPanel>{faq.answer}</AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
