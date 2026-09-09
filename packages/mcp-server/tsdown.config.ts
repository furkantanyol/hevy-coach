import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/http.ts"],
  format: ["esm"],
  dts: { entry: ["src/index.ts"] },
  clean: true,
});
