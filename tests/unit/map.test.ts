import { describe, expect, it } from "vitest";
import { mapDirectionsUrl, mapEmbedUrl, mapOpenUrl, parseCoordinates } from "@/lib/map";
import { CHURCH_COORDINATES, DEFAULT_SITE_CONTENT, parseSiteContent } from "@/lib/site-content";

describe("church finder map", () => {
  const church = parseCoordinates(CHURCH_COORDINATES.lat, CHURCH_COORDINATES.lng)!;

  it("uses the congregation's Google Maps spot", () => {
    expect(church).toEqual({ lat: -15.390551, lng: 28.327913 });
    expect(mapEmbedUrl(church)).toBe("https://www.google.com/maps?q=-15.390551,28.327913&z=17&output=embed");
    expect(mapOpenUrl(church)).toBe("https://www.google.com/maps/search/?api=1&query=-15.390551,28.327913");
    expect(mapDirectionsUrl(church)).toBe("https://www.google.com/maps/dir/?api=1&destination=-15.390551,28.327913");
  });

  it("rejects missing or impossible coordinates", () => {
    expect(parseCoordinates("", "28.3")).toBeNull();
    expect(parseCoordinates("north", "28.3")).toBeNull();
    expect(parseCoordinates("-95", "28.3")).toBeNull();
    expect(parseCoordinates("-15.39", "190")).toBeNull();
  });

  it("keeps location rows saved before coordinates existed, with the church's spot", () => {
    const old = { name: "UNZANAC church", address: "Great East Road", mapUrl: "" };
    expect(parseSiteContent("location", old)).toMatchObject({ ...old, latitude: "-15.390551", longitude: "28.327913" });
    expect(DEFAULT_SITE_CONTENT.location.mapUrl).toBe("https://maps.app.goo.gl/x1rju4fHfrWR29yJ9");
  });
});
