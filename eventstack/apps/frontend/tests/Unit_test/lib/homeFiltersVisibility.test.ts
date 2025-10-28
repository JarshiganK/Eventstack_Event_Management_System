import { describe, expect, it } from "vitest";
import {
  getHomeCategoryFiltersVisible,
  setHomeCategoryFiltersVisible,
  HOME_CATEGORY_FILTERS_VISIBILITY,
} from "../../../src/lib/homeFiltersVisibility";

describe("homeFiltersVisibility", () => {
  it("stores visibility preference in localStorage", () => {
    setHomeCategoryFiltersVisible(false);
    expect(localStorage.getItem(HOME_CATEGORY_FILTERS_VISIBILITY.STORAGE_KEY)).toBe("false");
    expect(getHomeCategoryFiltersVisible()).toBe(false);
  });

  it("emits an event when visibility changes", () => {
    let received = false;
    window.addEventListener(HOME_CATEGORY_FILTERS_VISIBILITY.EVENT, () => {
      received = true;
    });
    setHomeCategoryFiltersVisible(true);
    expect(received).toBe(true);
  });
});
