/**
 * ESLint rule: ban direct deed creation & redirects in SmartReview under wizard/mode
 * Usage: add to your ESLint config (see .eslintrc.deedpro.cjs in same folder).
 */
module.exports = {
  rules: {
    'deedpro/no-smartreview-side-effects': {
      meta: { type: 'problem' },
      create(context) {
        const filename = context.getFilename();
        const isSmartReview = /wizard\/mode\/.+SmartReview\.tsx$/.test(filename);
        return isSmartReview ? {
          CallExpression(node) {
            try {
              const src = context.getSourceCode().getText(node);
              if (/fetch\(\s*['"]\/?api\/deeds/.test(src)) {
                context.report({ node, message: 'Do not call /api/deeds from SmartReview; finalize must be engine-owned.' });
              }
            } catch {}
          },
          MemberExpression(node) {
            try {
              const src = context.getSourceCode().getText(node);
              if (/window\.location\.href\s*=.*deeds/.test(src)) {
                context.report({ node, message: 'Do not redirect from SmartReview; let ModernEngine handle navigation.' });
              }
            } catch {}
          }
        } : {};
      }
    }
  }
};
