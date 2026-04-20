export const runtime = "nodejs";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getMagnitudeQuery(magnitude: number): string {
  if (magnitude >= 6.0) return "catastrophic earthquake disaster apocalypse";
  if (magnitude >= 5.0) return "major earthquake destruction ruins";
  if (magnitude >= 4.0) return "earthquake damage volcanic landscape";
  if (magnitude >= 2.0) return "earthquake aftermath landscape";
  return "geological formation earth layers";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const magnitude = parseFloat(searchParams.get("mag") || "3");

    if (!UNSPLASH_ACCESS_KEY) {
      return Response.json(
        { error: "Unsplash API key not configured" },
        { status: 500 }
      );
    }

    const cacheKey = `mag_${Math.floor(magnitude * 10)}`;
    const cached = imageCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return Response.json({ url: cached.url });
    }

    const query = getMagnitudeQuery(magnitude);
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&w=1200&h=300&fit=crop`,
      {
        headers: {
          "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch from Unsplash" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const imageUrl = data.urls.regular;

    imageCache.set(cacheKey, {
      url: imageUrl,
      timestamp: Date.now(),
    });

    return Response.json({ url: imageUrl });
  } catch (error) {
    console.error("Image fetch error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
