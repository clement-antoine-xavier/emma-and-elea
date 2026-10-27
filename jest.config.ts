import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  // Coverage is measured against the source rather than the files a suite
  // happens to import, otherwise untested modules are invisible.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/generated/**",
    "!src/**/*.d.ts",
    "!src/astryx-themes.ts",
    "!src/types/**",
    "!src/test-utils/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.integration.test.ts",
    // Type-only or framework configuration covered by E2E/integration runs.
    "!src/lib/dto.ts",
    "!src/lib/auth.ts",
    "!src/lib/auth-client.ts",
    "!src/lib/prisma.ts",
    // Route components are exercised by Playwright; see ADR-0019.
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
    "!src/app/providers.tsx",
  ],
  coverageReporters: ["text", "lcov", "json-summary"],
  // Repositories are covered by the real-PostgreSQL suite (ADR-0019), so the
  // unit report is dominated by services, domain, validators and route-level
  // action/component tests. The thresholds sit just below the achieved values
  // to catch regressions without blocking refactors.
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 70,
      functions: 60,
      lines: 30,
    },
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
    // Integration suites need a real PostgreSQL connection; run them with
    // `npm run test:integration`.
    "\\.integration\\.test\\.ts$",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

// `next-intl`, `use-intl`, and their FormatJS dependencies ship ESM only, so
// Jest has to transform them.
// https://next-intl.dev/docs/environments/testing#jest
const esmPackages = [
  'next-intl',
  'use-intl',
  '@formatjs',
  'intl-messageformat',
  'better-auth',
  '@better-auth',
];

const jestConfig = async () => ({
  ...(await createJestConfig(config)()),
  transformIgnorePatterns: [
    `node_modules/(?!(${esmPackages.join('|')})/)`,
  ],
});

export default jestConfig;
