import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { Link } from "react-router-dom";

// MDX source files use absolute hrefs like "/docs/architecture/fee-structure".
// Under HashRouter those need to flow through React Router instead of full page loads.
function SmartLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) {
    return <a {...rest}>{children}</a>;
  }

  const isExternal = /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:");
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
        {children}
      </a>
    );
  }

  // Fragment-only links (heading anchors injected by rehype-autolink-headings
  // or explicit same-page links in MDX). Under HashRouter the hash is reserved
  // for the route, so a plain `<a href="#foo">` would clobber it and navigate
  // the app. Instead, scroll to the target element on click.
  if (href.startsWith("#")) {
    const targetId = href.slice(1);
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (!targetId) return;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    return (
      <a href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={rest.className}>
      {children}
    </Link>
  );
}

export const mdxComponents = {
  a: SmartLink,
};
