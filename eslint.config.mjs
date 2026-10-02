import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

/** Rules that only make sense while a file is still plain JavaScript. */
const jsRules = {
  "no-unexpected-multiline": "error",
  "accessor-pairs": [
    "error",
    {
      getWithoutSet: false,
      setWithoutGet: true,
    },
  ],
  "block-scoped-var": "warn",
  "consistent-return": "error",
  curly: "error",
  "no-alert": "error",
  "no-caller": "error",
  "no-warning-comments": [
    "warn",
    {
      terms: ["TODO", "FIXME"],
      location: "start",
    },
  ],
  "no-with": "warn",
  radix: "warn",
  "no-delete-var": "error",
  "no-undef-init": "off",
  "no-undef": "error",
  "no-undefined": "off",
  "no-unused-vars": "warn",
  "no-use-before-define": "error",
  "constructor-super": "error",
  "no-class-assign": "error",
  "no-const-assign": "error",
  "no-dupe-class-members": "error",
  "no-this-before-super": "error",
  "object-shorthand": ["warn"],
  "no-mixed-spaces-and-tabs": "warn",
  "no-multiple-empty-lines": "warn",
  "no-negated-condition": "warn",
  "no-unneeded-ternary": "warn",
  "keyword-spacing": [
    "error",
    {
      before: true,
      after: true,
    },
  ],
};

export default [
  ...compat.extends("prettier"),
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      jsdoc,
    },
    rules: {
      ...jsRules,
      "jsdoc/require-returns": "warn",
      "jsdoc/require-returns-description": "warn",
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-jsdoc": "warn",
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      jsdoc,
    },
    rules: {
      // The type-aware equivalents live in `@typescript-eslint`; the base rules
      // either duplicate them or misfire on type syntax.
      ...tseslint.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-warning-comments": [
        "warn",
        { terms: ["TODO", "FIXME"], location: "start" },
      ],
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-returns-description": "warn",
      "jsdoc/require-jsdoc": "warn",
    },
  },
];
