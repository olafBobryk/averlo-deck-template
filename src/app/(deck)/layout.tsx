import { BootLoader } from "../../boot/BootLoader";
import { Intro } from "../../gate/Intro";
import { introBootstrap } from "../../gate/intro-state";

// Only the deck shows the hard-load screen; /print sits outside this group.
// On a first visit this session the intro plays over it instead.
export default function DeckLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introBootstrap }} />
      <BootLoader />
      {children}
      <Intro />
    </>
  );
}
