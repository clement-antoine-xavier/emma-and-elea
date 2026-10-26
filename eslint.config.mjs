import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.test.{ts,tsx}", "jest.setup.ts"],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ["playwright.config.ts", "jest.config.ts", "e2e/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // The layered backend: entry points never reach into Prisma or Better Auth.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/api/auth/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Import a repository from src/server/repositories instead.",
            },
            {
              name: "@/lib/auth",
              message:
                "Use the session helper in src/server/auth/actor or the auth gateway.",
            },
          ],
          patterns: [
            {
              group: ["@/server/repositories/*"],
              message:
                "Entry points call services, not repositories. Add a service method.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message: "Client components cannot import Prisma.",
            },
            {
              name: "@/lib/auth",
              message: "Client components cannot import the server auth instance.",
            },
          ],
          patterns: [
            {
              group: ["@/server/repositories/*", "@/server/services/*"],
              message:
                "Client components call Server Actions, not server layers.",
            },
            {
              group: ["@/server/auth/*"],
              message:
                "Client components receive already-authorized data as props.",
            },
          ],
        },
      ],
    },
  },
  // Services, validators and domain code stay framework-agnostic.
  {
    files: [
      "src/server/services/**/*.ts",
      "src/server/validators/**/*.ts",
      "src/server/domain/**/*.ts",
    ],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Only repositories import Prisma. Call a repository method.",
            },
            {
              name: "@/lib/auth",
              message:
                "Services use the auth gateway; domain and validators use plain data.",
            },
          ],
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom"],
              message:
                "Services and domain code must not depend on Next.js or React.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
