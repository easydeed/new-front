// Process-local settings for synthetic browser proofs, never production.
// A fresh CI browser attempted a gvt1.com download while our network fence was
// active. Component-only suppression was insufficient. Suppress browser-only
// background/model fetching, never by admitting a remote host or ignoring errors.
// https://docs.cypress.io/api/node-events/browser-launch-api#Modify-Electron-app-switches
// https://github.com/cypress-io/cypress/issues/22622
const syntheticArgs = '--disable-background-networking --disable-component-update ' +
  '--disable-features=OptimizationHints,OptimizationHintsFetching,OptimizationTargetPrediction,OptimizationGuideModelDownloading';
async function withSyntheticBrowser(run, environment = process.env) {
  const previous = environment.ELECTRON_EXTRA_LAUNCH_ARGS;
  environment.ELECTRON_EXTRA_LAUNCH_ARGS = [previous, syntheticArgs]
    .filter(Boolean).join(' ');
  try {
    return await run();
  } finally {
    if (previous === undefined) delete environment.ELECTRON_EXTRA_LAUNCH_ARGS;
    else environment.ELECTRON_EXTRA_LAUNCH_ARGS = previous;
  }
}

module.exports = { withSyntheticBrowser };
