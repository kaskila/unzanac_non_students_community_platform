// Church finder links (Google Maps, no API key). The church's spot is stored as coordinates in
// Site content → Church location; these helpers build the zoomable map and the app links from it.

export type Coordinates = { lat: number; lng: number };

/** "-15.390551" + "28.327913" → coordinates, or null when missing or out of range. */
export function parseCoordinates(lat: string, lng: string): Coordinates | null {
  if (!lat.trim() || !lng.trim()) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}

const point = (c: Coordinates) => `${c.lat},${c.lng}`;

/** Zoomable, pannable map for an <iframe> (Google's keyless embed). */
export function mapEmbedUrl(c: Coordinates, zoom = 17): string {
  return `https://www.google.com/maps?q=${point(c)}&z=${zoom}&output=embed`;
}

/** Opens the spot in the Google Maps app on Android/iPhone, or the website. */
export function mapOpenUrl(c: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${point(c)}`;
}

/** Turn-by-turn directions from wherever the visitor is. */
export function mapDirectionsUrl(c: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point(c)}`;
}
