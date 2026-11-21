import type { MetadataRoute } from "next";

/** The home-screen app: "Add to Home Screen" opens the deck fullscreen,
 *  dark, behind the same gate. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deck",
    short_name: "Deck",
    start_url: "/",
    display: "fullscreen",
    background_color: "#000002",
    theme_color: "#000002",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
