import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const chunkPackages = [
  [["/@confect/", "/@hugeicons/", "/@tanstack/", "/convex/"], "platform"],
  [["/effect/"], "effect"],
  [["/date-fns/", "/react-day-picker/"], "dates"],
] as const;

const config = defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
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
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro(),
  ],
});

export default config;
