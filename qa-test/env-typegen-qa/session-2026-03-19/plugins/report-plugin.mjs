export default {
  name: "report-plugin",
  transformReport(report) {
    return { ...report };
  },
};
