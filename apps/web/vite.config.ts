import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  envDir: "../../",
  plugins: [
    { enforce: "pre", ...mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
      ],
    }) },
    react({ include: /\.(jsx|tsx|mdx)$/ }),
  ],
  server: {
    port: 5173,
  },
});
