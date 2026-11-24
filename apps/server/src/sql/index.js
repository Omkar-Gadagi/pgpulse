// Loads the .sql files in this folder once at startup.
// Keeping SQL in real .sql files (not template strings) means it gets
// syntax highlighting, is easy to review, and can be pasted into psql as-is.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadSql(name) {
  return readFileSync(path.join(here, `${name}.sql`), 'utf8');
}
