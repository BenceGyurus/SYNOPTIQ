import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const name = (params.get("q") || "").trim();
  if (name.length < 3 || name.length > 80)
    return Response.json({ error: "Invalid search" }, { status: 422 });
  const query = new URLSearchParams({
    name,
    count: "5",
    language: params.get("lang") === "en" ? "en" : "hu",
    format: "json",
  });
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${query}`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Geocoding unavailable");
    const data = await response.json();
    return Response.json({
      results: (data.results || []).map(
        (place: {
          id: number;
          name: string;
          admin1?: string;
          country?: string;
          latitude: number;
          longitude: number;
        }) => ({
          id: place.id,
          name: [place.name, place.admin1, place.country]
            .filter(Boolean)
            .join(", "),
          latitude: place.latitude,
          longitude: place.longitude,
        }),
      ),
    });
  } catch {
    return Response.json(
      { error: "Location search unavailable" },
      { status: 502 },
    );
  }
}
