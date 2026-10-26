import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

// `next-intl`, `use-intl`, and their FormatJS dependencies ship ESM only, so
// Jest has to transform them.
// https://next-intl.dev/docs/environments/testing#jest
const esmPackages = ['next-intl', 'use-intl', '@formatjs', 'intl-messageformat'];

const jestConfig = async () => ({
  ...(await createJestConfig(config)()),
  transformIgnorePatterns: [
    `node_modules/(?!(${esmPackages.join('|')})/)`,
  ],
});

export default jestConfig;
