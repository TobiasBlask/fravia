import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST() {
  const session = await auth();
  if (!session.userId) return new Response("Anmeldung fehlt", { status: 401 });
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const token = await session.getToken({ template: "convex" });
  if (!url || !token) return new Response("Kalender nicht verbunden", { status: 503 });
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  await client.mutation(api.life.deleteMine, {});
  const clerk = await clerkClient();
  await clerk.users.deleteUser(session.userId);
  return Response.json({ ok: true });
}
