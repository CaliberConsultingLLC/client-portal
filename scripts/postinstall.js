/**
 * postinstall.js
 *
 * Creates a stub for `next/config` so that @storybook/nextjs can start up.
 * Next.js 15+ removed this module, but Storybook's nextjs preset still tries
 * to resolve it at startup. This script recreates the stub after every npm install.
 */

const fs = require("fs");
const path = require("path");

const stub = path.join(__dirname, "../node_modules/next/config.js");

if (!fs.existsSync(stub)) {
  const content = [
    "// Stub created by scripts/postinstall.js for @storybook/nextjs compatibility.",
    "// next/config was removed in Next.js 15+.",
    "function getConfig() { return { serverRuntimeConfig: {}, publicRuntimeConfig: {} }; }",
    "module.exports = getConfig;",
    "module.exports.default = getConfig;",
    "",
  ].join("\n");

  fs.writeFileSync(stub, content, "utf8");
  console.log("✓ Created next/config stub for Storybook compatibility.");
} else {
  console.log("✓ next/config stub already present.");
}
