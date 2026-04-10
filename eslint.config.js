// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
import unusedImports from "eslint-plugin-unused-imports";
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
	eslintPluginPrettierRecommended,
  unusedImports,
  {
    ignores: ["dist/*"],
  },
]);
