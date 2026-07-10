"use client";

import { useRouter } from "next/navigation";

import { type Me, ResearchExperience } from "@/features/research/research-experience";

export function PrepareClient({ initialMe }: { initialMe: Me }) {
  const router = useRouter();

  return (
    <ResearchExperience
      initialMe={initialMe}
      onComplete={(researchId) => router.push(`/prepare/${researchId}`)}
    />
  );
}
