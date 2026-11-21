// Neon Coast Cover Studio — entry program (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output (MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does. No network, no install, deterministic output.
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier text; the rest refuse an entry the scorer would refuse anyway
// (more than 4 screenshots or one over 256 KiB; more than 993 files in
// app/ or 48 MiB of app files in all, or an app/ path over 1000 bytes).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
console.log(`wrote ${out} — dossier.json ${statSync(dossierPath).size} bytes`);
