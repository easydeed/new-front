#!/usr/bin/env node
/**
 * Phase 16 — Final Mile v8.2 (apply)
 * - Patches ModernEngine.tsx (adds a one-shot legalDescription hydrate effect; ensures onFocus/onBlur on plain input).
 * - Hardens partners selectlist route runtime and adds dynamic.
 * - Ensures PartnersContext transforms name→label and logs diagnostics when NEXT_PUBLIC_DIAG=1.
 * - Ensures finalizeDeed maps requestedBy → requested_by with diagnostics.
 */
import fs from 'fs'; import path from 'path';

    const repo = process.argv[2] || '.';
    const log = (...a)=>console.log('[v8.2/apply]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const backup = p => { const bak = p + '.bak.v8_2'; if (!fs.existsSync(bak)) fs.copyFileSync(p, bak); return bak; };
    const exists = p => fs.existsSync(p);

    // 1) ModernEngine.tsx — add one-shot hydration for legalDescription + focus/blur on plain input
    (function patchModernEngine(){
      const me = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
      if (!exists(me)) return log('WARN: ModernEngine.tsx not found — skipping ME patch');
      let code = read(me); backup(me);

      // Ensure React useRef import
      if (/from\s+['"]react['"]\s*;?/.test(code) && !/\buseRef\b/.test(code)) {
        code = code.replace(/from\s+['"]react['"]\s*;?/, (m)=> m.replace(/}.*?{/, '{').replace(/from 'react'/, "from 'react'") ); // noop, safeguard
        code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]\s*;?/, (m, g1)=>{
          const items = g1.split(',').map(s=>s.trim());
          if (!items.includes('useRef')) items.push('useRef');
          return `import { ${items.join(', ')} } from 'react';`;
        });
      }

      // Insert one-shot legal hydration effect if not present
      if (!/__didHydrateLegal/.test(code)) {
        const inject = `\n// v8.2: one-shot legal hydration (backfill from verified/formData)\nconst __didHydrateLegal = useRef(false);\nuseEffect(() => {\n  if (!hydrated || __didHydrateLegal.current) return;\n  try {\n    const data: any = typeof getWizardData === 'function' ? getWizardData() : {};\n    const v = data?.formData?.legalDescription ?? data?.verifiedData?.legalDescription ?? data?.legalDescription ?? '';\n    // backfill only if we have something and current state is empty or 'not available'\n    const cur = (state?.legalDescription || '').toString();\n    const curNorm = cur.trim().toLowerCase();\n    const shouldBackfill = v && (cur === '' || curNorm === 'not available');\n    if (shouldBackfill) {\n      setState(s => ({ ...s, legalDescription: v }));\n    }\n  } catch {}\n  __didHydrateLegal.current = true;\n}, [hydrated]);\n`;
        // Put it near other effects: after first occurrence of 'useEffect('
        const idx = code.indexOf('useEffect(');
        if (idx >= 0) code = code.slice(0, idx) + inject + code.slice(idx);
        else code += inject;
        log('added one-shot legal hydration effect');
      } else {
        log('legal hydration effect already present — skipping');
      }

      // Ensure plain <input> has onFocus/onBlur for legalDescription
      const updated = code.replace(/<input([^>]*?)\/>/gs, (m, attrs) => {
        const hasModern = /className\s*=\s*["']modern-input["']/.test(attrs);
        const hasChange = /onChange\s*=\s*\{\s*\(e\)\s*=>\s*onChange\(current\.field\s*,\s*e\.target\.value\)\s*\}/.test(attrs);
        const hasFocus = /onFocus\s*=/.test(attrs);
        const hasBlur  = /onBlur\s*=/.test(attrs);
        if (hasModern && hasChange && (!hasFocus || !hasBlur)) {
          let inject = attrs;
          if (!hasFocus) inject += ` onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}`;
          if (!hasBlur)  inject += ` onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}`;
          return `<input${inject}/>`;
        }
        return m;
      });
      code = updated;
      write(me, code);
    })();

    // 2) partners/selectlist route → nodejs + dynamic
    (function patchPartnersRoute(){
      const route = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
      if (!exists(route)) return log('WARN: partners route not found — skipping');
      let code = read(route); backup(route);
      if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(code)) {
        if (/export\s+const\s+runtime\s*=/.test(code)) {
          code = code.replace(/export\s+const\s+runtime\s*=\s*['"][^'"]+['"]\s*;/, "export const runtime = 'nodejs';");
        } else {
          code = `export const runtime = 'nodejs';\n` + code;
        }
      }
      if (!/export\s+const\s+dynamic\s*=\s*'force-dynamic'/.test(code)) {
        code = code.replace(/(export\s+const\s+runtime\s*=\s*'nodejs'\s*;)/, `$1\nexport const dynamic = 'force-dynamic';`);
      }
      write(route, code);
    })();

    // 3) PartnersContext.tsx — robust name→label transform + DIAG logs
    (function patchPartnersContext(){
      const pc = path.join(repo, 'frontend/src/features/partners/PartnersContext.tsx');
      if (!exists(pc)) return log('WARN: PartnersContext.tsx not found — skipping');
      let code = read(pc); backup(pc);

      // Insert DIAG constant if missing
      if (!/const\s+DIAG\s*=/.test(code)) {
        code = code.replace(/import\s+React[^;]*;/, (m)=> m + `\nconst DIAG = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DIAG === '1';`);
      }

      // Patch transform block: ensure label derivation
      if (!/label:\s*/.test(code) || /name:\s*/.test(code)) {
        // Try to find the map that builds options
        code = code.replace(/\.map\(\s*(\w+)\s*=>\s*\{\s*return\s*\{\s*([^}]+)\}\s*;\s*\}\s*\)/s, (m, it, body) => {
          const newBody = `
            const _label = ${it}.label ?? ${it}.name ?? ${it}.company_name ?? ${it}.displayName ?? '';
            return { ...${it}, label: _label };
          `;
          return `.map(${it} => { ${newBody} })`;
        });
        // Fallback simple replace if above didn't match: add a new transform
        if (!/return\s*\{\s*\.\.\.\w+,\s*label:/.test(code)) {
          code = code.replace(/setPartners\(\w+\);/, (m)=> m.replace(/setPartners\((\w+)\);/, (mm, v)=> `setPartners((${v} || []).map(it => ({ ...it, label: it.label ?? it.name ?? it.company_name ?? it.displayName ?? '' })));`));
        }
      }

      // Add diagnostics around setPartners
      if (!/\[PARTNERS DIAG\]/.test(code)) {
        code = code.replace(/setPartners\(/, (m)=> `if (DIAG) { console.log('[PARTNERS DIAG] setPartners call'); }\n${m}`);
        code = code.replace(/setPartners\(([^)]+)\);/, (m, arr)=> `if (DIAG) {\n  try { console.log('[PARTNERS DIAG] length:', (${arr})?.length, 'first:', (${arr})?.[0]); } catch {}\n}\nsetPartners(${arr});`);
      }

      write(pc, code);
    })();

    // 4) finalizeDeed.ts — ensure requested_by mapping + diagnostics
    (function patchFinalizeDeed(){
      const fz = path.join(repo, 'frontend/src/lib/deeds/finalizeDeed.ts');
      if (!exists(fz)) return log('WARN: finalizeDeed.ts not found — skipping');
      let code = read(fz); backup(fz);

      // Basic DIAG banner
      if (!/\[PDF DIAG\]/.test(code)) {
        code = code.replace(/export\s+async\s+function\s+finalizeDeed\s*\(/, `export async function finalizeDeed(`);
        code = code.replace(/\{\s*try\s*\{/, `{\n  try {\n    console.log('[PDF DIAG] finalizeDeed called');`);
      }

      // Ensure requested_by mapping exists
      if (!/requested_by\s*:/.test(code)) {
        code = code.replace(/const\s+backendPayload\s*:\s*[^{]*\{\s*/s, (m)=> m + `requested_by: (state?.requestedBy ?? (payload?.requestedBy)) || '',\n`);
      }

      // Strengthen diagnostics for payload
      if (!/Backend payload \(FULL\)/.test(code)) {
        code = code.replace(/const\s+backendPayload[^=]*=\s*({[\s\S]*?});/, (m, obj)=> `${m}\nconsole.log('[PDF DIAG] Backend payload (FULL):', JSON.stringify(backendPayload, null, 2));`);
      }

      write(fz, code);
    })();

    console.log('[v8.2/apply] Done.');
