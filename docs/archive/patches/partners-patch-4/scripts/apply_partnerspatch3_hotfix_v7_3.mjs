/**
 * Partners‑Patch‑3 Hotfix v7.3
 *  - Adds onFocus/onBlur to the regular <input> path in ModernEngine.tsx,
 *    so legalDescription (type: 'text') sets __editing_legal while typing.
 *  - Switches partners selectlist route to Node.js runtime to avoid 404 on Vercel Edge.
 * The patcher is multiline‑aware and creates .bak.v7_3 backups next to originals.
 */
import fs from 'fs';
import path from 'path';

const repo = process.argv[2] || '.';
const log = (...a)=>console.log('[hotfix-v7.3]', ...a);
const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
const backup = p => { const bak = p + '.bak.v7_3'; if (!fs.existsSync(bak)) fs.copyFileSync(p, bak); return bak; };

// 1) ModernEngine.tsx — add onFocus/onBlur on the regular <input> fallback
const mePath = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
if (fs.existsSync(mePath)) {
  let code = read(mePath);
  backup(mePath);

  // Find regular <input .../> that updates state via onChange={(e) => onChange(current.field, e.target.value)}
  // We'll scan for each <input .../> and patch those that match the criteria.
  function scanAndPatchInputs(src) {
    let out = '', i = 0;
    while (true) {
      const start = src.indexOf('<input', i);
      if (start < 0) { out += src.slice(i); break; }
      out += src.slice(i, start);
      // Find end of this input tag (self-closing '/>' or '>')
      let j = start + 6; // after '<input'
      let inS=false,inD=false,inT=false, esc=false;
      while (j < src.length) {
        const ch = src[j], prev = src[j-1];
        if (esc) { esc=false; j++; continue; }
        if (ch==='\\' && prev!=='\\') { esc=true; j++; continue; }
        if (!inS && !inD && ch==='`') { inT=!inT; j++; continue; }
        if (!inD && !inT && ch==='\'') { inS=!inS; j++; continue; }
        if (!inS && !inT && ch=='"') { inD=!inD; j++; continue; }
        if (inS || inD || inT) { j++; continue; }
        // If we reach '/>' or just '>' end the tag
        if (ch==='/' && src[j+1]==='>') { j+=2; break; }
            if (ch==='>') { j+=1; break; }
            j++;
          }
          const tag = src.slice(start, j);
          let newTag = tag;

          const looksModernInput = /className\s*=\s*["']modern-input["']/.test(tag);
          const updatesCurrentField = /onChange\s*=\s*\{\s*\(e\)\s*=>\s*onChange\(\s*current\.field\s*,\s*e\.target\.value\s*\)\s*\}/.test(tag);
          const alreadyHasFocus = /onFocus\s*=/.test(tag);
          const alreadyHasBlur = /onBlur\s*=/.test(tag);

          if (looksModernInput && updatesCurrentField) {
            // Inject handlers if missing
            const insertionPos = newTag.lastIndexOf('/>') >= 0 ? newTag.lastIndexOf('/>') : newTag.lastIndexOf('>');
            const indentMatch = newTag.match(/\n([ \t]*)[^\n]*$/);
            const indent = indentMatch ? indentMatch[1] : '  ';
            let inject = '';
            if (!alreadyHasFocus) inject += `\n${indent}onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}`;
            if (!alreadyHasBlur)  inject += `\n${indent}onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}`;
            if (inject) {
              newTag = newTag.slice(0, insertionPos) + inject + newTag.slice(insertionPos);
              log('patched <input> with focus/blur for legalDescription');
            }
          }

          out += newTag;
          i = j;
        }
        return out;
      }

      const patched = scanAndPatchInputs(code);
      if (patched !== code) {
        write(mePath, patched);
      } else {
        log('WARN: No matching <input> found to patch in ModernEngine.tsx (already patched or different structure).');
      }
    } else {
      log('WARN: ModernEngine.tsx not found — skipping input patch.');
    }

    // 2) Next.js partners route — switch to nodejs runtime (or add route if missing)
    const routePath = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
    if (fs.existsSync(routePath)) {
      let code = read(routePath);
      backup(routePath);
      // Replace export const runtime to nodejs, or add if missing
      if (/export\s+const\s+runtime\s*=/.test(code)) {
        code = code.replace(/export\s+const\s+runtime\s*=\s*['"]edge['"]\s*;/, "export const runtime = 'nodejs';");
        code = code.replace(/export\s+const\s+runtime\s*=\s*['"][^'"]+['"]\s*;/, "export const runtime = 'nodejs';");
      } else {
        // insert after first import
        const m = code.match(/^(?:import[^\n]*\n)+/m);
        if (m) {
          const insertAt = m.index + m[0].length;
          code = code.slice(0, insertAt) + "export const runtime = 'nodejs';\n" + code.slice(insertAt);
        } else {
          code = "export const runtime = 'nodejs';\n" + code;
        }
      }
      // Ensure no caching surprises
      if (!/export\s+const\s+dynamic\s*=/.test(code)) {
        code = code.replace(/(export\s+const\s+runtime\s*=\s*['"]nodejs['"]\s*;)/, "$1\nexport const dynamic = 'force-dynamic';");
      }
      write(routePath, code);
    } else {
      // Provide a safe default route implementation
      const def = `import { NextRequest } from 'next/server';\nexport const runtime = 'nodejs';\nexport const dynamic = 'force-dynamic';\nconst API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';\nexport async function GET(req: NextRequest) {\n  try {\n    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';\n    const org = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id') || '';\n    const url = \`\${API_BASE}/api/partners/selectlist\`;\n    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': auth || '', 'x-organization-id': org || '', 'accept': 'application/json' } as any, cache: 'no-store' });\n    const text = await res.text();\n    const ct = res.headers.get('content-type') || 'application/json';\n    return new Response(text, { status: res.status, headers: { 'content-type': ct } });\n  } catch (e:any) {\n    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500 });\n  }\n}\n`;
      write(routePath, def);
    }

    console.log('[hotfix-v7.3] Done.');
