"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { IconSwap } from "../../foundations/IconSwap";
import { useMotionTokens } from "@/motion/motion";
import { Icon, type IconName } from "../icon/Icon";
import { Loader } from "../loader/Loader";
import { Skeleton } from "../skeleton/Skeleton";
import styles from "./Button.module.css";
import {
  setRouteIntent,
  type RouteIntent,
} from "@/motion/route-transition";
/** Step statuses. */
export type ButtonStepStatus =
  "done" | "current" | "upcoming" | "skipped" | "error";
type ButtonOwnProps = {
  /** `bare` is an in-text action: no pill, no padding.
      `outline` is "Expand control", a quiet pill: no fill, a 10%
      border, the secondary label and icon. */
  variant?:
    "primary" | "secondary" | "tint" | "danger" | "ghost" | "bare" | "outline";
  /** `step` is the compact step pill; its look comes from `status`, not `variant`. */
  size?: "sm" | "md" | "lg" | "step";
  /** Icons animate in and out; a different `key` or Icon `name` crossfades. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Where the label and icons sit. "start" left-aligns them for full-width rows. */
  align?: "center" | "start";
  /** Step size only. Done, skipped and error also supply their leading icon. */
  status?: ButtonStepStatus;
};
export type ButtonProps = ButtonOwnProps &
  ComponentProps<"button"> & {
    loading?: boolean;
    /** What a loading button says beside its spinner (e.g. "Signing in…").
        Without one the spinner replaces the label. */
    loadingLabel?: ReactNode;
    /** "span" draws the same pill without button semantics, for display-only steps. */
    as?: "button" | "span";
    href?: undefined;
  };
/**
 * `href` renders the pill as a next/link for client-side navigation. Links
 * have no disabled or loading state (HTML links cannot be disabled): when the
 * destination is unavailable, render a disabled Button or no link instead.
 */
export type ButtonLinkProps = ButtonOwnProps &
  Omit<ComponentProps<typeof Link>, "as" | "type"> & {
    /** What the link does (its direction): `complete` for a flow's
     *  done CTA (forward), `close` to
     *  leave a page on top (back). Without one the route map decides. */
    intent?: RouteIntent;
    as?: never;
    type?: never;
    disabled?: never;
    loading?: never;
    loadingLabel?: never;
  };
const statusIcons: Partial<Record<ButtonStepStatus, IconName>> = {
  done: "check",
  skipped: "redo",
  error: "error",
};
/** Identity for crossfading a swapped icon: its key, else an Icon's name. */
function iconKey(icon: ReactNode) {
  if (!isValidElement(icon)) return "icon";
  return String(icon.key ?? (icon.props as { name?: unknown }).name ?? "icon");
}
/**
 * Button owns icon motion. The slot's width (icon plus its gap)
 * grows from 0 so the label slides instead of jumping; a swapped icon fades
 * and scales through. Only the slot and icon fade, never the button.
 */
function IconSlot({
  icon,
  side,
  appear,
}: {
  icon: ReactNode;
  side: "leading" | "trailing";
  /** Animate an icon that is present when the button mounts. */
  appear: boolean;
}) {
  // The control spring moves the slot and icon, opacity fades,
  // exits leave on the quicker exit fade, swaps scale through scale.swap.
  const t = useMotionTokens();
  const transition = { ...t.spring.control, opacity: t.fade };
  const leave = { ...t.spring.control, opacity: t.exit };
  return (
    <AnimatePresence initial={appear}>
      {icon != null && (
        <motion.span
          key={side}
          aria-hidden="true"
          className={styles.iconSlot}
          data-side={side}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0, transition: leave }}
          transition={transition}
        >
          <IconSwap swapKey={iconKey(icon)} overlap className={styles.icon}>
            {icon}
          </IconSwap>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
/**
 * A button's loading: the spinner enters on
 * `fade` and leaves on `exit` in place over the label, which fades under it
 * (Button.module.css). Nothing scales or moves.
 */
function ButtonLoader({
  loading,
  end,
}: {
  loading: boolean;
  /** At the end, beside a loading label; a leaving spinner keeps it. */
  end: boolean;
}) {
  const t = useMotionTokens();
  return (
    <AnimatePresence initial={false}>
      {loading && (
        <motion.span
          key="loader"
          className={styles.loader}
          data-end={end || undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: t.fade }}
          exit={{ opacity: 0, transition: t.exit }}
        >
          <Loader />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
/** The label and the loading label crossfade where they stand,
    stacked in one place, so the label never changes in one frame. */
function LoadingLabel({
  labelled,
  loadingLabel,
  children,
}: {
  labelled: boolean;
  loadingLabel: ReactNode;
  children: ReactNode;
}) {
  const t = useMotionTokens();
  return (
    <span className={styles.labels}>
      <AnimatePresence initial={false}>
        <motion.span
          key={labelled ? "loading" : "label"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: t.fade }}
          exit={{ opacity: 0, transition: t.exit }}
        >
          {labelled ? loadingLabel : children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
export function Button({
  children,
  variant = "secondary",
  size = "md",
  leadingIcon,
  trailingIcon,
  align = "center",
  status,
  className,
  loadingLabel,
  ...rest
}: ButtonProps | ButtonLinkProps) {
  // A loading button with its own label keeps the label, swapped.
  const labelled = !!rest.loading && loadingLabel != null;
  const step = size === "step";
  const statusIcon = step && status ? statusIcons[status] : undefined;
  const leading =
    leadingIcon !== undefined ? (
      leadingIcon
    ) : (
      statusIcon && <Icon key={statusIcon} name={statusIcon} size={14} />
    );
  const content = (
    <span className={styles.content}>
      {/* Icons present at mount are at rest. A step that remounts (span ↔
          button) mounts in its old state and changes a frame later, so its
          icon still enters and leaves through this slot (a top bar step). */}
      <IconSlot icon={leading} side="leading" appear={false} />
      {step ? (
        // The strong copy keeps the label at the wider weight,
        // so a status change never resizes it; the two
        // weights crossfade.
        <span className={styles.stepLabel}>
          <span>{children}</span>
          <span className={styles.strong} aria-hidden="true">
            {children}
          </span>
        </span>
      ) : loadingLabel != null ? (
        <LoadingLabel labelled={labelled} loadingLabel={loadingLabel}>
          {children}
        </LoadingLabel>
      ) : (
        <span>{children}</span>
      )}
      <IconSlot icon={trailingIcon} side="trailing" appear={false} />
    </span>
  );
  const data = {
    // The root names its component; IconButton names itself.
    "data-component":
      (rest as { "data-component"?: string })["data-component"] ?? "Button",
    "data-variant": step ? undefined : variant,
    "data-size": size,
    "data-status": step ? (status ?? "upcoming") : undefined,
    "data-align": align === "start" ? "start" : undefined,
  };
  if (rest.href !== undefined) {
    const { intent, onClick, ...link } = rest as ButtonLinkProps;
    return (
      <Link
        // A link to a page plus a query prefetches a
        // catch-all route, and Next refetches that forever in a production
        // build: thousands of requests a second. These open a step in the client.
        prefetch={String(rest.href).includes("?") ? false : undefined}
        {...link}
        {...data}
        onClick={(event) => {
          if (intent) setRouteIntent(intent);
          onClick?.(event);
        }}
        className={[styles.button, className].filter(Boolean).join(" ")}
      >
        {content}
      </Link>
    );
  }
  const {
    as = "button",
    loading = false,
    disabled = false,
    type = "button",
    onClick,
    onClickCapture,
    onKeyDown,
    ...props
  } = rest;
  if (as === "span")
    return (
      <span
        {...(props as ComponentProps<"span">)}
        {...data}
        className={[styles.button, className].filter(Boolean).join(" ")}
      >
        {content}
      </span>
    );
  const blocked =
    disabled ||
    loading ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...data}
      data-loading={loading || undefined}
      data-loading-label={labelled || undefined}
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClickCapture={(event) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClickCapture?.(event);
      }}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (blocked && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyDown?.(event);
      }}
    >
      {content}
      <ButtonLoader loading={loading} end={labelled} />
    </button>
  );
}

export type ButtonSkeletonProps = {
  /** The label the loaded button shows: it sizes the skeleton. */
  children: ReactNode;
  variant?: ButtonOwnProps["variant"];
  size?: Exclude<ButtonOwnProps["size"], "step">;
  /** The loaded button has a leading icon. */
  leadingIcon?: boolean;
  className?: string;
};
/**
 * A button whose label or
 * state waits on data. The real button is laid out hidden, with its label,
 * so the skeleton is its exact size; primary buttons take a tinted fill,
 * the rest the neutral one.
 */
function ButtonSkeleton({
  children,
  variant = "secondary",
  size = "md",
  leadingIcon = false,
  className,
}: ButtonSkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-skeleton-button=""
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
    >
      <span
        className={styles.button}
        data-variant={variant}
        data-size={size}
        inert
      >
        <span className={styles.content}>
          {leadingIcon && (
            <span className={styles.iconSlot} data-side="leading">
              <span className={styles.icon} />
            </span>
          )}
          <span>{children}</span>
        </span>
      </span>
      <Skeleton
        width="100%"
        height="100%"
        radius="pill"
        className={variant === "primary" ? styles.skeletonTint : undefined}
      />
    </span>
  );
}
Button.Skeleton = ButtonSkeleton;
