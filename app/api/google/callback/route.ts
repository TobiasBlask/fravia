import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function back(request: Request, flag?: string) {
  const url = new URL("/", request.url);
  if (flag) url.searchParams.set("google", flag);
  return Response.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) return back(request, "fehler");
  const session = await auth();
  if (!session.userId) return Response.redirect(new URL("/sign-in", request.url));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const token = await session.getToken({ template: "convex" });
  if (!convexUrl || !token) return back(request, "aus");
  try {
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);
    const result = await client.action(api.googleApi.finish, { code, state });
    return back(request, result.ok ? undefined : "fehler");
  } catch {
    return back(request, "fehler");
  }
}
