import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useDebounce } from "../../../src/lib/debounce";

function DebounceTester(props: { value: string; onDebounced: (value: string) => void }) {
  useDebounce(props.value, 50, props.onDebounced);
  return null;
}

describe("useDebounce", () => {
  it("invokes callback after delay", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { rerender } = render(<DebounceTester value="one" onDebounced={handler} />);
    rerender(<DebounceTester value="two" onDebounced={handler} />);
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(55);
    expect(handler).toHaveBeenCalledWith("two");
    vi.useRealTimers();
  });
});
