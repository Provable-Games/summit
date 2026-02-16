import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: [
            "questGuides",
            "useController",
            "useDynamicConnector",
            "useGameDirector",
            "useQuestGuide",
            "useSound",
            "useStatistics",
          ],
        },
      ],
      // TS handles component props typing; keep these as non-blocking signals.
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Downgrade to warn — existing codebase has these patterns
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "no-useless-assignment": "warn",
      "no-empty": "warn",
    },
  },
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test.js",
      "**/*.test.jsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.spec.js",
      "**/*.spec.jsx",
    ],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: [
      "eslint.config.js",
      "vite.config.ts",
      "vitest.config.ts",
      "scripts/**/*.ts",
      "scripts/**/*.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
