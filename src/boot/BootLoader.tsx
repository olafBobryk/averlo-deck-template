import { brandMark } from "@/brand/mark";
import { bootBootstrap } from "./boot-bootstrap";
import styles from "./BootLoader.module.css";

// Raw HTML, so hydration never looks inside: the script mutates it before React
// arrives, and it is the same on every page.
const inner = `<div class="${styles.backdrop}"></div>
<div class="${styles.orb}" data-boot-orb="">
<div class="${styles.media}"><img src="${brandMark.src}" alt="" width="1080" height="1080" data-brand-mark="${brandMark.kind}"></div>
</div>`;

/**
 * The one hard-load screen, before any page. In the deck's layout, so it is
 * there from the first paint. Client navigations never see it: the layout
 * stays mounted. The mark alone, with no ring round it.
 */
export function BootLoader({
  hold,
}: {
  /** Stories: the script waits to be told, and the failsafe is off. */
  hold?: boolean;
}) {
  return (
    <>
      <noscript>
        <style>{"#deck-boot{display:none}"}</style>
      </noscript>
      <div
        id="deck-boot"
        className={styles.boot}
        data-state="loading"
        data-hold={hold ? "" : undefined}
        aria-hidden="true"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: inner }}
      />
      {!hold && <script dangerouslySetInnerHTML={{ __html: bootBootstrap }} />}
    </>
  );
}
