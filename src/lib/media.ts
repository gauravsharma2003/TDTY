/** Return a Wikimedia file-description page for an upload.wikimedia.org image. */
export function getWikimediaFilePageUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (!["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname)) return null;

    const segments = url.pathname.split("/");
    const wikipediaIndex = segments.indexOf("wikipedia");
    if (wikipediaIndex < 0) return null;

    const project = segments[wikipediaIndex + 1];
    const host = project === "commons"
      ? "commons.wikimedia.org"
      : project === "en"
        ? "en.wikipedia.org"
        : null;
    if (!host) return null;

    const thumbnailIndex = segments.indexOf("thumb", wikipediaIndex + 1);
    const encodedFilename = thumbnailIndex >= 0
      ? segments[thumbnailIndex + 3]
      : segments[segments.length - 1];
    if (!encodedFilename) return null;

    const filename = decodeURIComponent(encodedFilename);
    return `https://${host}/wiki/File:${encodeURIComponent(filename.replace(/ /g, "_"))}`;
  } catch {
    return null;
  }
}
