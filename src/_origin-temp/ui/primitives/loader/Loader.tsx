import styles from "./Loader.module.css";

export function Loader({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.loader, className].filter(Boolean).join(" ")}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 2a6 6 0 1 1-6 6" />
    </svg>
  );
}
