import { NextRequest, NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

/** Paths served by the CLOB API instead of Gamma */
const CLOB_PATHS = new Set(["/prices-history", "/time-series"]);

/**
 * Proxy requests to Polymarket APIs to avoid CORS restrictions.
 * Routes price-history requests to the CLOB API; everything else to Gamma.
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

  // Route to correct upstream based on path
  const base = CLOB_PATHS.has(path) ? CLOB_API : GAMMA_API;
  const upstream = new URL(path, base);
  searchParams.forEach((value, key) => {
    if (key !== "path") upstream.searchParams.set(key, value);
  });

  const upstreamUrl = upstream.toString();
  console.log(`[Polymarket proxy] ${base === CLOB_API ? "CLOB" : "Gamma"} → ${upstreamUrl}`);

  try {
    const res = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const bodyText = await res.text();

    if (!res.ok) {
      console.error(
        `[Polymarket proxy] ❌ ${res.status} from ${upstreamUrl}\n` +
        `  Response: ${bodyText.slice(0, 300)}`,
      );
      return NextResponse.json(
        { error: `Upstream ${res.status}`, url: upstreamUrl, body: bodyText.slice(0, 200) },
        { status: res.status },
      );
    }

    // Parse JSON from the text we already read
    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      console.error(`[Polymarket proxy] ⚠ Non-JSON response from ${upstreamUrl}: ${bodyText.slice(0, 200)}`);
      return NextResponse.json(
        { error: "Upstream returned non-JSON response", url: upstreamUrl },
        { status: 502 },
      );
    }

    const preview = Array.isArray(data)
      ? `array[${data.length}]`
      : typeof data === "object" && data !== null
        ? `object{${Object.keys(data).join(",")}}`
        : typeof data;

    console.log(`[Polymarket proxy] ✓ 200 from ${base === CLOB_API ? "CLOB" : "Gamma"} — ${preview}`);

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[Polymarket proxy] ❌ Network error for ${upstreamUrl}:`, err);
    return NextResponse.json(
      { error: "Failed to reach Polymarket API", url: upstreamUrl, detail: String(err) },
      { status: 502 },
    );
  }
}
