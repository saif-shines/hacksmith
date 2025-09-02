import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    starlight({
      title: "Hacksmith Docs",
      description: "Documentation for the Hacksmith CLI",
      sidebar: [
        {
          label: "Overview",
          items: [{ label: "Introduction", link: "index" }],
        },
        {
          label: "Get Started",
          items: [{ label: "Install & Quickstart", link: "get-started" }],
        },
        {
          label: "CLI",
          items: [{ label: "Usage", link: "cli/usage" }],
        },
      ],
    }),
  ],
});
