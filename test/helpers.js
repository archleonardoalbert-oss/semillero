import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crearConfig } from '../server/config.js';

// Cada test trabaja en su propio directorio temporal: nunca en datos/ real.
export async function cfgTemporal() {
  const datos = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-test-'));
  return crearConfig({ datos });
}
