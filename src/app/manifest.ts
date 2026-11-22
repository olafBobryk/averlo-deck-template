import type { MetadataRoute } from "next";
import { config } from "@/brand/config";

/** The home-screen app: "Add to Home Screen" opens the deck fullscreen,
 *  dark, behind the same gate. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.deckTitle,
    short_name: config.deckTitle,
    start_url: "/",
    display: "fullscreen",
    background_color: "#000002",
    theme_color: "#000002",
    icons: [
      { src: "/icon", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
