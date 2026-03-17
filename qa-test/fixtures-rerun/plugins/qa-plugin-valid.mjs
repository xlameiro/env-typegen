export default {
  name: "qa-valid-plugin",
  transformContract(contract) {
    return contract;
  },
  transformSource({ values }) {
    return values;
  },
  transformReport(report) {
    return report;
  },
};
