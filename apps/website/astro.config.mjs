import { defineConfig } from "astro/config";
import astroD2 from "astro-d2";
import starlight from "@astrojs/starlight";
import starlightThemeObsidian from "starlight-theme-obsidian";

export default defineConfig({
  site: "https://thehacksmith.dev",
  integrations: [
    astroD2({
      layout: "elk",
      sketch: true,
    }),
    starlight({
      plugins: [
        starlightThemeObsidian({
          graph: false,
        }),
      ],
      title: "hacksmith",
      description: "Documentation for the Hacksmith CLI",
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
