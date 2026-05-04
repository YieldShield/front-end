export type DocsNavItem = {
  title: string;
  href: string;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

export const docsNavigation: DocsNavSection[] = [
  {
    title: "Start Here",
    items: [
      { title: "Introduction", href: "/docs/intro" },
      { title: "Highest Rates", href: "/docs/highest-rates" },
      { title: "Shield Activation", href: "/docs/shield-activation" },
      { title: "Protection", href: "/docs/protection" },
      { title: "Capital Efficiency", href: "/docs/capital-efficiency" },
      { title: "Universal DeFi Compatibility", href: "/docs/defi-adapter" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { title: "Overview", href: "/docs/architecture" },
      { title: "Shield Pool", href: "/docs/architecture/split-risk-pool" },
      { title: "Shield Pool Factory", href: "/docs/architecture/contracts" },
      { title: "Receipt NFTs", href: "/docs/architecture/receipt-nfts" },
      { title: "Fee Structure", href: "/docs/architecture/fee-structure" },
      { title: "Oracle System", href: "/docs/architecture/oracle-system" },
      { title: "YS Governor", href: "/docs/architecture/ys-governor" },
      { title: "Pool Access Control", href: "/docs/architecture/pool-access-control" },
      { title: "Security Model", href: "/docs/architecture/security-model" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Shield Pool", href: "/docs/guides/shield-pool" },
      { title: "Using Pools", href: "/docs/guides/using-pools" },
    ],
  },
  {
    title: "Whitepaper",
    items: [{ title: "Protocol Whitepaper", href: "/docs/whitepaper" }],
  },
];
