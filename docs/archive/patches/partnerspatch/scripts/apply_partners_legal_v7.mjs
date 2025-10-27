import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const repoRoot = process.argv[2] || '.';
    const base = path.join(__dirname, '..');

    const log = (...a) => console.log('[apply-partners-legal-v7]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const exists = p => fs.existsSync(p);

    // 0) Copy files
    const copies = [
      ['files/frontend/src/app/api/partners/selectlist/route.ts', 'frontend/src/app/api/partners/selectlist/route.ts'],
      ['files/frontend/src/features/partners/PartnersContext.tsx', 'frontend/src/features/partners/PartnersContext.tsx'],
      ['files/frontend/src/features/wizard/mode/components/PrefillCombo.tsx', 'frontend/src/features/wizard/mode/components/PrefillCombo.tsx'],
    ];
    for (const [srcRel, dstRel] of copies) {
      const src = path.join(base, srcRel);
      const dst = path.join(repoRoot, dstRel);
      write(dst, read(src));
    }

    // 1) Patch promptFlows.ts — legalDescription showIf robustness
    const pf = path.join(repoRoot, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (exists(pf)) {
      let code = read(pf);
      const re = /(id:\s*['"]legalDescription['"][\s\S]*?showIf:\s*\(state[\s\S]*?\)\s*=>\s*)([^,\n]+)(,?)/m;
      if (re.test(code)) {
        const fn = `(state: any) => {
    const legal = (state?.legalDescription || '').toString();
    const normalized = legal.trim().toLowerCase();
    const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
    return !hasValidLegal; // keep step visible until user provides a minimally sufficient edit
  }`;
        code = code.replace(re, (m, head, _cond, tail) => head + fn + (tail || ''));
        write(pf, code);
      } else {
        log('WARN: Could not patch legalDescription showIf (pattern not found). Please check file structure.');
      }
    } else {
      log('WARN: promptFlows.ts not found; skipping legalDescription showIf patch.');
    }

    // 2) Ensure ModernEngine passes partners to PrefillCombo for requestedBy
    const me = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (exists(me)) {
      let code = read(me);
      // Ensure PartnersProvider import? (optional)
      if (!code.includes("usePartners(") && fs.existsSync(path.join(repoRoot, 'frontend/src/features/partners/PartnersContext.tsx'))) {
        // Try to import and wire partners usage where PrefillCombo is rendered
        if (!/from\s+['"]@\/features\/partners\/PartnersContext['"]/.test(code) &&
            !/from\s+['"]\.\.\/\.\.\/partners\/PartnersContext['"]/.test(code)) {
          code = code.replace(/(import[^\n]+;\s*)$/, "$1\nimport { usePartners } from '@/features/partners/PartnersContext';\n");
        }
        // Insert hook near top of component if not present
        code = code.replace(/(export\s+default\s+function\s+ModernEngine[^{]+\{)/, (m)=> m + `
  const { partners } = usePartners();
`);
      }
      // Ensure PrefillCombo has partners and allowNewPartner for requestedBy
      code = code.replace(/<PrefillCombo([^>]+)>/g, (m, attrs) => {
        let out = m;
        if (/field\]\s*===\s*['"]requestedBy['"]/.test(code)) {
          // We'll attempt a generic replacement to include props if missing
          if (!/partners=\{/.test(m)) out = out.replace(/>$/, ' partners={current.field === \'requestedBy\' ? partners : []}>');
          if (!/allowNewPartner=\{/.test(m)) out = out.replace(/>$/, ' allowNewPartner={current.field === \'requestedBy\'}>');
        }
        return out;
      });
      write(me, code);
    } else {
      log('WARN: ModernEngine.tsx not found; manual wiring may be needed.');
    }

    console.log('[apply-partners-legal-v7] Complete.');
