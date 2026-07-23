import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  creditsLedger,
  paymentRefunds,
  payments,
  productEvents,
  questionFeedback,
  reports,
  researches,
  users,
} from "@/lib/db/schema";

import { type TestDb, createTestDb, resetDb, seedUser } from "./harness";

const dbPromise = createTestDb();
vi.mock("@/lib/db/index", async () => ({ db: await dbPromise }));

let db: TestDb;

beforeAll(async () => {
  db = await dbPromise;
});

afterEach(async () => {
  await resetDb(db);
});

describe("account deletion foreign keys", () => {
  it("deletes all owned product data and nulls inbound referral/event identity", async () => {
    const owner = await seedUser(db);
    const referredUser = await seedUser(db, { referredBy: owner });
    const [research] = await db
      .insert(researches)
      .values({
        userId: owner,
        companyName: "Stripe",
        interviewType: "dsa",
        status: "done",
      })
      .returning({ id: researches.id });
    const [report] = await db
      .insert(reports)
      .values({ researchId: research.id, jsonPayload: { questions: [{ question: "q" }] } })
      .returning({ id: reports.id });
    await db.insert(questionFeedback).values({
      reportId: report.id,
      questionIdx: 0,
      verdict: "asked",
    });
    await db.insert(creditsLedger).values({ userId: owner, delta: 100, reason: "grant" });
    const [payment] = await db
      .insert(payments)
      .values({
        userId: owner,
        providerPaymentId: "pay_1",
        amountMinor: 100,
        currency: "USD",
        pack: "starter",
        creditsGranted: 100,
      })
      .returning({ id: payments.id });
    await db.insert(paymentRefunds).values({
      paymentId: payment.id,
      providerRefundId: "refund_1",
      amountMinor: 100,
      currency: "USD",
      creditsReversed: 100,
    });
    await db.insert(productEvents).values({ userId: owner, name: "sign_in" });

    await db.delete(users).where(eq(users.id, owner));

    expect(await db.select().from(researches)).toEqual([]);
    expect(await db.select().from(reports)).toEqual([]);
    expect(await db.select().from(questionFeedback)).toEqual([]);
    expect(await db.select().from(creditsLedger)).toEqual([]);
    expect(await db.select().from(payments)).toEqual([]);
    expect(await db.select().from(paymentRefunds)).toEqual([]);
    expect((await db.select().from(productEvents))[0].userId).toBeNull();
    expect(
      (await db.select().from(users).where(eq(users.id, referredUser)))[0].referredBy
    ).toBeNull();
  });
});
