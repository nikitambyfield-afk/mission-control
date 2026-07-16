import fs from 'node:fs';
import path from 'node:path';

export function loadData() {
  const p = path.join(process.cwd(), 'public', 'mission-data.json');
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
