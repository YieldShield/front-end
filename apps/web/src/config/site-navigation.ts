export type SiteLink = {
  href: string;
  label: string;
};

export const menuLinks: SiteLink[] = [
  { href: "/", label: "Home" },
  { href: "/dapp", label: "Yield" },
  { href: "/dashboard", label: "Pools" },
  // { href: "/governance", label: "Governance" }, // deferred to post-V1
  { href: "/points", label: "Points" },
  { href: "/docs", label: "Docs" },
];

export const socialLinks: SiteLink[] = [
  { href: "https://github.com/YieldShield", label: "GitHub" },
  { href: "https://x.com/yieldshield_ai", label: "Twitter" },
  { href: "https://farcaster.xyz/yieldshield", label: "Farcaster" },
];
