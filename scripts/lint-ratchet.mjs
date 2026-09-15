#!/usr/bin/env node
// Gel de la dette lint (ratchet) : le stock d'erreurs eslint hérité ne doit
// jamais grandir. On mesure le total actuel, on le compare à
// lint-baseline.json ({"errors": N}) à la racine du dépôt, et on échoue si
// le total dépasse la baseline. Sans dépendance, Node >= 18.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const eslintBin = path.join(rootDir, "node_modules", ".bin", "eslint");

const result = spawnSync(eslintBin, [".", "-f", "json"], {
  cwd: rootDir,
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 200, // 200 Mo : le rapport JSON complet peut être volumineux
});

if (result.error) {
  console.error("Impossible de lancer eslint :", result.error.message);
  process.exit(1);
}

// eslint sort avec le code 1 dès qu'il y a au moins une erreur : c'est le
// cas normal ici (on mesure une dette existante), pas un échec du script.
if (result.status !== 0 && result.status !== 1) {
  console.error(`eslint a échoué de façon inattendue (code ${result.status})`);
  console.error(result.stderr);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (err) {
  console.error("Sortie eslint illisible (JSON attendu) :", err.message);
  console.error(result.stderr);
  process.exit(1);
}

const total = report.reduce((sum, file) => sum + file.errorCount, 0);

const baselinePath = path.join(rootDir, "lint-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const N = baseline.errors;

if (total > N) {
  const diff = total - N;
  console.log(`Dette lint : total ${total} > baseline ${N} (+${diff})`);
  process.exit(1);
}

console.log(`Dette lint : total ${total} ≤ baseline ${N}`);
if (total < N) {
  console.log(`pense à abaisser lint-baseline.json à ${total}`);
}
process.exit(0);
