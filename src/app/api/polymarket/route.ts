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
    const res = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 }, // cache for 30s on the server
    });

    if (!res.ok) {
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
