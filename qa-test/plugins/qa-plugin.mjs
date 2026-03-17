/** @type {import('@xlameiro/env-typegen').EnvTypegenPlugin} */
const plugin = {
  transformSource(input) {
    const nextValues = { ...input.values };
    if (typeof nextValues.LOG_LEVEL === 'string') {
      nextValues.LOG_LEVEL = nextValues.LOG_LEVEL.trim();
    }
    return nextValues;
  },
  transformReport(report) {
    return {
      ...report,
      summary: {
        ...report.summary,
        warnings: report.summary.warnings,
      },
    };
  },
};

export default plugin;
