import base from "./jest.base.config.js";

export default {
  ...base,
  testEnvironment: "jsdom",
  coverageProvider: "v8",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/tests/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/tests/e2e/"],
  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/tests/e2e/",
  ],
  testRegex: "(\\.bench)\\.(ts|tsx|js)$",
};
