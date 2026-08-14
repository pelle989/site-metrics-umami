/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const aliases = (process.env.TRACKER_SCRIPT_NAME || '')
  .split(',')
  .map(name => name.trim().replace(/^\/+/, ''))
  .filter(Boolean);

const tracker = path.resolve(process.cwd(), 'public/script.js');

for (const alias of aliases) {
  if (alias.includes('..') || path.dirname(alias) !== '.') {
    throw new Error(`Invalid tracker script alias: ${alias}`);
  }

  fs.copyFileSync(tracker, path.resolve(process.cwd(), 'public', alias));
  console.log(`Created tracker script alias: /${alias}`);
}
