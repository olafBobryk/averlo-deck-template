// The image preset (feature 002, T132): one image, the owner's file under
// public/images/ or, without one, the template's placeholder. `fit` covers
// the frame (the default) or fits inside it; `bleed` runs it to the slide's
// sides and bottom edge. Its alt text is required and is the picture's alt
// (the placeholder's name). A caption, when given, sits under it muted, or
// on a chip over a full-bleed image. Loaded eagerly, so the PDF render
// prints it (scripts/render-pdf.mjs waits for every image).
import NextImage from "next/image";
import { Panel } from "@/components/ui/primitives/Panel";
import type { Lang } from "@/deck/langs";
import type { Text as Words } from "@/deck/model";
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import { ImagePlaceholder } from "./ImagePlaceholder";
import styles from "./images.module.css";

/** One image's frame: the file, or the placeholder while it has none. */
export function ImageFrame({
  src,
  alt,
  fit = "cover",
  bleed = false,
  sizes,
  lang,
}: {
  src?: string;
  alt: Words;
  fit?: "cover" | "contain";
  bleed?: boolean;
  /** The frame's width on screen, for the browser's choice of file. */
  sizes: string;
  lang: Lang;
}) {
  if (!src) return <ImagePlaceholder alt={say(alt, lang)} bleed={bleed} />;
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
        alt={say(alt, lang)}
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
export function Caption({ text, lang }: { text: Words; lang: Lang }) {
  return (
    <Text
      as="figcaption"
      variant="label-m"
      tone="secondary"
      className={styles.caption}
      data-image-caption=""
    >
      {say(text, lang)}
    </Text>
  );
}

export function ImagePreset({ block, lang }: PresetProps<"image">) {
  return (
    <figure
      className={styles.image}
      data-image=""
      data-bleed={block.bleed ? "" : undefined}
    >
      <ImageFrame
        src={block.src}
        alt={block.alt}
        fit={block.fit}
        bleed={block.bleed}
        sizes={block.bleed ? "100vw" : "(orientation: portrait) 100vw, 60vw"}
        lang={lang}
      />
      {block.caption && <Caption text={block.caption} lang={lang} />}
    </figure>
  );
}
