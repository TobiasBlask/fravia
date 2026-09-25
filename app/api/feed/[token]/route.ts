import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { eventsToIcs } from "@/lib/ics";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || !token) return new Response("Nicht gefunden", { status: 404 });
  const client = new ConvexHttpClient(url);
  const rows = await client.query(api.life.feed, { token });
  const body = eventsToIcs(rows);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=fravia.ics",
    },
  });
}
