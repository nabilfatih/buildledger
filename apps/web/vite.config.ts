import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const clientDirectivePackages = [
  "/@base-ui/",
  "/@mantine/hooks/",
  "/@tanstack/react-form/",
  "/@tanstack/react-router/",
] as const;

const chunkPackages = [
  [["/@confect/", "/@hugeicons/", "/@tanstack/", "/convex/"], "platform"],
  [["/effect/"], "effect"],
  [["/date-fns/", "/react-day-picker/"], "dates"],
] as const;

const config = defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      onwarn(warning, warn) {
        const isClientDirective =
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes('"use client"') &&
          clientDirectivePackages.some((packageName) =>
            warning.id?.includes(packageName)
          );

        if (isClientDirective) {
          return;
        }

        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) {
            return;
          }

          const chunk = chunkPackages.find(([packageNames]) =>
            packageNames.some((packageName) => id.includes(packageName))
          );

          return chunk?.[1];
        },
      },
    },
  },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: {
        onwarn(warning, warn) {
          if (warning.code === "EMPTY_BUNDLE") {
            return;
          }

          const isClientDirective =
            warning.code === "MODULE_LEVEL_DIRECTIVE" &&
            warning.message.includes('"use client"') &&
            clientDirectivePackages.some((packageName) =>
              warning.id?.includes(packageName)
            );

          if (isClientDirective) {
            return;
          }

          warn(warning);
        },
      },
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
