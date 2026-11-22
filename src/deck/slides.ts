// The deck's slides and their content: what a deck made from this template
// edits. Each slide's content is keyed by its id and read through
// `slideContent` (content.ts). The template ships placeholders only: every
// kind and every layout, and every generic block in each of its styles
// (tests/deck.spec.ts checks it). Every `Text` has a string for each
// language in `langs` (langs.ts).

import type { SlideContent } from "./content";
import type { Slide, Text } from "./model";

const title: Text = { en: "Placeholder title" };
const text: Text = { en: "Placeholder text" };
const bold: Text = { en: "Placeholder **text**" };

export const slides: Slide[] = [
  { id: "title", kind: "title", title },
  { id: "divider", kind: "divider", section: text, title },
  { id: "stack", kind: "slide", section: text, title },
  { id: "split", kind: "slide", section: text, title },
  { id: "split-end", kind: "slide", section: text, title },
  { id: "center", kind: "slide", section: text, title },
  { id: "statement", kind: "slide", section: text, title },
  { id: "module", kind: "slide", section: text, title },
  { id: "fork", kind: "slide", section: text, title },
  { id: "divider-2", kind: "divider", section: text, title },
  { id: "week", kind: "slide", section: text, title },
  { id: "plan", kind: "slide", section: text, title },
  { id: "closing", kind: "closing", title },
];

export const content: Record<string, SlideContent> = {
  title: { blocks: [{ type: "lead", item: { text } }] },
  divider: { blocks: [] },
  stack: {
    headline: { text },
    layout: "stack",
    blocks: [
      {
        type: "points",
        columns: 2,
        items: [
          { label: title, text },
          { label: text, text },
        ],
      },
    ],
  },
  split: {
    headline: { text },
    layout: "split",
    blocks: [
      {
        type: "steps",
        items: [
          { when: title, label: title, text, status: "done" },
          { when: text, label: text, text, status: "current" },
        ],
      },
      { type: "note", item: { text: bold } },
    ],
  },
  "split-end": {
    headline: { text },
    layout: "split-end",
    blocks: [
      {
        type: "facts",
        items: [
          { label: title, text },
          { label: text, text },
        ],
      },
      {
        type: "points",
        style: "numbered",
        columns: 2,
        items: [
          { label: title, text },
          { label: text, text },
        ],
      },
    ],
  },
  center: {
    headline: { text },
    layout: "center",
    blocks: [{ type: "lead", item: { text } }],
  },
  statement: {
    headline: { text },
    layout: "statement",
    blocks: [{ type: "lead", item: { text }, size: "statement" }],
  },
  module: {
    headline: { text },
    layout: "module",
    blocks: [
      {
        type: "org",
        root: { label: title, text },
        items: [
          { label: title, text },
          { label: text, text },
        ],
      },
    ],
  },
  fork: {
    headline: { text },
    blocks: [
      {
        type: "fork",
        root: { label: title, text },
        items: [
          { label: title, text },
          { label: text, text },
        ],
      },
    ],
  },
  "divider-2": { blocks: [] },
  week: {
    headline: { text },
    blocks: [
      {
        type: "week",
        days: [title, text],
        items: [{ day: title, label: title, text }],
      },
      {
        type: "steps",
        style: "across",
        items: [
          { label: title, text, status: "done" },
          { label: text, text, status: "current" },
        ],
      },
    ],
  },
  plan: {
    headline: { text },
    blocks: [
      {
        type: "plan",
        start: "2026-01",
        end: "2026-06",
        items: [
          { label: title, at: "2026-01", status: "done" },
          { label: text, at: "2026-06" },
          { label: title, span: ["2026-02", "2026-05"] },
        ],
      },
    ],
  },
  closing: {
    headline: { text },
    blocks: [
      { type: "lead", item: { text } },
      {
        type: "points",
        style: "chips",
        items: [{ label: title }, { label: text }],
      },
    ],
  },
};
