import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  mounted: boolean;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "yieldshield-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : getSystemTheme();

    setTheme(nextTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mounted,
      resolvedTheme: theme,
      setTheme,
      toggleTheme: () => setTheme(current => (current === "dark" ? "light" : "dark")),
    }),
    [mounted, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
}
