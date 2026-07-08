import { dodoPaymentsConfig } from "@/lib/payments";
import { Checkout } from "@dodopayments/nextjs";
import { NextResponse } from "next/server";

const disabledHandler = () => NextResponse.json({ enabled: false });

export const GET = dodoPaymentsConfig
  ? Checkout({
      bearerToken: dodoPaymentsConfig.bearerToken,
      returnUrl: dodoPaymentsConfig.returnUrl,
      environment: dodoPaymentsConfig.environment,
      type: "static",
    })
  : disabledHandler;

export const POST = dodoPaymentsConfig
  ? Checkout({
      bearerToken: dodoPaymentsConfig.bearerToken,
      returnUrl: dodoPaymentsConfig.returnUrl,
      environment: dodoPaymentsConfig.environment,
      type: "session",
    })
  : disabledHandler;
