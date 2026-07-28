import { describe, expect, it, vi } from "vitest";

import { migrationDecision, runMigrations } from "./migrate-core";

describe("migrationDecision", () => {
  it("skips Vercel preview builds before requiring database credentials", () => {
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "preview" })).toMatchObject({
      action: "skip",
    });
  });

  it("requires the direct database URL for production", () => {
    expect(() => migrationDecision({ VERCEL: "1", VERCEL_ENV: "production" })).toThrow(
      /DATABASE_URL_UNPOOLED/
    );
  });
});

describe("runMigrations", () => {
  function client() {
    const calls: unknown[][] = [];
    const sql = Object.assign(
      vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push([strings.join("?"), ...values]);
        return Promise.resolve([]);
      }),
      { end: vi.fn(async () => undefined) }
    );
    return { sql, calls };
  }

  it("does no work in preview", async () => {
    const connect = vi.fn();
    await expect(runMigrations({ VERCEL: "1", VERCEL_ENV: "preview" }, { connect })).resolves.toBe(
      "skipped"
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it("holds the advisory lock around migration execution", async () => {
    const fake = client();
    const migrate = vi.fn(async () => undefined);

    await expect(
      runMigrations(
        {
          VERCEL: "1",
          VERCEL_ENV: "production",
          DATABASE_URL_UNPOOLED: "postgres://direct.example/db",
        },
        {
          connect: () => fake.sql as never,
          migrate,
          makeDatabase: () => ({}) as never,
        }
      )
    ).resolves.toBe("migrated");

    expect(fake.calls[0][0]).toContain("pg_advisory_lock");
    expect(migrate).toHaveBeenCalledOnce();
    expect(fake.calls.at(-1)?.[0]).toContain("pg_advisory_unlock");
    expect(fake.sql.end).toHaveBeenCalledOnce();
  });

  it("releases the advisory lock when migration fails", async () => {
    const fake = client();
    const migrate = vi.fn(async () => {
      throw new Error("ddl failed");
    });

    await expect(
      runMigrations(
        { DATABASE_URL_UNPOOLED: "postgres://direct.example/db" },
        { connect: () => fake.sql as never, migrate, makeDatabase: () => ({}) as never }
      )
    ).rejects.toThrow("ddl failed");

    expect(fake.calls.at(-1)?.[0]).toContain("pg_advisory_unlock");
    expect(fake.sql.end).toHaveBeenCalledOnce();
  });

  it("serializes concurrent migration runners with the advisory lock", async () => {
    let locked = false;
    const waiters: (() => void)[] = [];
    let lockRequests = 0;
    const connect = () => {
      const sql = Object.assign(
        (strings: TemplateStringsArray) => {
          const query = strings.join("?");
          if (query.includes("pg_advisory_lock")) {
            lockRequests++;
            if (!locked) {
              locked = true;
              return Promise.resolve([]);
            }
            return new Promise<unknown[]>((resolve) => waiters.push(() => resolve([])));
          }
          locked = false;
          waiters.shift()?.();
          return Promise.resolve([]);
        },
        { end: vi.fn(async () => undefined) }
      );
      return sql as never;
    };

    let releaseFirst!: () => void;
    const firstPaused = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let entered = 0;
    let active = 0;
    let maxActive = 0;
    const migrate = vi.fn(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      entered++;
      if (entered === 1) await firstPaused;
      active--;
    });
    const deps = {
      connect,
      migrate,
      makeDatabase: () => ({}) as never,
    };
    const env = { DATABASE_URL_UNPOOLED: "postgres://direct.example/db" };

    const first = runMigrations(env, deps);
    while (entered === 0) await Promise.resolve();
    const second = runMigrations(env, deps);
    while (lockRequests < 2) await Promise.resolve();
    releaseFirst();
    await Promise.all([first, second]);

    expect(maxActive).toBe(1);
    expect(migrate).toHaveBeenCalledTimes(2);
  });
});
