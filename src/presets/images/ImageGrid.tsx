// The image grid preset (feature 002, T132): two to six images side by side,
// each the owner's file or the placeholder, covering its cell, with its
// caption under it when given. Up to four share one row; five and six take
// two rows of three. On a phone they pair up.
import type { PresetProps } from "..";
import { Caption, ImageFrame } from "./Image";
import styles from "./images.module.css";

export function ImageGridPreset({ block, lang }: PresetProps<"imageGrid">) {
  const n = block.images.length;
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
      {block.images.map((image, i) => (
        <li key={i} className={styles.cell}>
          <figure className={styles.image} data-image="">
            <ImageFrame
              src={image.src}
              alt={image.alt}
              sizes={`(orientation: portrait) 50vw, ${Math.round(100 / columns)}vw`}
              lang={lang}
            />
            {image.caption && <Caption text={image.caption} lang={lang} />}
          </figure>
        </li>
      ))}
    </ul>
  );
}
