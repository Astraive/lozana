const Module = require("node:module");
const typescript6 = require("typescript-eslint-typescript6");
const originalLoad = Module._load;

Module._load = function load(request, parent, isMain) {
  if (request === "typescript") {
    return typescript6;
  }
  return originalLoad.call(this, request, parent, isMain);
};

require(require("node:path").join(require("node:path").dirname(require.resolve("eslint")), "../bin/eslint.js"));
