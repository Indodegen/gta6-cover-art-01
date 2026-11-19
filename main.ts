// Neon Vice Cover Studio — entry program (Node 22, standard library only).
// Hands the app in: copies this repository's app/ and screenshots/ into the
// output directory and writes /output/dossier.json with the vendored make.fun
// library. Runs twice with byte-identical output.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const target = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function fail(message) {
  throw new Error(`neon-vice main.ts: ${message}`);
}

function checkTree() {
  const appDir = join(repoRoot, 'app');
  const indexPage = join(appDir, 'index.html');
  if (!existsSync(indexPage) || !statSync(indexPage).isFile()) {
    fail('app/index.html is missing — the app cannot be handed in without it');
  }
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    fail('screenshots/ is missing — the entry needs 3 or 4 screenshots');
  }
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} files, expected 3 or 4`);
  }
}

checkTree();
mkdirSync(target, { recursive: true });
cpSync(join(repoRoot, 'app'), join(target, 'app'), { recursive: true });
mkdirSync(join(target, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(target, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the dossier bytes; the
// rest refuse an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in app/ or 48 MiB of app files in
// all, or a path under app/ over 1000 bytes).
const dossier = buildDossier(target, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(target, 'dossier.json'), dossier);
console.log(`neon-vice: wrote ${target} (dossier.json ${dossier.length} bytes)`);
