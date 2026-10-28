import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json";

export default {
  input: "src/index.js",
  output: [
    { file: pkg.main, format: "cjs" },
    { file: pkg.module, format: "esm" },
  ],
  plugins: [
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: ["@babel/preset-env", "@babel/preset-react"],
    }),
    terser(),
  ],
  // Dependencies are installed alongside this package and resolved by the
  // app's bundler, so none are bundled here. This also keeps the graph library
  // from being evaluated on import (e.g. during SSR).
  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
  ],
};
