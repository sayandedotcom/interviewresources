import { dodoPaymentsConfig } from "@/lib/payments";
import { Webhooks } from "@dodopayments/nextjs";
import { NextResponse } from "next/server";

const disabledHandler = () => NextResponse.json({ enabled: false });

export const POST = dodoPaymentsConfig
  ? Webhooks({
      webhookKey: dodoPaymentsConfig.webhookKey,
      onPaymentSucceeded: async (payload) => {
        console.log("Payment succeeded:", payload);
      },
      onCreditAdded: async (payload) => {
        console.log("Credit added:", payload);
      },
    })
  : disabledHandler;
