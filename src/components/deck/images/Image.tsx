"use client";
// The image preset (feature 002, T132): one image, the owner's file under
// public/images/ or, without one, the template's placeholder. `fit` covers
// the frame (the default) or fits inside it; `bleed` runs it to the slide's
// sides and bottom edge. Its alt text is required and is the picture's alt
// (the placeholder's name). A caption, when given, sits under it muted, or
// on a chip over a full-bleed image. Loaded eagerly, so the PDF render
// prints it (scripts/render-pdf.mjs waits for every image).
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import NextImage from "next/image";
import { Panel } from "@/components/ui/primitives/Panel";
import { Text } from "@/deck/text";
import { words } from "../words";
import { ImagePlaceholder } from "./ImagePlaceholder";
import styles from "@/presets/images/images.module.css";
import { reportLimits } from "../limits";

/** One image's frame: the file, or the placeholder while it has none. */
export function ImageFrame({
  src,
  alt,
  fit = "cover",
  bleed = false,
  sizes,
}: {
  src?: string;
  alt: string;
  fit?: "cover" | "contain";
  bleed?: boolean;
  /** The frame's width on screen, for the browser's choice of file. */
  sizes: string;
}) {
  if (!src) return <ImagePlaceholder alt={words(alt)} bleed={bleed} />;
  return (
    <Panel
      as="div"
      background="surface"
      padding="none"
      gap="none"
      bordered={!bleed}
      shadow={bleed ? "none" : "sm"}
      className={styles.frame}
      data-image-frame=""
      data-fit={fit}
      data-bleed={bleed ? "" : undefined}
    >
      {/* Served as the file is: no optimiser step, so an SVG or any size
          the owner gives shows unchanged, live and in the PDF. */}
      <NextImage
        src={src}
        alt={words(alt)}
        fill
        unoptimized
        loading="eager"
        sizes={sizes}
        className={styles.picture}
        style={{ objectFit: fit }}
      />
    </Panel>
  );
}

/** A caption, muted, under its image (or on a chip over a bleed). */
export function Caption({ text }: { text: string }) {
  return (
    <Text
      as="figcaption"
      variant="label-m"
      tone="secondary"
      className={styles.caption}
      data-image-caption=""
    >
      {words(text)}
    </Text>
  );
}

/** `src`: a path under public/images/; without it, the placeholder. */
export type ImageProps = {
  src?: string;
  alt: string;
  caption?: string;
  fit?: "cover" | "contain";
  bleed?: boolean;
};

export function Image(props: ImageProps) {
  reportLimits("Image", props);
  return (
    <figure
      className={styles.image}
      data-image=""
      data-bleed={props.bleed ? "" : undefined}
    >
      <ImageFrame
        src={props.src}
        alt={props.alt}
        fit={props.fit}
        bleed={props.bleed}
        sizes={props.bleed ? "100vw" : "(orientation: portrait) 100vw, 60vw"}
      />
      {props.caption && <Caption text={props.caption} />}
    </figure>
  );
}
