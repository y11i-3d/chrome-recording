import base from "./prettier.config.mjs";

/** @type {import('prettier').Config} */
const config = {
  ...base,
  plugins: [
    "prettier-plugin-organize-imports",
    ...(base.plugins ?? []),
  ],
};
export default config;
