import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const repoRoot = process.argv[2] || '.';
    const base = path.join(__dirname, '..');

    const log = (...a) => console.log('[apply-stability-diag-v7.1]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const exists = p => fs.existsSync(p);

    // Copy files
    const copies = [
      ['files/frontend/src/lib/diag/log.ts', 'frontend/src/lib/diag/log.ts'],
      ['files/frontend/src/features/partners/PartnersContext.tsx', 'frontend/src/features/partners/PartnersContext.tsx'],
      ['files/frontend/src/app/api/partners/selectlist/route.ts', 'frontend/src/app/api/partners/selectlist/route.ts'],
      ['files/frontend/src/lib/wizard/legalShowIf.ts', 'frontend/src/lib/wizard/legalShowIf.ts'],
      ['files/frontend/src/features/wizard/mode/components/PrefillCombo.tsx', 'frontend/src/features/wizard/mode/components/PrefillCombo.tsx'],
    ];
    for (const [srcRel, dstRel] of copies) {
      const src = path.join(base, srcRel);
      const dst = path.join(repoRoot, dstRel);
      write(dst, read(src));
    }

    // Patch promptFlows.ts -> import shouldShowLegal + use it for legalDescription.showIf
    const pf = path.join(repoRoot, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (exists(pf)) {
      let code = read(pf);
      if (!/from\s+['"]@\/lib\/wizard\/legalShowIf['"]/.test(code)) {
        code = code.replace(/(import[^\n]+;\s*)$/, "$1\nimport { shouldShowLegal } from '@/lib/wizard/legalShowIf';\n");
      }
      const re = /(id:\s*['"]legalDescription['"][\s\S]*?showIf:\s*\(state[\s\S]*?\)\s*=>\s*)([^,\n]+)(,?)/m;
      if (re.test(code)) {
        code = code.replace(re, (m, head, _old, tail) => head + 'shouldShowLegal(state)' + (tail || ''));
        write(pf, code);
      } else {
        log('WARN: Could not patch legalDescription showIf (pattern not found)');
      }
    } else {
      log('WARN: promptFlows.ts not found; skipping legal patch');
    }

    // Patch ModernEngine.tsx -> wire usePartners + PrefillCombo onFocus/onBlur for legalDescription
    const me = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (exists(me)) {
      let code = read(me);
      if (!/usePartners\(\)/.test(code)) {
        code = code.replace(/(import[^\n]+;\s*)$/, "$1\nimport { usePartners } from '@/features/partners/PartnersContext';\n");
        code = code.replace(/(export\s+default\s+function\s+ModernEngine[^{]+\{)/, (m) => m + `
  const { partners, loading: partnersLoading, error: partnersError } = usePartners();
`);
      }
      // Ensure PrefillCombo receives partners & focus hooks for requestedBy / legalDescription
      code = code.replace(/<PrefillCombo([^>]+)>/g, (match) => {
        let updated = match;
        if (!/partners=\{/.test(updated)) {
          updated = updated.replace(/>$/, ' partners={current.field === \'requestedBy\' ? partners : []}>');
        }
        if (!/allowNewPartner=\{/.test(updated)) {
          updated = updated.replace(/>$/, ' allowNewPartner={current.field === \'requestedBy\'}>');
        }
        if (!/onFocus=\{/.test(updated)) {
          updated = updated.replace(/>$/, ' onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}>');
        }
        if (!/onBlur=\{/.test(updated)) {
          updated = updated.replace(/>$/, ' onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}>');
        }
        return updated;
      });
      write(me, code);
    } else {
      log('WARN: ModernEngine.tsx not found; manual wiring may be required');
    }

    console.log('[apply-stability-diag-v7.1] Complete.');
