import { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, Outlet, useLocation } from "react-router-dom";
import { NavMenu } from "../components/NavMenu";
import { SiteFooter } from "../components/SiteFooter";

function AppHeader() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollThreshold = 5;
  const logoSrc = `${import.meta.env.BASE_URL}yieldshield-icon.png`;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY < 10) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (Math.abs(scrollDelta) < scrollThreshold) {
        return;
      }

      if (scrollDelta < 0) {
        setIsVisible(true);
      } else if (scrollDelta > 0 && currentScrollY > 50) {
        setIsVisible(false);
        setMobileMenuOpen(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`print-hide fixed top-0 left-0 right-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 px-0 sm:px-2 border-b border-base-300 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="navbar-start w-auto lg:w-1/2">
        <button
          className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent min-h-[44px] min-w-[44px]"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
        <Link to="/" className="flex items-center gap-2 ml-2 lg:ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <img alt="YieldShield logo" className="cursor-pointer object-contain" src={logoSrc} />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-bold leading-tight text-lg">YieldShield</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <NavMenu pathname={pathname} />
        </ul>
      </div>
      <div className="navbar-end grow mr-4">
        <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
      </div>

      {mobileMenuOpen ? (
        <div className="absolute top-full left-0 right-0 bg-base-100 border-b border-base-300 shadow-lg lg:hidden z-30">
          <ul className="menu menu-vertical p-2 gap-1">
            <NavMenu pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
          </ul>
        </div>
      ) : null}
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="print-hide h-16 lg:h-20 shrink-0" aria-hidden="true" />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
