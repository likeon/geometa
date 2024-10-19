import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    monkey({
      entry: "src/main.ts",
      userscript: {
        icon: "https://learnablemeta.com/favicon.png",
        version: "0.64",
        namespace: "geometa",
        name: "GeoGuessr Learnable Meta",
        description: "UserScript for GeoGuessr Learnable Meta maps",
        match: ["*://*.geoguessr.com/*"],
        connect: ["learnablemeta.com"],
        updateURL: "https://github.com/likeon/geometa/raw/main/dist/geometa.user.js",
        downloadURL: "https://github.com/likeon/geometa/raw/main/dist/geometa.user.js",
        "run-at": "document-start",
        require: [
          "https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/dbbeb296542ad6c171767e43638c1ecf7adc3bc1/geoguessr-event-framework.js",
        ],
      },
    }),
  ],
});
