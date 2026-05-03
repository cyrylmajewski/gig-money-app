// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const unusedImports = require("eslint-plugin-unused-imports");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  ...expoConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
    },
  },
  {
    ignores: ["dist/*", ".expo/*", "ios/build/*", "ios/Pods/*"],
  },
]);
