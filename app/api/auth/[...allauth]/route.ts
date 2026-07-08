import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const disabledHandler = () => NextResponse.json({ enabled: false });

export const GET = auth ? auth.handler : disabledHandler;
export const POST = auth ? auth.handler : disabledHandler;
