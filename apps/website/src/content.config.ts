import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { pageThemeObsidianSchema } from "starlight-theme-obsidian/schema";

export const collections = {
  docs: defineCollection({
    type: "content",
    schema: docsSchema({ extend: pageThemeObsidianSchema }),
  }),
};
