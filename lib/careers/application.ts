import { z } from "zod";

import { roles } from "./roles";

/**
 * The application payload, shared by the client form and the API route so the
 * two can never drift. The route is the authority: everything here is checked
 * again server-side, because the browser copy is only a convenience.
 */
export const jobApplicationSchema = z.object({
  roleSlug: z
    .string()
    .refine((slug) => roles.some((role) => role.slug === slug), "That role is not open."),
  name: z.string().trim().min(2, "Tell us your name.").max(120, "That name is too long."),
  email: z.email("That email address does not look right.").max(254),
  message: z
    .string()
    .trim()
    .min(30, "A few sentences, please. Thirty characters minimum.")
    .max(5000, "Keep it under 5000 characters."),
  /** The checkbox is the point of the field, so `true` is the only valid value. */
  consent: z.literal(true, "We need your permission to store and read your application."),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
