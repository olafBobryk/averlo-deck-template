import type { Metadata } from "next";
import { BootLoader } from "../../boot/BootLoader";

export const metadata: Metadata = { title: "Preset gallery" };

// The preset gallery (feature 002): the deck's hard-load screen, as in the
// (deck) group, without the intro; the gallery is a reference, not the
// presented deck.
export default function GalleryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BootLoader />
      {children}
    </>
  );
}
