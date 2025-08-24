// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  // Ignore build artifacts
  { ignores: ["dist/**"] },

  // Typed rules for library source and tests
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "examples/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Enable type-aware linting for these files
        projectService: true
      }
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },

  // Non-typed linting for config files
  {
    files: ["*.config.ts", "*.config.js", "**/*.config.ts", "**/*.config.js"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  }
];
