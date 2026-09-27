import type { HistoryEvent } from "@/lib/types";
import { getWikimediaFilePageUrl } from "@/lib/media";

interface Props {
  event: HistoryEvent;
  className: string;
}

export default function WikimediaCredit({ event, className }: Props) {
  if (!event.image_credit) return null;

  const filePageUrl = getWikimediaFilePageUrl(event.image_url);
  return (
    <figcaption className={className}>
      {filePageUrl ? (
        <a
          href={filePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Image credit and license details for ${event.title}`}
        >
          {event.image_credit}
        </a>
      ) : event.image_credit}
    </figcaption>
  );
}
