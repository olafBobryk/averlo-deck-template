import styles from "./Icon.module.css";
import glyphs from "./icon-glyphs.module.css";
export type IconName =
  | "schedule"
  | "mail"
  | "mark_email_read"
  | "mic"
  | "more_horiz"
  | "chevron_right"
  | "send"
  | "close"
  | "today"
  | "check"
  | "keyboard_arrow_down"
  | "keyboard_arrow_up"
  | "search"
  | "check_circle"
  | "info"
  | "warning"
  | "error"
  | "description"
  | "download"
  | "attach_file"
  | "open_in_new"
  | "calendar_today"
  | "person"
  | "person_add"
  | "keep"
  | "arrow_back"
  | "settings"
  | "sync"
  | "edit"
  | "edit_square"
  | "redo"
  | "visibility"
  | "visibility_off"
  | "play_arrow"
  | "star_shine"
  | "reply"
  | "link"
  | "add"
  | "stop"
  | "pause"
  | "skip_next"
  | "logout"
  | "history"
  | "newspaper"
  | "lock"
  | "key"
  | "chevron_left"
  | "search_off"
  | "graphic_eq"
  | "arrow_upward"
  | "notifications"
  | "domain"
  | "group"
  | "open_in_full"
  | "close_fullscreen"
  | "format_bold"
  | "format_italic"
  | "format_list_bulleted"
  | "image"
  | "photo_camera";
export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: 12 | 14 | 16 | 18 | 20 | 24;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={[styles.icon, glyphs[name], className]
        .filter(Boolean)
        .join(" ")}
      style={{
        // A slot that owns its icon size (Button) sets --icon-slot-size.
        width: `var(--icon-slot-size, ${size}px)`,
        height: `var(--icon-slot-size, ${size}px)`,
      }}
    />
  );
}
