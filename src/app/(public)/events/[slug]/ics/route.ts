import { buildIcs } from "@/lib/ics";
import { markdownToPlain } from "@/lib/markdown";
import { siteUrl } from "@/lib/site";
import { getPublicEvent } from "@/server/public";

/** "Add to calendar": the whole series as an iCalendar file (RFC 5545). */
export async function GET(_request: Request, { params }: RouteContext<"/events/[slug]/ics">) {
  const { slug } = await params;
  const data = await getPublicEvent(slug);
  if (!data) return new Response("Not found", { status: 404 });

  const { event, exceptions } = data;
  const ics = buildIcs({
    uid: `${event.id}@unzanac`,
    title: event.title,
    description: event.details ? markdownToPlain(event.details) : null,
    location: event.venue,
    url: siteUrl(`/events/${event.slug}`),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    rrule: event.rrule,
    updatedAt: event.updatedAt,
    exceptions,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
