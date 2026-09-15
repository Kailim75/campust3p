import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Config flat dédiée, séparée de eslint.config.js : une seule règle,
// bloquante, pour ne pas dépendre de la résorption de la dette lint
// générale (cf. lint-baseline.json / scripts/lint-ratchet.mjs).
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "react-hooks": reactHooks,
      // Enregistré (sans activer aucune de ses règles) pour que les commentaires
      // eslint-disable existants référençant des règles @typescript-eslint restent
      // valides sous cette config restreinte — sinon ESLint échoue avec
      // "Definition for rule '@typescript-eslint/...' was not found".
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
);
