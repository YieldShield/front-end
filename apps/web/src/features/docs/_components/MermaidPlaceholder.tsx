import { useEffect, useRef, useState } from "react";

type MermaidPlaceholderProps = {
  chart: string;
};

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      initialized?: boolean;
      run?: (options: { nodes: Element[] }) => Promise<void>;
      render?: (id: string, chart: string) => Promise<{ svg: string }>;
    };
  }
}

export function MermaidPlaceholder({ chart }: MermaidPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.mermaid) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError("Failed to load Mermaid from CDN");
    document.head.appendChild(script);

    return () => {
      if (script.parentNode && !window.mermaid) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !chart || isRendered) return;

    const mermaid = window.mermaid;
    if (!mermaid) return;

    try {
      if (!mermaid.initialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
          themeVariables: {
            fontSize: "12px",
            primaryColor: "#e1f5ff",
            primaryTextColor: "#1a1a1a",
            primaryBorderColor: "#4a90e2",
            lineColor: "#4a90e2",
            secondaryColor: "#fff4e1",
            tertiaryColor: "#e8f5e9",
          },
        });
        mermaid.initialized = true;
      }

      const container = containerRef.current;
      const pre = document.createElement("pre");
      pre.className = "mermaid";
      pre.textContent = chart;
      container.innerHTML = "";
      container.appendChild(pre);

      if (typeof mermaid.run === "function") {
        mermaid
          .run({ nodes: [pre] })
          .then(() => {
            const svg = container.querySelector("svg");
            if (svg) {
              svg.style.width = "100%";
              svg.style.maxWidth = "1200px";
              svg.style.height = "auto";
            }
            setIsRendered(true);
          })
          .catch((err: Error) => {
            setError(`Mermaid render error: ${err.message}`);
          });
      } else if (typeof mermaid.render === "function") {
        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
        mermaid.render(id, chart).then(result => {
          container.innerHTML = result.svg;
          const svg = container.querySelector("svg");
          if (svg) {
            svg.style.width = "100%";
            svg.style.maxWidth = "1200px";
            svg.style.height = "auto";
          }
          setIsRendered(true);
        }).catch((err: Error) => {
          setError(`Mermaid render error: ${err.message}`);
        });
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [isLoaded, chart, isRendered]);

  if (error) {
    return (
      <div className="my-8 p-4 bg-error/10 border border-error rounded">
        <p className="text-error">Error rendering diagram: {error}</p>
        <pre className="mt-2 text-xs overflow-auto bg-base-200 p-2 rounded">{chart}</pre>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="my-8 p-4 bg-base-200 rounded text-center">
        <p className="text-base-content/60">Loading diagram...</p>
      </div>
    );
  }

  return <div ref={containerRef} className="my-8 flex justify-center w-full" style={{ minHeight: "300px" }} />;
}
