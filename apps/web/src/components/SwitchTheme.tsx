import { useTheme } from "../providers/ThemeProvider";

export function SwitchTheme({ className }: { className?: string }) {
  const { mounted, resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  if (!mounted) {
    return <div className={`h-8 w-24 ${className ?? ""}`} aria-hidden="true" />;
  }

  return (
    <div className={`flex h-8 items-center justify-center space-x-2 text-sm ${className ?? ""}`}>
      <input
        id="theme-toggle"
        type="checkbox"
        className="toggle bg-secondary toggle-primary hover:bg-accent transition-all"
        onChange={toggleTheme}
        checked={isDarkMode}
      />
      <label htmlFor="theme-toggle" className={`swap swap-rotate ${!isDarkMode ? "swap-active" : ""}`}>
        <span className="swap-on text-base" aria-hidden="true">
          ☀
        </span>
        <span className="swap-off text-base" aria-hidden="true">
          ☾
        </span>
      </label>
    </div>
  );
}
