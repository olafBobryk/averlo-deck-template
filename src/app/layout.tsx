import type { Metadata, Viewport } from "next";
import { RouteDirectionTracker } from "@/motion/route-transition";
import { MotionProvider } from "@/components/ui/foundations/MotionProvider";
import { inter } from "@/font";
import { config } from "@/brand/config";
import { iconLinks } from "@/brand/marks";
import "./globals.css";

export const metadata: Metadata = {
  title: config.deckTitle,
  description: "Deck",
  robots: { index: false, follow: false },
  // The home-screen app. Next writes the standard
  // `mobile-web-app-capable`; older iOS reads only the Apple name.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: config.deckTitle,
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  // Averlo's favicon for the Averlo brand; otherwise none, and Next links
  // the generated icons (src/brand/marks.ts).
  icons: iconLinks(config.brand),
};

export const viewport: Viewport = {
  themeColor: "#000002",
  colorScheme: "dark",
};

// The root layout, without the origin's data, notices, orb and conversation
// hosts. BootLoader is in the deck's own layout. The deck is dark only:
// Averlo's library.css defines its dark tokens under `.dark`.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable}`}
      data-arriving=""
      suppressHydrationWarning
    >
      <head>
        {/* The first frame waits until the hard-load screen is parsed, so
            it is there from the first paint. */}
        <link rel="expect" href="#deck-boot" {...{ blocking: "render" }} />
      </head>
      <body>
        <RouteDirectionTracker />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
