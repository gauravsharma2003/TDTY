import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/date-slugs";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://thisyearthatday.vercel.app";

  const dayPages = getAllSlugs().map((slug) => ({
    url: `${base}/on-this-day/${slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/on-this-day`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...dayPages,
  ];
}
