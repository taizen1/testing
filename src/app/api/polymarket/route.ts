import { NextRequest, NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

/**
 * Proxy requests to Polymarket Gamma API to avoid CORS restrictions.
 * Usage: /api/polymarket?path=/events&limit=20&active=true
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 },
    );
  }

  // Build the upstream URL — forward all query params except "path"
  const upstream = new URL(path, GAMMA_API);
  searchParams.forEach((value, key) => {
    if (key !== "path") upstream.searchParams.set(key, value);
  });

  try {
    const upstreamUrl = upstream.toString();
    console.log("[Polymarket proxy]", upstreamUrl);

    const res = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[Polymarket proxy] upstream error", res.status, body.slice(0, 200));
      return NextResponse.json(
        { error: `Gamma API returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Gamma API proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach Polymarket API" },
      { status: 502 },
    );
  }
}
