import type { Metadata, Viewport } from "next";
import { RouteDirectionTracker } from "@/motion/route-transition";
import { ShimmerRoot } from "@/_origin-temp/ui/foundations/ShimmerRoot";
import { ThemeProvider } from "@/_origin-temp/ui/foundations/theme";
import { themeBootstrap } from "@/_origin-temp/ui/foundations/theme-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deck",
  description: "Deck",
  robots: { index: false, follow: false },
  // The home-screen app. Next writes the standard
  // `mobile-web-app-capable`; older iOS reads only the Apple name.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deck",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#000002",
  colorScheme: "dark",
};

// The deck is dark only: store Dark before the unchanged theme bootstrap
// runs, so it and ThemeProvider both resolve Dark.
const forceDark = `try{localStorage.setItem("deck.theme","dark")}catch{};document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark"`;

// The root layout, without the origin's data, notices, orb and conversation
// hosts. BootLoader is in the deck's own layout.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-arriving="" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: forceDark }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link
          rel="preload"
          href="/fonts/inter/4.1/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
      </head>
      <body>
        <RouteDirectionTracker />
        <ThemeProvider>
          <ShimmerRoot>{children}</ShimmerRoot>
        </ThemeProvider>
      </body>
    </html>
  );
}
