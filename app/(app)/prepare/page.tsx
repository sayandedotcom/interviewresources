"use client";

import { useRouter } from "next/navigation";

import { ResearchExperience } from "@/features/research/research-experience";

export default function Page() {
  const router = useRouter();

  return <ResearchExperience onComplete={(researchId) => router.push(`/prepare/${researchId}`)} />;
}
