import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => {
  const suite = process.env.TEST_SUITE ?? mode
  const isUnit = suite === "unit"
  const isIntegration = suite === "integration"

  const include = isUnit
    ? ["tests/Unit_test/**/*.test.ts"]
    : isIntegration
      ? ["tests/Integration_test/**/*.test.ts"]
      : ["tests/**/*.test.ts"]

  const reportsDirectory = isUnit
    ? "coverage/unit"
    : isIntegration
      ? "coverage/integration"
      : "coverage"

  return {
    test: {
      environment: "node",
      include,
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary"],
        reportsDirectory,
      },
    },
  }
})
