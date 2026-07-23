/**
 * Audit ledger for externally visible quantitative claims.
 *
 * Do not edit `value` without also recording the evidence source and verification
 * date. The account-count snapshot is an internal aggregate, not an estimate.
 */
export const publicClaims = {
  users: {
    value: "2,345",
    source: "Production users table count snapshot",
    verifiedAt: "2026-07-23",
    owner: "founder",
  },
} as const;
