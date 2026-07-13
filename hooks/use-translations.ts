"use client";

import * as React from "react";

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof import("@/locales/en.json")>;

const locales = {
  en: () => import("@/locales/en.json"),
  de: () => import("@/locales/de.json"),
} as const;

export type Locale = keyof typeof locales;

const localeJsonCache: Partial<Record<Locale, Record<string, unknown>>> = {};

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}

export function useTranslations(locale: Locale = "en") {
  const [translations, setTranslations] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (localeJsonCache[locale]) {
      setTranslations(localeJsonCache[locale]!);
      return;
    }

    locales[locale]()
      .then((mod) => {
        localeJsonCache[locale] = mod as Record<string, unknown>;
        setTranslations(mod as Record<string, unknown>);
      })
      .catch(() => {
        locales.en().then((mod) => {
          setTranslations(mod as Record<string, unknown>);
        });
      });
  }, [locale]);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!translations) return key;
      let value = getNestedValue(translations, key);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return value;
    },
    [translations]
  );

  return { t, translations };
}
