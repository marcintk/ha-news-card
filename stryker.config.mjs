/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.mjs" },
  coverageAnalysis: "perTest",
  reporters: ["clear-text"],
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
  ignorePatterns: ["dist", "coverage", "docs", ".claude", ".idea", ".vscode"],
};
