import base from "./jest.base.config.js";

export default {
  ...base,
  testEnvironment: "node",
  coverageProvider: "v8",
  testMatch: ["<rootDir>/tests/e2e/**/*.test.js"],
};
