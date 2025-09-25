import { defineConfig, passthroughImageService } from "astro/config";
import astroD2 from "astro-d2";
import starlight from "@astrojs/starlight";
import starlightThemeObsidian from "starlight-theme-obsidian";

export default defineConfig({
  site: "https://thehacksmith.dev",
  image: {
    service: passthroughImageService(),
  },
  integrations: [
    astroD2({
      layout: "elk",
      sketch: true,
    }),
    starlight({
      // logo: {
      // light: "./src/assets/logos/code-hammer-icon-dark.png",
      // dark: "./src/assets/logos/hacksmith-icon-white.png",
      // light: "./src/assets/logos/hacksmith-wordmark-dark.png",
      // dark: "./src/assets/logos/hammer-icon-red-light.png",
      // replacesTitle: false,
      // },
      plugins: [
        starlightThemeObsidian({
          graph: false,
        }),
      ],
      title: "hacksmith",
      description: "Documentation for the Hacksmith CLI",
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Get Started",
          autogenerate: { directory: "get-started" },
        },
        {
          label: "Coming soon",
          autogenerate: { directory: "cli" },
        },
      ],
    }),
  ],
});
