import { socialLinks } from "../config/site-navigation";
import { SwitchTheme } from "./SwitchTheme";
import { TokenFaucet } from "./TokenFaucet";

export function SiteFooter() {
  return (
    <footer className="print-hide border-t border-base-300 bg-base-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70">
          {socialLinks.map((link, index) => (
            <span key={link.href} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <a href={link.href} target="_blank" rel="noreferrer" className="link link-hover">
                {link.label}
              </a>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <TokenFaucet />
          <SwitchTheme />
        </div>
      </div>
    </footer>
  );
}
