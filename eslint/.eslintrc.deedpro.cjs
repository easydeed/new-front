// Drop-in ESLint config for DeedPro SmartReview guard.
// Add this to your root .eslintrc.{js,cjs} via 'overrides' or extend it manually.
module.exports = {
  plugins: ['deedpro-guard'],
  rules: {
    'deedpro-guard/deedpro/no-smartreview-side-effects': 'error'
  },
  resolvePluginsRelativeTo: __dirname,
  // This local plugin loader
  defineRules: require('./deedpro-smartreview-guard.js').rules,
};
