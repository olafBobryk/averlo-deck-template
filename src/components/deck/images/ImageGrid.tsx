"use client";
// The image grid preset (feature 002, T132): two to six images side by side,
// each the owner's file or the placeholder, covering its cell, with its
// caption under it when given. Up to four share one row; five and six take
// two rows of three. On a phone they pair up.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Caption, ImageFrame } from "./Image";
import styles from "@/presets/images/images.module.css";

/** Two to six images. */
export type ImageGridProps = {
  images: { src?: string; alt: string; caption?: string }[];
};

export function ImageGrid(props: ImageGridProps) {
  const n = props.images.length;
  const columns = n <= 4 ? n : 3;
  return (
    <ul
      className={styles.grid}
      data-image-grid=""
      data-count={n}
      style={{
        ["--cols" as string]: columns,
        ["--rows" as string]: Math.ceil(n / columns),
      }}
    >
      {props.images.map((image, i) => (
        <li key={i} className={styles.cell}>
          <figure className={styles.image} data-image="">
            <ImageFrame
              src={image.src}
              alt={image.alt}
              sizes={`(orientation: portrait) 50vw, ${Math.round(100 / columns)}vw`}
            />
            {image.caption && <Caption text={image.caption} />}
          </figure>
        </li>
      ))}
    </ul>
  );
}
