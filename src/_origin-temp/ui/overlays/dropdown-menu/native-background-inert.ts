import { useCallback, useRef, type Ref } from "react";

/** React 19 callback refs may return their own teardown. */
function assignRef(
  ref: Ref<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
) {
  if (typeof ref === "function") return ref(node);
  if (ref) ref.current = node;
}

const held = new WeakMap<
  Element,
  { previous: string | null; owners: Set<symbol> }
>();

/** Follow Radix's real accessibility layers rather than guessing portal siblings.
 * A nested foreground dialog can therefore replace a menu without becoming inert.
 */
export function isolateHiddenBackground(foreground: HTMLElement): () => void {
  const owner = Symbol("popup background");
  const document = foreground.ownerDocument;
  const current = new Set<Element>();
  let disposed = false;
  const release = (element: Element) => {
    const record = held.get(element);
    if (!record) return;
    record.owners.delete(owner);
    if (!record.owners.size) {
      if (record.previous === null) element.removeAttribute("inert");
      else element.setAttribute("inert", record.previous);
      held.delete(element);
    }
    current.delete(element);
  };
  const reconcile = () => {
    if (disposed) return;
    const active =
      foreground.isConnected && foreground.dataset.state === "open";
    const foregroundHidden = foreground.closest('[aria-hidden="true"]');
    const desired = new Set(
      active
        ? [...document.body.querySelectorAll('[aria-hidden="true"]')].filter(
            (element) =>
              // Decorative descendants are not background. An old menu hidden by a
              // newly opened confirmation *is* background, until Radix reveals it again.
              !foreground.contains(element) || !!foregroundHidden,
          )
        : [],
    );
    for (const element of current) if (!desired.has(element)) release(element);
    for (const element of desired) {
      if (current.has(element)) continue;
      let record = held.get(element);
      if (!record) {
        record = { previous: element.getAttribute("inert"), owners: new Set() };
        held.set(element, record);
        if (record.previous === null) element.setAttribute("inert", "");
      }
      record.owners.add(owner);
      current.add(element);
    }
  };
  const observer = new MutationObserver(reconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-hidden", "data-state"],
  });
  reconcile();
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const element of current) release(element);
  };
}

/** Ref teardown and close-autofocus both restore native tab stops before Radix
 * returns focus to the opener, including retained/force-mounted content.
 */
export function useHiddenBackgroundInert(
  forwardedRef: Ref<HTMLDivElement> | undefined,
) {
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const restore = useCallback(() => cleanup.current?.(), []);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      const externalCleanup = assignRef(forwardedRef, node);
      const release = node ? isolateHiddenBackground(node) : () => {};
      cleanup.current = release;
      return () => {
        release();
        if (cleanup.current === release) cleanup.current = undefined;
        if (typeof externalCleanup === "function") externalCleanup();
        else assignRef(forwardedRef, null);
      };
    },
    [forwardedRef],
  );
  return [ref, restore] as const;
}
