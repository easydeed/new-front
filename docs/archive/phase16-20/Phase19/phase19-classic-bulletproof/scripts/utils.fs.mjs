import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function cwd() { return process.cwd(); }

export async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

export async function readJson(pathname) {
  const raw = await fs.readFile(pathname, 'utf8');
  return JSON.parse(raw);
}

export async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function backupWrite(targetPath, content, backupTag) {
  const exists = await fileExists(targetPath);
  if (exists) {
    const current = await fs.readFile(targetPath, 'utf8');
    if (current.trim() === content.trim()) {
      return { wrote: false, reason: 'unchanged' };
    }
    const backupPath = `${targetPath}.bak.${backupTag}`;
    await fs.writeFile(backupPath, current, 'utf8');
    await fs.writeFile(targetPath, content, 'utf8');
    return { wrote: true, backupPath };
  } else {
    await ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content, 'utf8');
    return { wrote: true, backupPath: null };
  }
}

export async function readText(p) {
  return fs.readFile(p, 'utf8');
}

export async function writeText(p, txt) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, txt, 'utf8');
}

export function insertAfterBody(html, injection) {
  const bodyRe = /<body[^>]*>/i;
  const m = html.match(bodyRe);
  if (!m) return null;
  const idx = html.indexOf(m[0]) + m[0].length;
  return html.slice(0, idx) + '\n' + injection + '\n' + html.slice(idx);
}
