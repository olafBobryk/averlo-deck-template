// The image placeholder (feature 002, T132), template-owned and neutral: an
// Averlo Panel on the surface token with a picture glyph and the word
// "Image" in the muted tone, shown wherever an image has no file yet. It is
// no stock photo and stands for nothing; it carries the image's alt text as
// its name, so a reader hears what the image will be.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text } from "@/deck/text";
import styles from "./images.module.css";

export function ImagePlaceholder({
  alt,
  bleed = false,
}: {
  /** The image's alt text, in the slide's language. */
  alt: string;
  bleed?: boolean;
}) {
  return (
    <Panel
      as="div"
      role="img"
      aria-label={alt}
      background="surface"
      padding="none"
      gap="none"
      bordered={!bleed}
      shadow={bleed ? "none" : "sm"}
      className={`${styles.frame} ${styles.placeholder}`}
      data-image-frame=""
      data-image-placeholder=""
      data-bleed={bleed ? "" : undefined}
    >
      <svg
        className={styles.glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.75" />
        <path d="M3.5 17.5 9.5 12l4 3.5 2.5-2 4.5 4" />
      </svg>
      <Text
        as="span"
        variant="label-m"
        tone="secondary"
        className={styles.placeholderLabel}
      >
        Image
      </Text>
    </Panel>
  );
}
