"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
type ThemeState = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
};
const serverState: ThemeState = {
  preference: "system",
  resolvedTheme: "light",
};
const ThemeContext = createContext<
  (ThemeState & { setPreference: (value: ThemePreference) => void }) | null
>(null);
const validate = (value: unknown): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";

function createThemeStore(persist: boolean) {
  let preference: ThemePreference = "system";
  try {
    if (persist)
      preference = validate(window.localStorage.getItem("deck.theme"));
  } catch {}
  const media =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const resolve = (): ThemeState => ({
    preference,
    resolvedTheme:
      preference === "system"
        ? media?.matches
          ? "dark"
          : "light"
        : preference,
  });
  let state = resolve();
  const listeners = new Set<() => void>();
  const update = () => {
    const next = resolve();
    document.documentElement.dataset.theme = next.resolvedTheme;
    document.documentElement.style.colorScheme = next.resolvedTheme;
    if (
      next.preference !== state.preference ||
      next.resolvedTheme !== state.resolvedTheme
    ) {
      state = next;
      listeners.forEach((listener) => listener());
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (
      (event.key === "deck.theme" || event.key === null) &&
      event.storageArea === window.localStorage
    ) {
      preference = validate(event.newValue);
      update();
    }
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        media?.addEventListener("change", update);
        if (persist) window.addEventListener("storage", onStorage);
        update();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          media?.removeEventListener("change", update);
          if (persist) window.removeEventListener("storage", onStorage);
        }
      };
    },
    setPreference(value: ThemePreference) {
      preference = validate(value);
      try {
        if (!persist) {
          update();
          return;
        }
        if (preference === "system")
          window.localStorage.removeItem("deck.theme");
        else window.localStorage.setItem("deck.theme", preference);
      } catch {}
      update();
    },
  };
}

export function ThemeProvider({
  children,
  persist = true,
}: {
  children: ReactNode;
  persist?: boolean;
}) {
  const [store] = useState(() => createThemeStore(persist));
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => serverState,
  );
  return (
    <ThemeContext value={{ ...state, setPreference: store.setPreference }}>
      {children}
    </ThemeContext>
  );
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme requires ThemeProvider");
  return theme;
}
