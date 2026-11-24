/**
 * Lightweight "lint" for the API: imports every module so syntax errors and
 * broken import paths fail fast. Run with: npm run lint --workspace @stocklume/api
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const skip = new Set(['server.js', 'worker.js']); // start servers or need the Workers runtime

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') && !skip.has(entry.name) ? [full] : [];
  });
}

let failed = 0;
for (const file of walk(srcDir)) {
  try {
    await import(pathToFileURL(file).href);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${file}\n  ${err.message}`);
  }
}
console.log(failed ? `\n${failed} file(s) failed` : 'All API modules import cleanly.');
process.exit(failed ? 1 : 0);
