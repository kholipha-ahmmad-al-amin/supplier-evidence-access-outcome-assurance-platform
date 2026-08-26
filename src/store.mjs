import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class AtomicStore {
  constructor(path) {
    this.path = path;
  }

  read() {
    try {
      const data = JSON.parse(readFileSync(this.path, 'utf8'));
      return { accessOutcomeReviews: Array.isArray(data.accessOutcomeReviews) ? data.accessOutcomeReviews : [] };
    } catch (error) {
      if (error.code === 'ENOENT') return { accessOutcomeReviews: [] };
      throw error;
    }
  }

  write(data) {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(data, null, 2));
    renameSync(temporaryPath, this.path);
  }
}
