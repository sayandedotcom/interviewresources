import { beforeEach, describe, expect, it } from "vitest";

import { SAMPLE_DISMISSED_KEY, dismissSample, isSampleDismissed } from "./sample-dismissal";

describe("sample dismissal", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts undismissed and stays dismissed once set", () => {
    expect(isSampleDismissed()).toBe(false);
    dismissSample();
    expect(window.localStorage.getItem(SAMPLE_DISMISSED_KEY)).toBe("1");
    expect(isSampleDismissed()).toBe(true);
  });

  it("treats any other stored value as undismissed", () => {
    window.localStorage.setItem(SAMPLE_DISMISSED_KEY, "false");
    expect(isSampleDismissed()).toBe(false);
  });

  it("survives a storage that throws", () => {
    // Private browsing can make any localStorage access throw. Reporting "not
    // dismissed" shows one extra row; throwing takes out the whole sidebar.
    const { getItem, setItem } = Storage.prototype;
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    Storage.prototype.setItem = () => {
      throw new Error("denied");
    };
    try {
      expect(isSampleDismissed()).toBe(false);
      expect(() => dismissSample()).not.toThrow();
    } finally {
      Storage.prototype.getItem = getItem;
      Storage.prototype.setItem = setItem;
    }
  });
});
