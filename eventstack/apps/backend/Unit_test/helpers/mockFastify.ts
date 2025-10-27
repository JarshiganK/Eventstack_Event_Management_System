import { vi } from "vitest";

export function createMockFastify() {
  const handlers = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    register: vi.fn().mockResolvedValue(undefined),
  };

  const app = {
    ...handlers,
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };

  return { app: app as any, handlers };
}
