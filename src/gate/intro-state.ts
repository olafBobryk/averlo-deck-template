// When the intro plays, and how it hands over to the deck.
// Once per browser session, as the Averlo site and the questionnaire do,
// skipped under reduced motion and with
// ?intro=off. The pre-paint script decides before anything is drawn, so a
// repeat load never flashes the intro.

export const INTRO_PLAYED_KEY = "deck:intro-played";

/** Before first paint: html[data-intro] while the intro plays. */
export const introBootstrap = `(()=>{try{
var q=new URLSearchParams(location.search);
if(sessionStorage.getItem("${INTRO_PLAYED_KEY}")||q.get("intro")==="off"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
document.documentElement.setAttribute("data-intro","");
}catch(e){}})()`;

const listeners = new Set<() => void>();

/** The deck's slide replays its entrance when the intro hands over. */
export function onIntroFinish(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

type BootWindow = Window & { __deckBoot?: { finish: () => void } };

/** The lock has opened: remember it for this session, let the hard-load
 *  screen finish under the intro, and start the slide's entrance. */
export function finishIntro() {
  try {
    sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
  } catch {
    // Private mode: the intro plays again on the next load.
  }
  (window as BootWindow).__deckBoot?.finish();
  for (const listener of listeners) listener();
}

/** After the fade: the page is the deck's alone. */
export const endIntro = () =>
  document.documentElement.removeAttribute("data-intro");
