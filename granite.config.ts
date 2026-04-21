import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "weedpuller",
  brand: {
    displayName: "뽑아라 잡초",
    primaryColor: "#4A7C59",
    icon: "/icon_600x600.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
