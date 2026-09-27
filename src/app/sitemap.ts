import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/date-slugs";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  const dayPages = getAllSlugs().map((slug) => ({
    url: `${base}/on-this-day/${slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/on-this-day`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...dayPages,
  ];
}
