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
          label: "Overview",
          items: [{ label: "Introduction", link: "get-started" }],
        },
        {
          label: "Get Started",
          items: [{ label: "Install & Quickstart", link: "get-started" }],
        },
        {
          label: "CLI",
          autogenerate: { directory: "cli" },
        },
      ],
    }),
  ],
});
