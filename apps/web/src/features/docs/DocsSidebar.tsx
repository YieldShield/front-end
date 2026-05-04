import { Link, useLocation } from "react-router-dom";
import { docsNavigation } from "./navigation";

export function DocsSidebar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-24 pr-8">
      {docsNavigation.map(section => (
        <div key={section.title} className="mb-6">
          <h3 className="text-sm font-semibold text-base-content mb-2 uppercase tracking-wide">{section.title}</h3>
          <ul className="space-y-1">
            {section.items.map(item => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium"
                        : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
