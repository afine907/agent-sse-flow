#!/usr/bin/env node

/**
 * Bundle Size Checker
 *
 * Measures and reports the sizes of all files in dist/.
 * Optionally checks against a budget (default 50 kB gzipped).
 *
 * Usage:
 *   node scripts/bundle-size.mjs              # report sizes
 *   node scripts/bundle-size.mjs --budget 50   # fail if gzip > 50 kB
 */

import { readdir, stat, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';

const DIST_DIR = resolve(process.cwd(), 'dist');

/** Get file size in bytes */
async function fileSize(path) {
  const s = await stat(path);
  return s.size;
}

/** Get gzipped size by reading through zlib */
async function gzipSize(path) {
  const buf = await readFile(path);
  return gzipSync(buf).length;
}

/** Format bytes as human-readable string */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

/** Determine the size category label */
function sizeLabel(bytes) {
  if (bytes < 5_000) return 'tiny';
  if (bytes < 20_000) return 'small';
  if (bytes < 50_000) return 'medium';
  if (bytes < 100_000) return 'large';
  return 'oversized';
}

async function main() {
  const budgetArg = process.argv.indexOf('--budget');
  const budgetKB = budgetArg !== -1 ? parseFloat(process.argv[budgetArg + 1]) : 50;
  const budgetBytes = budgetKB * 1024;

  let files;
  try {
    files = await readdir(DIST_DIR);
  } catch {
    console.error('Error: dist/ directory not found. Run "pnpm build" first.');
    process.exit(1);
  }

  const results = [];
  let totalRaw = 0;
  let totalGzip = 0;

  for (const file of files) {
    const filePath = join(DIST_DIR, file);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) continue;

    const raw = await fileSize(filePath);
    const gzip = await gzipSize(filePath);
    totalRaw += raw;
    totalGzip += gzip;

    results.push({
      file,
      raw,
      gzip,
      label: sizeLabel(gzip),
    });
  }

  // Sort by gzip size descending
  results.sort((a, b) => b.gzip - a.gzip);

  // Print report
  console.log('\nBundle Size Report\n');
  console.log(
    'File'.padEnd(35) +
    'Raw'.padStart(12) +
    'Gzip'.padStart(12) +
    '  Status',
  );
  console.log('-'.repeat(65));

  for (const r of results) {
    const statusIcon =
      r.gzip > budgetBytes ? 'OVER BUDGET' :
      r.gzip > budgetBytes * 0.8 ? 'warning' :
      'ok';
    console.log(
      r.file.padEnd(35) +
      formatBytes(r.raw).padStart(12) +
      formatBytes(r.gzip).padStart(12) +
      `  ${statusIcon}`,
    );
  }

  console.log('-'.repeat(65));
  console.log(
    'TOTAL'.padEnd(35) +
    formatBytes(totalRaw).padStart(12) +
    formatBytes(totalGzip).padStart(12) +
    `  (budget: ${formatBytes(budgetBytes)} gzip)`,
  );
  console.log();

  // Output JSON for CI consumption
  const jsonOutput = {
    files: results,
    total: { raw: totalRaw, gzip: totalGzip },
    budget: budgetBytes,
    passed: totalGzip <= budgetBytes,
  };
  console.log('JSON Output:');
  console.log(JSON.stringify(jsonOutput, null, 2));

  if (totalGzip > budgetBytes) {
    console.error(
      `\nBundle size (${formatBytes(totalGzip)}) exceeds budget (${formatBytes(budgetBytes)}).`,
    );
    process.exit(1);
  }

  console.log('\nBundle size is within budget.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
