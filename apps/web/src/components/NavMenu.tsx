import { Link } from "react-router-dom";
import { menuLinks } from "../config/site-navigation";

type NavMenuProps = {
  onNavigate?: () => void;
  pathname: string;
};

export function NavMenu({ onNavigate, pathname }: NavMenuProps) {
  return (
    <>
      {menuLinks.map(({ href, label }) => {
        const isActive = pathname === href;

        return (
          <li key={href}>
            <Link
              to={href}
              onClick={onNavigate}
              className={`${
                isActive ? "bg-base-300 text-base-content font-semibold" : "text-base-content/70"
              } hover:bg-base-200 hover:text-base-content transition-colors py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
}
