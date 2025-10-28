import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const suite = process.env.TEST_SUITE ?? mode
  const isUnit = suite === "unit"
  const isIntegration = suite === "integration"

  const include = isUnit
    ? ["tests/Unit_test/**/*.test.{ts,tsx}"]
    : isIntegration
      ? ["tests/Integration_test/**/*.test.{ts,tsx}"]
      : ["tests/**/*.test.{ts,tsx}"]

  const reportsDirectory = isUnit
    ? "coverage/unit"
    : isIntegration
      ? "coverage/integration"
      : "coverage"

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      include,
      setupFiles: ["./tests/Unit_test/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary"],
        reportsDirectory,
      },
    },
  }
})
