"use client";
import type { ComponentProps } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { pointerFocus } from "../../foundations/pointer-focus";
import { SelectionIndicator } from "@/motion/selection-indicator";
import { WeightLabel } from "../../foundations/weight-label";
import styles from "./SegmentedControl.module.css";
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-label"?: string; "aria-labelledby": string };
export type SegmentedControlProps = Pick<
  ComponentProps<typeof RadioGroup.Root>,
  | "children"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "disabled"
  | "name"
  | "required"
  | "className"
  | "aria-label"
  | "aria-labelledby"
  | "id"
  | "ref"
> &
  AccessibleName & {
    /** `md` is the default. `sm` is a panel's scope switch:
        a flat action/disabled/bg track, Label/S segments,
        the checked one on action/secondary, the others in text/accent. */
    size?: "md" | "sm";
    /** `bare`: no track, the segments 6 apart (Control=Segmented);
        the fill still slides. Default `track`. */
    variant?: "track" | "bare";
  };
function Root({
  className,
  children,
  size = "md",
  variant = "track",
  ...props
}: SegmentedControlProps) {
  return (
    <RadioGroup.Root
      {...props}
      orientation="horizontal"
      data-component="SegmentedControl"
      data-size={size}
      data-variant={variant}
      className={[styles.group, className].filter(Boolean).join(" ")}
    >
      {/* One fill slides to the checked item. */}
      <SelectionIndicator
        selected=":scope > [data-state=checked]"
        className={styles.indicator}
      />
      {children}
    </RadioGroup.Root>
  );
}
export type SegmentedControlItemProps = Pick<
  ComponentProps<typeof RadioGroup.Item>,
  "children" | "value" | "disabled" | "className" | "ref"
>;
function Item({ className, children, ...props }: SegmentedControlItemProps) {
  return (
    <RadioGroup.Item
      {...props}
      {...pointerFocus}
      data-component="SegmentedControl.Item"
      className={[styles.item, className].filter(Boolean).join(" ")}
    >
      <WeightLabel>{children}</WeightLabel>
    </RadioGroup.Item>
  );
}
/** Source guidance: use no more than four options. */
export const SegmentedControl = Object.assign(Root, { Item });
