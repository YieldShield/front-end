import { useState } from "react";
import { MDXProvider } from "@mdx-js/react";
import { Outlet } from "react-router-dom";
import { DocsSidebar } from "./DocsSidebar";
import { mdxComponents } from "./_components/MdxComponents";

export function DocsLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <div
        className={`print-hide fixed lg:hidden inset-y-0 left-0 z-40 w-72 bg-base-100 border-r border-base-300 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto px-4 pt-20 pb-6">
          <DocsSidebar />
        </div>
      </div>

      {isMobileOpen && (
        <button
          type="button"
          className="print-hide lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close docs navigation"
        />
      )}

      <aside className="print-hide hidden lg:block w-64 shrink-0 border-r border-base-300">
        <div className="sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pl-4 pr-8 py-6">
          <DocsSidebar />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="print-hide lg:hidden mb-6">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsMobileOpen(open => !open)}
            >
              Browse Docs
            </button>
          </div>
          <article className="prose prose-lg max-w-none text-base-content">
            <MDXProvider components={mdxComponents}>
              <Outlet />
            </MDXProvider>
          </article>
        </div>
      </main>
    </div>
  );
}
