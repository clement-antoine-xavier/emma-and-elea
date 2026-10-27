import type {Config} from "jest";
import nextJest from "next/jest.js";

/**
 * Repository and transaction tests against the real PostgreSQL database.
 * They live in `*.integration.test.ts` files and are excluded from the default
 * Jest run. Use `npm run test:integration` with `DATABASE_URL` set.
 */
const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/*.integration.test.ts"],
  testTimeout: 30_000,
  // The pg pool occasionally keeps a worker alive after `$disconnect()` has
  // already released the queries; letting Jest force the exit keeps CI green.
  forceExit: true,
  // Suites share one database and clean up their own rows; serial execution
  // keeps the fixtures predictable.
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

// Prisma 7's runtime ships `.mjs` files next to its CommonJS entry points;
// Jest must transform them instead of requiring them as CommonJS.
const esmPackages = [
  "next-intl",
  "use-intl",
  "@formatjs",
  "intl-messageformat",
  "@prisma",
];

const jestConfig = async () => ({
  ...(await createJestConfig(config)()),
  transformIgnorePatterns: [`node_modules/(?!(${esmPackages.join("|")})/)`],
});

export default jestConfig;
