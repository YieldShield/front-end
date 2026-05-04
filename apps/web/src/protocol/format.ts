import { formatUnits } from "viem";

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBps(value: bigint) {
  const percent = Number(value) / 100;
  return `${percent.toFixed(percent % 1 === 0 ? 0 : 2)}%`;
}

export function formatTokenAmount(value: bigint, decimals: number) {
  const formatted = Number(formatUnits(value, decimals));

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: formatted >= 100 ? 2 : 4,
  }).format(formatted);
}

export function formatTimestamp(timestamp: bigint) {
  const date = new Date(Number(timestamp) * 1000);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

const ORACLE_PRICE_DECIMALS = 8;

export function formatUsdValue(value: bigint, fractionDigits = 2) {
  const formatted = Number(formatUnits(value, ORACLE_PRICE_DECIMALS));
  return `$${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(formatted)}`;
}

export function formatUsdDisplay(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}
