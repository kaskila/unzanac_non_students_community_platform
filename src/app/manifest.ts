import type { MetadataRoute } from "next";
import { BRAND_THEME_COLOR } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UNZANAC · New Apostolic Church UNZA Congregation",
    short_name: "UNZANAC",
    description: "News, services, committees and resources for the UNZA congregation.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_THEME_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
