"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Dropdown } from "@/components/ui/primitives/Dropdown";
import {
  Listbox,
  type ListboxOption,
} from "@/components/ui/primitives/Listbox";

type Trigger = {
  isOpen: boolean;
  toggleMenu: () => void;
  caretIcon: ReactNode;
  /** For the trigger button, so focus can come back to it. */
  ref: RefObject<HTMLElement | null>;
};

/** A dropdown in the menu card: the Averlo `Dropdown`, placed against the
 *  viewport (portalled, so the card's clip never cuts it), its items an
 *  Averlo `Listbox`.
 *
 *  - Opening puts focus on the selected item, or the first; the arrow keys,
 *    Home and End move it, and Enter chooses. Esc closes it, focus back on
 *    the trigger (`Dropdown`).
 *  - Its panel carries `data-menu-downloads` and `data-state="open"`, the
 *    MenuCard contract: keys inside it are its own, and a press outside it
 *    closes it alone, not the card.
 *  - Choosing an item calls `onChoose`, then closes it, focus back on the
 *    trigger. */
export function MenuDropdown<T>({
  trigger,
  options,
  kind,
  align = "start",
  onChoose,
}: {
  trigger: (props: Trigger) => ReactNode;
  options: ListboxOption<T>[];
  /** `menu` (menu items, links where an option has `href`) or `listbox`
   *  (options, one selected). */
  kind: "menu" | "listbox";
  align?: "start" | "end";
  onChoose: (
    option: ListboxOption<T>,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Dropdown
      placement="viewport"
      align={align}
      renderTrigger={({ isOpen, toggleMenu, caretIcon }) =>
        trigger({ isOpen, toggleMenu, caretIcon, ref })
      }
    >
      {({ closeMenu }) => (
        <Items
          options={options}
          kind={kind}
          onChoose={(option, event) => {
            onChoose(option, event);
            closeMenu();
            ref.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </Dropdown>
  );
}

function Items<T>({
  options,
  kind,
  onChoose,
}: {
  options: ListboxOption<T>[];
  kind: "menu" | "listbox";
  onChoose: (
    option: ListboxOption<T>,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.selected),
    ),
  );
  const items = () => [
    ...(list.current?.querySelectorAll<HTMLElement>("[data-option-index]") ??
      []),
  ];
  const focus = (index: number) => {
    const all = items();
    if (!all.length) return;
    const at = (index + all.length) % all.length;
    setActive(at);
    all[at]!.focus({ preventScroll: true });
  };

  // On open, focus the selected or first item as soon as the panel is
  // placed: Dropdown hides it until it has measured it, then renders it
  // again where it goes, before paint.
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (placed.current) return;
    const panel = list.current?.closest("[data-dropdown-panel]");
    if (!panel || getComputedStyle(panel).visibility === "hidden") return;
    placed.current = true;
    focus(active);
  });

  return (
    <div data-menu-downloads="" data-state="open">
      <Listbox
        listRef={list}
        options={options}
        role={kind === "menu" ? "menu" : "listbox"}
        optionRole={kind === "menu" ? "menuitem" : "option"}
        activeIndex={active}
        onActiveIndexChange={setActive}
        onKeyDown={(event) => {
          const at = items().indexOf(document.activeElement as HTMLElement);
          const to =
            event.key === "ArrowDown"
              ? at + 1
              : event.key === "ArrowUp"
                ? at - 1
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? -1
                    : null;
          if (to === null) return;
          event.preventDefault();
          focus(to);
        }}
        onSelect={(option, _index, event) => onChoose(option, event)}
      />
    </div>
  );
}
