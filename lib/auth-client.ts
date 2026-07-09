"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

export function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google" });
}
