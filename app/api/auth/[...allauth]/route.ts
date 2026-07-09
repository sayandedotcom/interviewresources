import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

const disabledHandler = () => NextResponse.json({ enabled: false });

const handlers = auth ? toNextJsHandler(auth) : null;

export const GET = handlers ? handlers.GET : disabledHandler;
export const POST = handlers ? handlers.POST : disabledHandler;
