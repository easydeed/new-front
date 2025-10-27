/**
     * Build‑Fix v7.2 — safe, multiline‑aware patcher
     * Fixes:
     *  1) promptFlows.ts: replaces legalDescription.showIf with shouldShowLegal(state) and adds import
     *  2) ModernEngine.tsx: ensures PrefillCombo block contains partners/allowNewPartner + legal onFocus/onBlur,
     *     WITHOUT mangling existing onChange, even when JSX spans multiple lines.
     *
     * Strategy: string scanning with balanced‑braces/quotes to find boundaries; no brittle single‑line regex.
     */
    import fs from 'fs'; import path from 'path'; import child_process from 'child_process';

    const repoRoot = process.argv[2] || '.';
    const log = (...a)=>console.log('[buildfix-v7.2]', ...a);

    function read(p){ return fs.readFileSync(p, 'utf8'); }
    function write(p,s){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); }
    function backup(p){
      const bak = p + '.bak.v7_2';
      if (!fs.existsSync(bak)) fs.copyFileSync(p, bak), log('backup', path.relative(process.cwd(), bak));
      return bak;
    }
    function ensureImport(code, importStmt){
      if (code.includes(importStmt)) return code;
      // try to place after the last import
      const m = code.match(/^(?:import[^\n]*\n)+/m);
      if (m) {
        const idx = m.index + m[0].length;
        return code.slice(0, idx) + importStmt + "\n" + code.slice(idx);
      }
      return importStmt + "\n" + code;
    }
    function findIndexBalanced(src, startIdx, openCh, closeCh){
      let depth = 0, i = startIdx;
      let inS=false,inD=false,inT=false, esc=false;
      for (; i < src.length; i++){
        const ch = src[i], prev = src[i-1];
        if (esc){ esc=false; continue; }
        if (ch==='\\' && prev!=='\\'){ esc=true; continue; }
        if (!inS && !inD && ch==='`') { inT = !inT; continue; }
        if (!inD && !inT && ch==='\'') { inS = !inS; continue; }
        if (!inS && !inT && ch=='"') { inD = !inD; continue; }
        if (inS || inD || inT) continue;
        if (ch===openCh) depth++;
        else if (ch===closeCh) { depth--; if (depth===0) return i; }
      }
      return -1;
    }
    function findArrowBodyEnd(src, startAfterArrow){
      // Skip spaces/newlines
      let i = startAfterArrow;
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src[i] === '{'){
        const end = findIndexBalanced(src, i, '{', '}');
        return (end>=0) ? end+1 : -1;
      } else {
        // expression — end at first comma or closing brace/bracket at same level
        let inS=false,inD=false,inT=false, esc=false, depthParen=0, depthBrack=0, depthBrace=0;
        for (; i < src.length; i++){
          const ch = src[i], prev = src[i-1];
          if (esc){ esc=false; continue; }
          if (ch==='\\' && prev!=='\\'){ esc=true; continue; }
          if (!inS && !inD && ch==='`'){ inT=!inT; continue; }
          if (!inD && !inT && ch==='\''){ inS=!inS; continue; }
          if (!inS && !inT && ch=='"'){ inD=!inD; continue; }
          if (inS || inD || inT) continue;
          if (ch==='(') depthParen++;
          else if (ch===')') depthParen--;
          else if (ch==='[') depthBrack++;
          else if (ch===']') depthBrack--;
          else if (ch==='{') depthBrace++;
          else if (ch==='}') depthBrace--;
          else if ((ch===',' || ch==='}' || ch===']') && depthParen===0 && depthBrack===0 && depthBrace===0) {
            return i; // do not consume delim
          }
        }
        return -1;
      }
    }
    function replaceLegalShowIf(filePath){
      let code = read(filePath);
      backup(filePath);
      // 1) Ensure import
      code = ensureImport(code, `import { shouldShowLegal } from '@/lib/wizard/legalShowIf';`);
      // 2) Find the object with id: 'legalDescription' (or "legalDescription")
      const idIdx = code.search(/id:\s*['"]legalDescription['"]/);
      if (idIdx < 0) { log('WARN: legalDescription prompt not found in', filePath); return; }
      // Find 'showIf:' after this id
      const showIdx = code.indexOf('showIf', idIdx);
      if (showIdx < 0) { log('WARN: showIf not found for legalDescription in', filePath); return; }
      const colonIdx = code.indexOf(':', showIdx);
      if (colonIdx < 0) { log('WARN: colon after showIf not found'); return; }
      // Expect pattern showIf: (state...) => <expr or block>
      const arrowIdx = code.indexOf('=>', colonIdx);
      if (arrowIdx < 0) { log('WARN: arrow "=>" not found for showIf'); return; }
      const bodyEnd = findArrowBodyEnd(code, arrowIdx+2);
      if (bodyEnd < 0) { log('WARN: could not locate end of showIf body safely'); return; }
      const before = code.slice(0, colonIdx+1);
      const after = code.slice(bodyEnd);
      // Add trailing comma if next non-space char is not ','
      let tail = after;
      // Replace body with our call
      const replacement = " (state: any) => shouldShowLegal(state)";
      code = before + replacement + tail;
      write(filePath, code);
      log('Replaced legalDescription.showIf with shouldShowLegal(state)');
    }

    function patchModernEngine(filePath){
      let code = read(filePath);
      backup(filePath);
      // Ensure import and hook
      if (!code.includes(`usePartners()`)) {
        if (!code.includes(`from '@/features/partners/PartnersContext'`)) {
          // append import after last import
          code = ensureImport(code, `import { usePartners } from '@/features/partners/PartnersContext';`);
        }
        // Insert hook inside ModernEngine body
        const fnIdx = code.search(/export\s+default\s+function\s+ModernEngine[^{]*\{/);
        if (fnIdx >= 0) {
          const braceIdx = code.indexOf('{', fnIdx);
          const insertAt = braceIdx+1;
          code = code.slice(0, insertAt) + `\n  const { partners, loading: partnersLoading, error: partnersError } = usePartners();\n` + code.slice(insertAt);
        } else {
          log('WARN: ModernEngine function not found; skip hook injection');
        }
      }
      // Insert props into ALL <PrefillCombo ... /> blocks without touching onChange
      function injectPropsIntoPrefillBlocks(src){
        let out = '', i=0;
        while (true){
          const start = src.indexOf('<PrefillCombo', i);
          if (start < 0) { out += src.slice(i); break; }
          out += src.slice(i, start);
          // find end of self-closing tag '/>'
          let j = start;
          let inS=false,inD=false,inT=false, esc=false;
          while (j < src.length){
            const ch = src[j], prev = src[j-1];
            if (esc){ esc=false; j++; continue; }
            if (ch==='\\' && prev!=='\\'){ esc=true; j++; continue; }
            if (!inS && !inD && ch==='`'){ inT=!inT; j++; continue; }
            if (!inD && !inT && ch==='\''){ inS=!inS; j++; continue; }
            if (!inS && !inT && ch=='"'){ inD=!inD; j++; continue; }
            if (inS || inD || inT){ j++; continue; }
            // stop at '/>'
            if (ch==='/' && src[j+1] === '>'){ j+=2; break; }
            j++;
          }
          const tag = src.slice(start, j);
          // Skip if it's not the RequestedBy / LegalDescription context: we can still safely add props; logic guards by field.
          let tagUpdated = tag;
          const needPartners = !/partners=\{/.test(tagUpdated);
          const needAllow = !/allowNewPartner=\{/.test(tagUpdated);
          const needFocus = !/onFocus=\{/.test(tagUpdated);
          const needBlur = !/onBlur=\{/.test(tagUpdated);
          // Insert just before '/>'
          const insertPos = tagUpdated.lastIndexOf('/>');
          const indentMatch = tag.match(/\n([ \t]*)[^\n]*$/);
          const indent = indentMatch ? indentMatch[1] : '  ';
          let inject = '';
          if (needPartners) inject += `\n${indent}partners={current.field === 'requestedBy' ? partners : []}`;
          if (needAllow) inject += `\n${indent}allowNewPartner={current.field === 'requestedBy'}`;
          if (needFocus) inject += `\n${indent}onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}`;
          if (needBlur) inject += `\n${indent}onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}`;
          if (inject){
            tagUpdated = tagUpdated.slice(0, insertPos) + inject + tagUpdated.slice(insertPos);
          }
          out += tagUpdated;
          i = j;
        }
        return out;
      }
      code = injectPropsIntoPrefillBlocks(code);
      write(filePath, code);
      log('Patched ModernEngine PrefillCombo blocks safely');
    }

    // MAIN
    const pf = path.join(repoRoot, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    const me = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (fs.existsSync(pf)) replaceLegalShowIf(pf); else log('WARN: promptFlows.ts not found');
    if (fs.existsSync(me)) patchModernEngine(me); else log('WARN: ModernEngine.tsx not found');

    log('Build‑Fix v7.2 applied.');
