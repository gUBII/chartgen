import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      ".env*",
      ".eslintignore",
    ],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      // Next.js rules
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
