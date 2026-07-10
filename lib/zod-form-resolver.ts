import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * @hookform/resolvers' zodResolver pins an internal zod-core version literal
 * that this repo's zod (4.4.3) doesn't match, which fails `tsc --noEmit`
 * even though the runtime behavior is identical. This is a minimal
 * hand-rolled equivalent: safeParse, then reshape zod's issues into RHF's
 * FieldErrors shape.
 */
export function zodFormResolver<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema
): Resolver<z.infer<TSchema>> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<z.infer<TSchema>> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!path) continue;
      // First error per field wins, matching zodResolver's default behavior.
      if (!(path in errors)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errors as any)[path] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors };
  };
}
