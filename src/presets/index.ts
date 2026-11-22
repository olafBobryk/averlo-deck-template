// The preset visuals, by block type (feature 002). The deck's block switch
// (src/deck/SlideBody.tsx) hands every preset block to `PresetView`, which
// draws it with its component. Later phases add each component here; until
// then a block draws the neutral pending stub.
import { createElement, type ComponentType } from "react";
import type { PresetBlock } from "@/deck/content";
import type { Lang } from "@/deck/langs";
import { Pending } from "./Pending";

type PresetType = PresetBlock["type"];

/** What a preset's component takes: its block, the language, and `still`
 *  for thumbnails and print. Content only, no style options (FR-002). */
export type PresetProps<T extends PresetType = PresetType> = {
  block: Extract<PresetBlock, { type: T }>;
  lang: Lang;
  still?: boolean;
};

/** Each preset block type's component. */
const presets: { [T in PresetType]?: ComponentType<PresetProps<T>> } = {};

/** A preset block, drawn by its component, or by the pending stub while it
 *  has none. */
export function PresetView(props: PresetProps) {
  const component = (presets[props.block.type] ??
    Pending) as ComponentType<PresetProps>;
  return createElement(component, props);
}
