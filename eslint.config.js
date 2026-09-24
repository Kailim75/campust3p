import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `.claude/` : les sous-agents y créent des copies complètes du dépôt
  // (worktrees). Sans cet ignore, `eslint .` les lint comme du code du CRM et
  // la dette locale triple (4029 au lieu de 1046, 24/09/2026) — une fausse
  // alerte que la CI, partie d'un dépôt propre, ne voit jamais.
  { ignores: ["dist", ".claude"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Warn on debug noise that shouldn't ship to prod (console.warn/error still allowed)
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
);
