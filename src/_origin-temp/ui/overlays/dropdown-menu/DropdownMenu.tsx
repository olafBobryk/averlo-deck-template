"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import Link from "next/link";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/motion/motion";
import { Button } from "../../primitives/button/Button";
import { Icon, type IconName } from "../../primitives/icon/Icon";
import { Text } from "../../primitives/text/Text";
import { useOverlayPortalTarget } from "../OverlayPortal";
import {
  HOVER_CLOSE_DELAY_MS,
  hideHoverMenu,
  showHoverMenu,
} from "../hover-menus";
import { popoverMotion } from "@/motion/popover-motion";
import { releaseHoverTrigger, swallowHoverEnter } from "./hover-guard";
import { useHiddenBackgroundInert } from "./native-background-inert";
import styles from "./DropdownMenu.module.css";

// Averlo Next behaviours on Radix machinery: Motion open/close,
// optional hover-open with click-to-pin. Radix keeps keyboard, focus and layers.
/** With a submenu open the pointer is crossing to it: Radix's own grace for that
    crossing, so a slow move over the gap between the panels doesn't close both. */
const HOVER_CLOSE_SUB_DELAY_MS = 300;
type Hover = {
  enter: (event: PointerEvent) => void;
  leave: (event: PointerEvent) => void;
  press: (event: PointerEvent) => void;
  /** The trigger, so a press on it pins rather than counting as outside. */
  isTrigger: (target: EventTarget) => boolean;
  setTrigger: (node: HTMLElement | null) => void;
};
type Context = {
  open: boolean;
  hover: Hover | null;
  /** Counts a submenu in or out, for the hover menu's grace. */
  countSub: (by: 1 | -1) => void;
  /** Whether it closed because another hover menu opened; asking clears it. */
  takeHandedOff: () => boolean;
  /** Whether the menu is open now, which a late close callback must read afresh. */
  isOpen: () => boolean;
  /** Whether the menu was last driven by keys; only then do rows show the ring. */
  keys: boolean;
  setKeys: (keys: boolean) => void;
  /** The press on the trigger, until it is released. */
  press: Press;
};
type Press = {
  begin: (event: PointerEvent) => void;
  /** Whether this release is that press, not a drag onto a row. */
  isSame: (event: PointerEvent) => boolean;
};
const Menu = createContext<Context>({
  open: false,
  hover: null,
  countSub: () => {},
  takeHandedOff: () => false,
  isOpen: () => false,
  keys: false,
  setKeys: () => {},
  press: { begin: () => {}, isSame: () => false },
});

/** As Radix's Select: closer than this, a release is the press that opened the
    menu, not a drag onto a row. */
const RELEASE_SLOP_PX = 10;

/**
 * Radix picks a row on any pointer release over it, for drag-to-select. A menu
 * opens on press, so a row that lands under the pointer before the release was
 * picked by the same click: on a hard load, a chip's menu opened a row
 * and closed. Dragging onto a row still picks it.
 */
function useReleaseGuard(onPointerUp?: (event: PointerEvent<never>) => void) {
  const { press } = useContext(Menu);
  return (event: PointerEvent<never>) => {
    onPointerUp?.(event);
    if (press.isSame(event)) event.preventDefault();
  };
}

type RootProps = ComponentProps<typeof Primitive.Root> & {
  /** Open on mouse hover; a click pins it open until dismissed. */
  openOnHover?: boolean;
};
function Root({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openOnHover = false,
  modal,
  children,
  ...props
}: RootProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const pinned = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const setTrigger = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);
  const [keys, setKeys] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const subs = useRef(0);
  const countSub = useCallback((by: 1 | -1) => {
    subs.current += by;
  }, []);
  const close = useRef<() => void>(() => {});
  const setOpen = useCallback(
    (next: boolean) => {
      window.clearTimeout(timer.current);
      if (!next) pinned.current = false;
      if (openOnHover) {
        // One hover menu at a time, the bell's panel included (hover-menus.ts).
        if (next) showHoverMenu(close);
        else hideHoverMenu(close);
      }
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [openOnHover, openProp, onOpenChange],
  );
  // Moved to another hover menu: focus goes on there, not back to this trigger.
  const handedOff = useRef(false);
  useEffect(() => {
    close.current = () => {
      handedOff.current = true;
      setOpen(false);
    };
  }, [setOpen]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      hideHoverMenu(close);
    },
    [],
  );
  const hover = useMemo<Hover | null>(
    () =>
      openOnHover
        ? {
            setTrigger,
            isTrigger: (target) =>
              !!triggerRef.current?.contains(target as Node),
            enter(event) {
              if (event.pointerType !== "mouse") return;
              // Under a pointer that has not moved (a task space closed): no.
              if (swallowHoverEnter(event.currentTarget, event)) return;
              window.clearTimeout(timer.current);
              if (!open) setOpen(true);
            },
            leave(event) {
              if (event.pointerType === "mouse")
                releaseHoverTrigger(event.currentTarget);
              if (event.pointerType !== "mouse" || pinned.current) return;
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(
                () => setOpen(false),
                subs.current ? HOVER_CLOSE_SUB_DELAY_MS : HOVER_CLOSE_DELAY_MS,
              );
            },
            press(event) {
              if (event.pointerType !== "mouse" || event.button !== 0) return;
              // Replaces Radix's pointer toggle: first press pins, next closes.
              event.preventDefault();
              if (open && !pinned.current) pinned.current = true;
              else if (open) setOpen(false);
              else {
                setOpen(true);
                pinned.current = true;
              }
            },
          }
        : null,
    [openOnHover, open, setOpen, setTrigger],
  );
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const press = useMemo<Press>(
    () => ({
      begin(event) {
        pressedAt.current = { x: event.clientX, y: event.clientY };
        // Bubbling, so a row's handler has already seen it.
        const release = () => {
          pressedAt.current = null;
          window.removeEventListener("pointerup", release);
          window.removeEventListener("pointercancel", release);
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
      },
      isSame(event) {
        const from = pressedAt.current;
        return (
          !!from &&
          Math.hypot(event.clientX - from.x, event.clientY - from.y) <
            RELEASE_SLOP_PX
        );
      },
    }),
    [],
  );
  const openNow = useRef(open);
  useEffect(() => {
    openNow.current = open;
  }, [open]);
  const isOpen = useCallback(() => openNow.current, []);
  const takeHandedOff = useCallback(() => {
    const was = handedOff.current;
    handedOff.current = false;
    return was;
  }, []);
  const value = useMemo(
    () => ({
      open,
      hover,
      countSub,
      takeHandedOff,
      isOpen,
      keys,
      setKeys,
      press,
    }),
    [open, hover, countSub, takeHandedOff, isOpen, keys, press],
  );
  return (
    <Menu value={value}>
      <Primitive.Root
        {...props}
        open={open}
        onOpenChange={setOpen}
        // A hover menu must not block the pointer from reaching its neighbours.
        modal={modal ?? !openOnHover}
      >
        {children}
      </Primitive.Root>
    </Menu>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, node: T) {
  if (typeof ref === "function") return ref(node);
  if (ref) (ref as { current: T }).current = node;
}
function Trigger({
  asChild,
  children,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onKeyDown,
  ref,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  const { hover, setKeys, press } = useContext(Menu);
  return (
    <Primitive.Trigger
      {...props}
      ref={(node) => {
        hover?.setTrigger(node);
        return assignRef(ref, node);
      }}
      asChild
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        hover?.enter(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hover?.leave(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        setKeys(false);
        hover?.press(event);
        press.begin(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        setKeys(true);
      }}
    >
      {asChild ? children : <Button>{children}</Button>}
    </Primitive.Trigger>
  );
}

/** Avatar menu: Modal glass, radius 24. */
function Content({
  ref: forwardedRef,
  onCloseAutoFocus,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onKeyDown,
  onPointerDownOutside,
  forceMount,
  className,
  sideOffset = 8,
  collisionPadding = 16,
  items,
  children,
  ...props
  // No `title`: a menu has no heading. `aria-label` names it, or
  // its trigger does.
}: Omit<ComponentProps<typeof Primitive.Content>, "title"> & {
  /** Renders these entries with the parts below instead of `children`. */
  items?: readonly DropdownMenuEntry[];
}) {
  const { open, hover, takeHandedOff, isOpen, keys, setKeys } =
    useContext(Menu);
  const container = useOverlayPortalTarget();
  const [isolationRef, restore] = useHiddenBackgroundInert(forwardedRef);
  const t = useMotionTokens();
  // Presence recipe: from above, on the control spring; shared
  // with Select so the two never drift.
  const motionProps = popoverMotion(t, open);
  const content = (
    <Primitive.Portal container={container} forceMount>
      <Primitive.Content
        {...props}
        ref={isolationRef}
        // Radix names the menu by its trigger, over any `aria-label`.
        {...(props["aria-label"] && { "aria-labelledby": undefined })}
        className={styles.root}
        forceMount
        onCloseAutoFocus={(event) => {
          // Radix runs this a tick after the content has left, and the exit
          // can finish late (a page just rendering). Opened again by then, the
          // menu is the one holding focus and the inert background: returning
          // focus to the trigger would close it.
          if (isOpen()) {
            onCloseAutoFocus?.(event);
            event.preventDefault();
            return;
          }
          restore();
          onCloseAutoFocus?.(event);
          if (takeHandedOff()) event.preventDefault();
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          hover?.enter(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          hover?.leave(event);
        }}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event);
          // Non-modal hover menus: the trigger's own press pins or closes.
          if (event.target && hover?.isTrigger(event.target))
            event.preventDefault();
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (event.pointerType === "mouse") setKeys(false);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          setKeys(true);
        }}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        <motion.div
          className={[styles.content, className].filter(Boolean).join(" ")}
          data-keys={keys || undefined}
          initial={forceMount ? false : motionProps.initial}
          animate={motionProps.animate}
          exit={motionProps.exit}
        >
          <div className={styles.scroll}>
            {items ? <Entries items={items} /> : children}
          </div>
        </motion.div>
      </Primitive.Content>
    </Primitive.Portal>
  );
  // Radix's element keeps the caller ref and focus; Motion animates the inner
  // surface. forceMount retains one node; otherwise Motion owns mount and exit.
  if (forceMount) return content;
  return <AnimatePresence>{open && content}</AnimatePresence>;
}

/** Averlo Next tones: label and icon in the Card tone foreground,
    the tone's background when highlighted. */
export type DropdownMenuTone = "warning" | "danger";
type RowProps = {
  /** A 24px leading glyph in the primary icon colour. */
  icon?: IconName;
  /** A leading mark in the same box that is not a glyph, such as a provider
      logo (AccountPill); takes the place of `icon`. */
  leading?: ReactNode;
  tone?: DropdownMenuTone;
  /** A Caption line under the label, as the More rows' counts. */
  description?: ReactNode;
  /** A right-aligned Caption, as the frame's count or shortcut. */
  meta?: ReactNode;
};
function Row({
  icon,
  leading,
  description,
  meta,
  children,
}: Omit<RowProps, "tone"> & { children: ReactNode }) {
  return (
    <>
      {leading != null ? (
        <span className={styles.leading} aria-hidden="true">
          {leading}
        </span>
      ) : (
        icon && <Icon name={icon} size={24} className={styles.icon} />
      )}
      <span className={styles.text}>
        <Text variant="label-m" as="span" className={styles.label}>
          {children}
        </Text>
        {description && (
          <Text
            variant="caption"
            tone="secondary"
            className={styles.description}
          >
            {description}
          </Text>
        )}
      </span>
      {meta != null && (
        <Text variant="caption" tone="secondary" className={styles.meta}>
          {meta}
        </Text>
      )}
    </>
  );
}
function rowClass(tone: DropdownMenuTone | undefined, className?: string) {
  return [styles.item, tone && styles[tone], className]
    .filter(Boolean)
    .join(" ");
}
function customClass(className?: string) {
  return [styles.customItem, className].filter(Boolean).join(" ");
}

/**
 * Content in the panel that is not a menu item: a header, a footer, a labelled
 * group (a stretched custom row). It takes no focus and no
 * highlight, a click on it leaves the menu open, and it scrolls with the rows.
 * The caller draws it. To put something the keyboard can reach inside it, use
 * `Item` or `RadioItem` with `custom`.
 */
function Custom({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={[styles.custom, className].filter(Boolean).join(" ")}
    />
  );
}

type ItemProps = ComponentProps<typeof Primitive.Item> &
  RowProps & {
    /** Marks the row as the current page (`aria-current="page"`). */
    current?: boolean;
    /** A link row (client navigation). */
    href?: string;
    /** The caller draws it, whatever its shape; the menu keeps its focus,
        keyboard order and ring. The row props above do not apply. */
    custom?: boolean;
  };
function Item({
  icon,
  leading,
  tone,
  description,
  meta,
  current,
  href,
  custom,
  asChild,
  className,
  children,
  onPointerUp,
  ...props
}: ItemProps) {
  const guard = useReleaseGuard(onPointerUp as never);
  const content =
    asChild || custom ? (
      // A child element (a link), or a custom row, brings its own content.
      children
    ) : (
      <Row icon={icon} leading={leading} description={description} meta={meta}>
        {children}
      </Row>
    );
  return (
    <Primitive.Item
      {...props}
      disabled={props.disabled}
      onPointerUp={guard as never}
      asChild={asChild || !!href}
      data-tone={tone}
      aria-current={current ? "page" : undefined}
      className={custom ? customClass(className) : rowClass(tone, className)}
    >
      {href ? <Link href={href}>{content}</Link> : content}
    </Primitive.Item>
  );
}

/** A choice in a `RadioGroup`: one of a set, checked with a trailing check
    (menuitemradio), as AccountPill's accounts. Not in Figma. `custom` draws it
    as the caller likes, with no row or check, as the account menu's theme
    pills: the state is `data-state`. */
function RadioItem({
  icon,
  leading,
  description,
  meta,
  custom,
  className,
  children,
  onPointerUp,
  ...props
}: ComponentProps<typeof Primitive.RadioItem> &
  Omit<RowProps, "tone"> & { custom?: boolean }) {
  const guard = useReleaseGuard(onPointerUp as never);
  if (custom)
    return (
      <Primitive.RadioItem
        {...props}
        onPointerUp={guard as never}
        className={customClass(className)}
      >
        {children}
      </Primitive.RadioItem>
    );
  return (
    <Primitive.RadioItem
      {...props}
      onPointerUp={guard as never}
      className={rowClass(undefined, className)}
    >
      <Row icon={icon} leading={leading} description={description} meta={meta}>
        {children}
      </Row>
      {/* Mounted while unchecked too, so the check can swap out. */}
      <Primitive.ItemIndicator forceMount className={styles.check}>
        <Icon name="check" size={16} />
      </Primitive.ItemIndicator>
    </Primitive.RadioItem>
  );
}

/** `inset` (default) lines up with the row text; `full` spans the panel. */
function Separator({
  variant = "inset",
  className,
  ...props
}: ComponentProps<typeof Primitive.Separator> & {
  variant?: "inset" | "full";
}) {
  return (
    <Primitive.Separator
      {...props}
      data-variant={variant}
      className={[styles.separator, className].filter(Boolean).join(" ")}
    />
  );
}

/** A row that opens a submenu; only these rows carry a trailing caret, unless
    `caret={false}` for a row whose `meta` draws its own. */
function SubTrigger({
  icon,
  tone,
  description,
  meta,
  caret = true,
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.SubTrigger> &
  RowProps & { caret?: boolean }) {
  return (
    <Primitive.SubTrigger
      {...props}
      data-tone={tone}
      className={rowClass(tone, className)}
    >
      <Row icon={icon} description={description} meta={meta}>
        {children}
      </Row>
      {caret && (
        <Icon name="chevron_right" size={16} className={styles.caret} />
      )}
    </Primitive.SubTrigger>
  );
}

/** A submenu's open state, so its content can play its exit as the menu's does. */
const SubOpen = createContext(false);
function Sub({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: ComponentProps<typeof Primitive.Sub>) {
  const { countSub } = useContext(Menu);
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  useEffect(() => {
    if (!open) return;
    countSub(1);
    return () => countSub(-1);
  }, [open, countSub]);
  return (
    <SubOpen value={open}>
      <Primitive.Sub
        {...props}
        open={open}
        onOpenChange={(next) => {
          setUncontrolled(next);
          onOpenChange?.(next);
        }}
      >
        {children}
      </Primitive.Sub>
    </SubOpen>
  );
}

/** A submenu on the same surface, aligned so its first row sits level with the
    row that opened it, unless `alignOffset` places it as a frame draws it. Its
    exit mirrors its enter, and a reopen reverses from where it is. */
function SubContent({
  className,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onKeyDown,
  sideOffset = 4,
  // Panel inset (space/8) plus the 1px border: the first submenu row lines up
  // with the row that opened it.
  alignOffset = -9,
  collisionPadding = 16,
  onExited,
  children,
  ...props
}: ComponentProps<typeof Primitive.SubContent> & {
  /** Its exit has finished. */
  onExited?: () => void;
}) {
  const { hover, keys, setKeys } = useContext(Menu);
  const open = useContext(SubOpen);
  const container = useOverlayPortalTarget();
  const t = useMotionTokens();
  const motionProps = popoverMotion(t, open, "side");
  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <Primitive.Portal container={container} forceMount>
          <Primitive.SubContent
            {...props}
            forceMount
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            collisionPadding={collisionPadding}
            className={styles.root}
            // A hover-opened menu stays open while the pointer is in a submenu.
            onPointerEnter={(event) => {
              onPointerEnter?.(event);
              hover?.enter(event);
            }}
            onPointerLeave={(event) => {
              onPointerLeave?.(event);
              // Back to the panel it opened from: still in the menu, though
              // React sends the panel no enter, as this is its child.
              const to = event.relatedTarget;
              if (to instanceof Element && to.closest('[role="menu"]')) return;
              hover?.leave(event);
            }}
            onPointerMove={(event) => {
              onPointerMove?.(event);
              if (event.pointerType === "mouse") setKeys(false);
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              setKeys(true);
            }}
          >
            <motion.div
              className={[styles.content, className].filter(Boolean).join(" ")}
              data-keys={keys || undefined}
              initial={motionProps.initial}
              animate={motionProps.animate}
              exit={motionProps.exit}
            >
              <div className={styles.scroll}>{children}</div>
            </motion.div>
          </Primitive.SubContent>
        </Primitive.Portal>
      )}
    </AnimatePresence>
  );
}

/** One entry of the `items` shorthand: an action or link row, a submenu
    (`children`), or a separator. */
export type DropdownMenuEntry =
  | { separator: true; variant?: "inset" | "full"; id?: string }
  | (RowProps & {
      separator?: never;
      id?: string;
      label: ReactNode;
      disabled?: boolean;
      /** A link row (client navigation); otherwise `onSelect` runs. */
      href?: string;
      current?: boolean;
      onSelect?: (event: Event) => void;
      children?: readonly DropdownMenuEntry[];
    });

/** Toned rows go last behind a separator, warning before danger so the most
    destructive row is at the end, as Averlo Next orders them. The caller's
    order holds within each group. */
function ordered(
  items: readonly DropdownMenuEntry[],
): readonly DropdownMenuEntry[] {
  const plain = items.filter((item) => item.separator || !item.tone);
  const toned = (["warning", "danger"] as const).flatMap((tone) =>
    items.filter((item) => !item.separator && item.tone === tone),
  );
  while (plain.at(-1)?.separator) plain.pop();
  return plain.length && toned.length
    ? [...plain, { separator: true, id: "tone-separator" }, ...toned]
    : [...plain, ...toned];
}
function Entries({ items }: { items: readonly DropdownMenuEntry[] }) {
  return ordered(items).map((item, index) => {
    const key = item.id ?? index;
    if (item.separator) return <Separator key={key} variant={item.variant} />;
    const { label, icon, tone, description, meta, disabled, href, current } =
      item;
    const { onSelect } = item;
    if (item.children?.length)
      return (
        <Sub key={key}>
          <SubTrigger
            icon={icon}
            tone={tone}
            description={description}
            meta={meta}
            disabled={disabled}
          >
            {label}
          </SubTrigger>
          <SubContent>
            <Entries items={item.children} />
          </SubContent>
        </Sub>
      );
    return (
      <Item
        key={key}
        icon={icon}
        tone={tone}
        description={description}
        meta={meta}
        href={href}
        current={current}
        disabled={disabled}
        onSelect={onSelect}
      >
        {label}
      </Item>
    );
  });
}

export const DropdownMenu = Object.assign(Root, {
  Trigger,
  Content,
  Custom,
  Item,
  Separator,
  Group: Primitive.Group,
  RadioGroup: Primitive.RadioGroup,
  RadioItem,
  Sub,
  SubTrigger,
  SubContent,
});
