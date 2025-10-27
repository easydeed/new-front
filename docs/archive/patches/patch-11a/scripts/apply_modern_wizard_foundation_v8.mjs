/**
     * Modern Wizard Foundation v8 — apply script
     * - Ensures Legal step is always visible (legalShowIf.ts + promptFlows ts hook).
     * - Fixes SmartReview import to point to '../review/SmartReview' (kills duplicate-variant drift).
     * - Normalizes finalizeDeed import from '@/lib/deeds/finalizeDeed'.
     * - Adds invariants helper (importable) and partners route nodejs runtime.
     * Backups originals as .bak.v8. Non-destructive, idempotent.
     */
    import fs from 'fs'; import path from 'path';

    const repo = process.argv[2] || '.';
    const log = (...a)=>console.log('[foundation-v8]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const backup = p => { const bak = p + '.bak.v8'; if (!fs.existsSync(bak)) fs.copyFileSync(p, bak); return bak; };
    const exists = p => fs.existsSync(p);

    // Copy helpers (legalShowIf + invariants)
    const copies = [
      ['files/frontend/src/lib/wizard/invariants.ts', 'frontend/src/lib/wizard/invariants.ts'],
      ['files/frontend/src/lib/wizard/legalShowIf.ts', 'frontend/src/lib/wizard/legalShowIf.ts'],
    ];
    for (const [srcRel, dstRel] of copies) {
      const src = path.join(path.dirname(process.argv[1]), '..', srcRel);
      const dst = path.join(repo, dstRel);
      write(dst, read(src));
    }

    // Patch promptFlows.ts -> ensure legal uses shouldShowLegal()
    const pf = path.join(repo, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (exists(pf)) {
      let code = read(pf); backup(pf);
      if (!/from\s+['"]@\/lib\/wizard\/legalShowIf['"]/.test(code)) {
        // add import after last import block
        const m = code.match(/^(?:import[^\n]*\n)+/m);
        const stmt = `import { shouldShowLegal } from '@/lib/wizard/legalShowIf';\n`;
        code = m ? code.slice(0, m.index + m[0].length) + stmt + code.slice(m.index + m[0].length) : stmt + code;
      }
      // Replace any showIf for id 'legalDescription' to shouldShowLegal(state)
      const idIdx = code.search(/id:\s*['"]legalDescription['"]/);
      if (idIdx >= 0) {
        const showIdx = code.indexOf('showIf', idIdx);
        if (showIdx >= 0) {
          const colon = code.indexOf(':', showIdx);
          const arrow = code.indexOf('=>', colon);
          if (arrow > 0) {
            // replace arrow body safely (block or expression)
            function findEnd(src, i){
              // if block starts
              let j=i+2;
              while (j < src.length && /\s/.test(src[j])) j++;
              if (src[j] === '{') {
                // find matching }
                let depth=0, k=j;
                let inS=false,inD=false,inT=false, esc=false;
                for (; k < src.length; k++){
                  const ch=src[k], prev=src[k-1];
                  if (esc){ esc=false; continue; }
                  if (ch==='\\' && prev!=='\\'){ esc=true; continue; }
                  if (!inS && !inD && ch==='`'){ inT=!inT; continue; }
                  if (!inD && !inT && ch==='\''){ inS=!inS; continue; }
                  if (!inS && !inT && ch=='"'){ inD=!inD; continue; }
                  if (inS || inD || inT) continue;
                  if (ch==='{') depth++;
                  else if (ch==='}') { depth--; if (depth===0) return k+1; }
                }
                return -1;
              } else {
                // expression, end at first comma or closing brace/bracket at same nesting
                let k=j, dp=0, db=0, dB=0, inS=false,inD=false,inT=false, esc=false;
                for (; k < src.length; k++){
                  const ch=src[k], prev=src[k-1];
                  if (esc){ esc=false; continue; }
                  if (ch==='\\' && prev!=='\\'){ esc=true; continue; }
                  if (!inS && !inD && ch==='`'){ inT=!inT; continue; }
                  if (!inD && !inT && ch==='\''){ inS=!inS; continue; }
                  if (!inS && !inT && ch=='"'){ inD=!inD; continue; }
                  if (inS || inD || inT) continue;
                  if (ch==='(') dp++; else if (ch===')') dp--;
                  else if (ch==='[') db++; else if (ch===']') db--;
                  else if (ch==='{') dB++; else if (ch==='}') dB--;
                  else if ((ch===',' || ch==='}' || ch===']') && dp===0 && db===0 && dB===0) return k;
                }
                return -1;
              }
            }
            const end = findEnd(code, arrow);
            if (end > 0) {
              const before = code.slice(0, colon+1);
              const after  = code.slice(end);
              code = before + " (state: any) => shouldShowLegal(state)" + after;
            }
          }
        }
      }
      write(pf, code);
    } else {
      log('WARN: promptFlows.ts not found (skipping legal patch)');
    }

    // Patch ModernEngine.tsx -> SmartReview & finalizeDeed imports + add invariants hook (non-invasive)
    const me = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (exists(me)) {
      let code = read(me); backup(me);
      // Normalize SmartReview import
      code = code.replace(/from\s+['"]\.\.\/components\/SmartReview['"]/, "from '../review/SmartReview'");
      // Normalize finalizeDeed import path
      code = code.replace(/from\s+['"][^'"]*finalizeDeed['"]/, "from '@/lib/deeds/finalizeDeed'");

      // Ensure invariants import
      if (!/from\s+['"]@\/lib\/wizard\/invariants['"]/.test(code)) {
        const m = code.match(/^(?:import[^\n]*\n)+/m);
        const stmt = `import { assertStableSteps } from '@/lib/wizard/invariants';\n`;
        code = m ? code.slice(0, m.index + m[0].length) + stmt + code.slice(m.index + m[0].length) : stmt + code;
      }
      // Soft instrumentation: insert a harmless call in render/return guard
      // We try to attach to a line that computes steps or shows progress.
      code = code.replace(/(const\s+steps\s*=\s*[^;]+;)/, "$1\n// Foundation v8: assert stability if DIAG is on\nassertStableSteps(steps as any[], typeof i==='number'? i : 0, { expectedTotal: steps?.length, label: 'ModernEngine' });");
      write(me, code);
    } else {
      log('WARN: ModernEngine.tsx not found (skipping engine patch)');
    }

    // Ensure partners route exists and uses nodejs runtime
    const route = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
    if (exists(route)) {
      let code = read(route); backup(route);
      if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(code)) {
        if (/export\s+const\s+runtime\s*=/.test(code)) {
          code = code.replace(/export\s+const\s+runtime\s*=\s*['"][^'"]+['"]\s*;/, "export const runtime = 'nodejs';");
        } else {
          const m = code.match(/^(?:import[^\n]*\n)+/m);
          code = (m ? code.slice(0, m.index + m[0].length) : '') + "export const runtime = 'nodejs';\n" + (m ? code.slice(m.index + m[0].length) : code);
        }
      }
      if (!/export\s+const\s+dynamic\s*=/.test(code)) {
        code = code.replace(/(export\s+const\s+runtime\s*=\s*'nodejs'\s*;)/, "$1\nexport const dynamic = 'force-dynamic';");
      }
      write(route, code);
    } else {
      // Write our stable route if missing
      const src = path.join(path.dirname(process.argv[1]), '..', 'files/frontend/src/app/api/partners/selectlist/route.ts');
      write(route, read(src));
    }

    console.log('[foundation-v8] Apply complete.');
