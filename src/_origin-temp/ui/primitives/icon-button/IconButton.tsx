"use client";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../button/Button";
import styles from "./IconButton.module.css";
export type IconButtonProps = Omit<
  ButtonProps,
  | "variant"
  | "size"
  | "leadingIcon"
  | "trailingIcon"
  | "children"
  | "aria-label"
> & {
  label: string;
  children: ReactNode;
  /**
   * Default and Tint. Primary has no Icon button source: it is
   * Button Primary's recipe (Action/Primary) on the same 34px
   * circle, for a submit inside a field.
   */
  variant?: "default" | "tint" | "primary";
  /**
   * The default variant's glyph colour. `muted` (icon/muted, the default's own) or
   * `default` (icon/default), as a frame binds it: the conversation header
   * draws Expand and Close in icon/default.
   * Tint and primary keep their own label colours.
   */
  tone?: "muted" | "default";
};
export function IconButton({
  label,
  variant = "default",
  tone = "muted",
  children,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      variant={variant === "primary" ? "primary" : "ghost"}
      aria-label={label}
      data-component="IconButton"
      data-icon-variant={variant}
      data-icon-tone={tone}
      className={[styles.iconButton, className].filter(Boolean).join(" ")}
    >
      <span className={styles.icon} aria-hidden="true">
        {children}
      </span>
    </Button>
  );
}
