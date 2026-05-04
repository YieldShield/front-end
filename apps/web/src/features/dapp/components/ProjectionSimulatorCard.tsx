import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "../../../components/Drawer";
import { InfoTooltip } from "../../../components/InfoTooltip";
import { PoolHealthDot } from "../../../components/PoolHealthDot";
import { ShieldedBanner } from "../../../components/ShieldedBanner";
import { TokenPairMark } from "../../../components/TokenPairMark";
import { usePoolYield, usePoolYields } from "../../../hooks/usePoolYield";
import type { PoolSummary } from "../../../protocol/pools";
import { formatBps, formatTokenAmount } from "../../../protocol/format";
import { computeNetApy } from "../../../protocol/yields";

type ContributionFrequency = "monthly" | "weekly" | "yearly";

type ProjectionSimulatorCardProps = {
  pools: PoolSummary[];
  selectedPoolAddress: string | null;
  onSelectPool: (poolAddress: string) => void;
  onConfirmDeposit?: (poolAddress: string, amount: number) => void;
  isDepositing?: boolean;
  isConnected?: boolean;
  onConnectClick?: () => void;
  onShieldedBadgeClick?: () => void;
};

function parseNumericInput(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatFullCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 60 } as const;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

export function ProjectionSimulatorCard({
  pools,
  selectedPoolAddress,
  onSelectPool,
  onConfirmDeposit,
  isDepositing = false,
  isConnected = false,
  onConnectClick,
  onShieldedBadgeClick,
}: ProjectionSimulatorCardProps) {
  const [depositAmountInput, setDepositAmountInput] = useState("1000");
  const [benchmarkApyInput, setBenchmarkApyInput] = useState("10");
  const [isBenchmarkUserEdited, setIsBenchmarkUserEdited] = useState(false);
  const [recurringAmountInput, setRecurringAmountInput] = useState("100");
  const [contributionFrequency, setContributionFrequency] = useState<ContributionFrequency>("monthly");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPoolDrawer, setShowPoolDrawer] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    year: number; value: number; protectionCost: number; x: number; y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedPool = pools.find(pool => pool.address === selectedPoolAddress) ?? pools[0];
  const { yield: liveYield, isLoading: isLiveYieldLoading } = usePoolYield(selectedPool?.shieldedTokenSymbol);
  const allShieldedSymbols = useMemo(() => pools.map(pool => pool.shieldedTokenSymbol), [pools]);
  const { yieldsBySymbol, isLoading: isAllYieldsLoading } = usePoolYields(allShieldedSymbols);

  type PoolYieldEntry = { netApy: number | null; project: string | null };
  const poolYieldsByAddress = useMemo(() => {
    const map = new Map<string, PoolYieldEntry>();
    for (const pool of pools) {
      const match = yieldsBySymbol.get(pool.shieldedTokenSymbol.toLowerCase()) ?? null;
      const netApy = computeNetApy(match?.apy, pool.commissionRate + pool.poolFee);
      map.set(pool.address, { netApy, project: match?.project ?? null });
    }
    return map;
  }, [pools, yieldsBySymbol]);

  useEffect(() => {
    setIsBenchmarkUserEdited(false);
  }, [selectedPool?.address]);

  useEffect(() => {
    if (isBenchmarkUserEdited) return;
    if (!liveYield) return;
    setBenchmarkApyInput(liveYield.apy.toFixed(2));
  }, [liveYield, isBenchmarkUserEdited]);

  const depositAmount = parseNumericInput(depositAmountInput, 1000);
  const benchmarkApy = parseNumericInput(benchmarkApyInput, 10);
  const recurringAmount = parseNumericInput(recurringAmountInput, 100);

  const totalFeeRate = Number(selectedPool.commissionRate + selectedPool.poolFee) / 100;
  const protectionCostPercent = totalFeeRate;
  const netBenchmarkApy = Math.max(benchmarkApy * Math.max(1 - totalFeeRate / 100, 0), 0);

  const yearlyContribution = useMemo(() => {
    switch (contributionFrequency) {
      case "weekly": return recurringAmount * 52;
      case "monthly": return recurringAmount * 12;
      case "yearly": return recurringAmount;
    }
  }, [recurringAmount, contributionFrequency]);

  // Over-capacity check
  const maxShielded = selectedPool.backingBalance > 0n
    ? Number(selectedPool.backingBalance) * 10000 / Number(selectedPool.collateralRatio)
    : 0;
  const currentShielded = Number(selectedPool.shieldedBalance);
  const availableCapacity = Math.max(maxShielded - currentShielded, 0);
  const isOverCapacity = depositAmount > 0 && availableCapacity > 0 && depositAmount > availableCapacity / (10 ** selectedPool.shieldedTokenDecimals);

  // 30-year projection
  const projectionData = useMemo(() => {
    const yearlyRate = netBenchmarkApy / 100;
    const protectionRate = (protectionCostPercent / 100) * (benchmarkApy / 100);
    const points: { year: number; value: number; protectionCost: number }[] = [];
    let currentValue = depositAmount;
    let cumulativeProtection = 0;

    for (let year = 0; year <= 30; year++) {
      if (year === 0) {
        points.push({ year, value: currentValue, protectionCost: 0 });
      } else {
        const base = currentValue + yearlyContribution;
        const earnings = base * yearlyRate;
        const protectionThisYear = base * protectionRate;
        currentValue = base + earnings;
        cumulativeProtection += protectionThisYear;
        points.push({ year, value: currentValue, protectionCost: cumulativeProtection });
      }
    }
    return points;
  }, [depositAmount, netBenchmarkApy, yearlyContribution, protectionCostPercent, benchmarkApy]);

  const finalValue = projectionData[projectionData.length - 1]?.value ?? depositAmount;
  const totalContributed = depositAmount + yearlyContribution * 30;
  const projectedEarnings = Math.max(finalValue - totalContributed, 0);
  const maxValue = Math.max(...projectionData.map(d => d.value), 1);

  const { areaPath, linePath, protectionPath } = useMemo(() => {
    if (projectionData.length < 2) return { areaPath: "", linePath: "", protectionPath: "" };

    const valuePoints = projectionData.map((d, i) => {
      const x = CHART_PADDING.left + (i / 30) * PLOT_WIDTH;
      const y = CHART_PADDING.top + PLOT_HEIGHT - (d.value / maxValue) * PLOT_HEIGHT;
      return `${x},${y}`;
    });

    const protectionPoints = projectionData.map((d, i) => {
      const x = CHART_PADDING.left + (i / 30) * PLOT_WIDTH;
      const scaledProtection = maxValue > 0 ? (d.protectionCost / maxValue) * PLOT_HEIGHT : 0;
      const y = CHART_PADDING.top + PLOT_HEIGHT - scaledProtection;
      return `${x},${y}`;
    });

    const linePathStr = `M ${valuePoints.join(" L ")}`;
    const areaBottom = CHART_PADDING.top + PLOT_HEIGHT;

    return {
      areaPath: `${linePathStr} L ${CHART_PADDING.left + PLOT_WIDTH},${areaBottom} L ${CHART_PADDING.left},${areaBottom} Z`,
      linePath: linePathStr,
      protectionPath: `M ${protectionPoints.join(" L ")}`,
    };
  }, [projectionData, maxValue]);

  const yAxisLabels = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      value: (maxValue / 4) * i,
      y: CHART_PADDING.top + PLOT_HEIGHT - (i / 4) * PLOT_HEIGHT,
    }));
  }, [maxValue]);

  const endPoint = {
    x: CHART_PADDING.left + PLOT_WIDTH,
    y: CHART_PADDING.top + PLOT_HEIGHT - (finalValue / maxValue) * PLOT_HEIGHT,
  };

  // Chart hover
  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - svgRect.left;
      const relativeX = (mouseX / svgRect.width) * CHART_WIDTH;
      const chartX = relativeX - CHART_PADDING.left;

      if (chartX < 0 || chartX > PLOT_WIDTH) { setHoveredPoint(null); return; }

      const year = Math.max(0, Math.min(30, Math.round((chartX / PLOT_WIDTH) * 30)));
      const dataPoint = projectionData[year];
      if (dataPoint) {
        const x = CHART_PADDING.left + (year / 30) * PLOT_WIDTH;
        const y = CHART_PADDING.top + PLOT_HEIGHT - (dataPoint.value / maxValue) * PLOT_HEIGHT;
        setHoveredPoint({
          year,
          value: dataPoint.value,
          protectionCost: dataPoint.protectionCost,
          x: (x / CHART_WIDTH) * 100,
          y: (y / CHART_HEIGHT) * 100,
        });
      }
    },
    [projectionData, maxValue],
  );

  const handleChartMouseLeave = useCallback(() => setHoveredPoint(null), []);

  const handleStartInvesting = () => {
    if (!isConnected) { onConnectClick?.(); return; }
    setShowConfirmation(true);
  };

  const handleConfirmDeposit = () => {
    onConfirmDeposit?.(selectedPool.address, depositAmount);
  };

  // Sorted pools for drawer: highest Net APY first, then pools without live APY
  // sorted by lowest commission as a fallback. When no pools have live APY, the
  // order is the same as the old commission-rate-ascending sort.
  const sortedPools = useMemo(() => {
    return pools.slice().sort((a, b) => {
      const aNet = poolYieldsByAddress.get(a.address)?.netApy ?? null;
      const bNet = poolYieldsByAddress.get(b.address)?.netApy ?? null;

      if (aNet !== null && bNet !== null) return bNet - aNet;
      if (aNet !== null) return -1;
      if (bNet !== null) return 1;
      return Number(a.commissionRate - b.commissionRate);
    });
  }, [pools, poolYieldsByAddress]);

  const hasAnyLiveApy = sortedPools.some(pool => poolYieldsByAddress.get(pool.address)?.netApy !== null && poolYieldsByAddress.get(pool.address)?.netApy !== undefined);
  const bestApyAddress = hasAnyLiveApy ? sortedPools[0]?.address : undefined;
  const lowestFeeAddress = !hasAnyLiveApy ? sortedPools[0]?.address : undefined;

  return (
    <>
      <div className="card bg-base-200">
        <div className="card-body p-4 md:p-6">
          {/* 1. Shielded Banner */}
          <ShieldedBanner className="mb-6" onClick={onShieldedBadgeClick} />

          {/* 2. Hero Section — centered, no blob */}
          <div className="relative bg-base-100 rounded-xl p-6 mb-6">
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-10"
                style={{ backgroundColor: "var(--ys-brand-secondary)", filter: "blur(60px)" }}
              />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-sm text-font-grey uppercase tracking-wide mb-2">Future Balance</p>
              <p className="text-4xl md:text-5xl font-bold text-secondary mb-3">{formatFullCurrency(finalValue)}</p>
              <p className="text-base-content/70">
                <span className="font-semibold text-base-content">{formatFullCurrency(projectedEarnings)}</span>{" "}
                Earned in 30 years
              </p>
            </div>
          </div>

          {/* 3. Chart — no border wrapper, hover interactivity */}
          <div className="relative mb-6">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-auto cursor-crosshair"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--ys-brand-secondary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--ys-brand-secondary)" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {yAxisLabels.map((label, i) => (
                <g key={i}>
                  <line
                    x1={CHART_PADDING.left} y1={label.y}
                    x2={CHART_WIDTH - CHART_PADDING.right} y2={label.y}
                    stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4,4"
                  />
                  <text x={CHART_PADDING.left - 8} y={label.y + 4} textAnchor="end" fontSize="10" className="fill-current text-font-grey">
                    {formatCurrency(label.value)}
                  </text>
                </g>
              ))}

              {[0, 5, 10, 15, 20, 25, 30].map(year => (
                <text
                  key={year}
                  x={CHART_PADDING.left + (year / 30) * PLOT_WIDTH}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle" fontSize="10" className="fill-current text-font-grey"
                >
                  {year}y
                </text>
              ))}

              <path d={areaPath} fill="url(#areaGradient)" />
              <path d={linePath} fill="none" stroke="var(--ys-brand-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={protectionPath} fill="none" stroke="var(--ys-success)" strokeWidth="1.5" strokeDasharray="6,3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Hover vertical line */}
              {hoveredPoint && (
                <line
                  x1={(hoveredPoint.x / 100) * CHART_WIDTH} y1={CHART_PADDING.top}
                  x2={(hoveredPoint.x / 100) * CHART_WIDTH} y2={CHART_PADDING.top + PLOT_HEIGHT}
                  stroke="var(--ys-brand-secondary)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"
                />
              )}

              {/* Hover point */}
              {hoveredPoint && (
                <circle
                  cx={(hoveredPoint.x / 100) * CHART_WIDTH}
                  cy={(hoveredPoint.y / 100) * CHART_HEIGHT}
                  r="6" fill="var(--ys-brand-secondary)" stroke="white" strokeWidth="2"
                />
              )}

              {/* End point (only when not hovering) */}
              {!hoveredPoint && (
                <circle cx={endPoint.x} cy={endPoint.y} r="5" fill="var(--ys-brand-secondary)" />
              )}
            </svg>

            {/* Hover tooltip */}
            {hoveredPoint && (
              <div
                className="absolute pointer-events-none z-10 transition-all duration-75"
                style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%`, transform: "translateX(-50%) translateY(-130%)" }}
              >
                <div className="bg-base-300 text-base-content px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                  <div className="font-semibold text-secondary">{formatFullCurrency(hoveredPoint.value)}</div>
                  <div className="text-xs text-font-grey">
                    Year {hoveredPoint.year}
                    {hoveredPoint.year > 0 && (
                      <span className="ml-1">(Protection: {formatFullCurrency(hoveredPoint.protectionCost)})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chart legend */}
            <div className="flex justify-center gap-6 mt-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-secondary rounded" />
                <span className="text-font-grey">Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: "var(--ys-success)", borderStyle: "dashed" }} />
                <span className="text-font-grey">Protection Cost ({protectionCostPercent.toFixed(1)}% of yield)</span>
              </div>
            </div>

            {/* Chart annotation */}
            {recurringAmount > 0 && (
              <p className="text-center text-xs text-base-content/40 mt-2 mb-0">
                Projection assumes you manually deposit {formatFullCurrency(recurringAmount)} /{" "}
                {contributionFrequency === "weekly" ? "week" : contributionFrequency === "monthly" ? "month" : "year"}
              </p>
            )}
          </div>

          {/* 4. Simulation Controls */}
          <div className="bg-base-100 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Starting Amount */}
              <div className="relative w-full m3-input">
                <div className="relative flex items-center rounded-t-md overflow-hidden bg-base-200 hover:bg-base-300/80 transition-colors duration-200">
                  <div className="relative flex-1 min-h-[56px]">
                    <label className="absolute left-3 top-2 text-xs text-base-content/60 pointer-events-none z-10">
                      Starting Amount
                    </label>
                    <input
                      type="number" min="0" step="100"
                      className="w-full h-[56px] px-3 pt-6 pb-2 bg-transparent text-lg font-medium text-base-content outline-none"
                      value={depositAmountInput}
                      onChange={e => setDepositAmountInput(e.target.value)}
                    />
                  </div>
                  <span className="pr-3 text-sm font-medium text-base-content">USD</span>
                  <div className="m3-indicator absolute bottom-0 left-0 right-0 h-[1px] bg-base-content/40 transition-all duration-200" />
                </div>
              </div>

              {/* Add Regularly + Frequency */}
              <div className="space-y-3">
                <div className="relative w-full m3-input">
                  <div className="relative flex items-center rounded-t-md overflow-hidden bg-base-200 hover:bg-base-300/80 transition-colors duration-200">
                    <div className="relative flex-1 min-h-[56px]">
                      <label className="absolute left-3 top-2 text-xs text-base-content/60 pointer-events-none z-10">
                        Add Regularly
                      </label>
                      <input
                        type="number" min="0" step="50"
                        className="w-full h-[56px] px-3 pt-6 pb-2 bg-transparent text-lg font-medium text-base-content outline-none"
                        value={recurringAmountInput}
                        onChange={e => setRecurringAmountInput(e.target.value)}
                      />
                    </div>
                    <span className="pr-3 text-sm font-medium text-base-content">USD</span>
                    <div className="m3-indicator absolute bottom-0 left-0 right-0 h-[1px] bg-base-content/40 transition-all duration-200" />
                  </div>
                </div>

                <div className="relative w-full m3-input">
                  <div className="relative flex items-center rounded-t-md overflow-hidden bg-base-200 hover:bg-base-300/80 transition-colors duration-200">
                    <div className="relative flex-1 min-h-[56px]">
                      <label className="absolute left-3 top-2 text-xs text-base-content/60 pointer-events-none z-10">
                        Frequency
                      </label>
                      <select
                        className="w-full h-[56px] px-3 pt-6 pb-2 bg-transparent text-base text-base-content outline-none appearance-none cursor-pointer"
                        value={contributionFrequency}
                        onChange={e => setContributionFrequency(e.target.value as ContributionFrequency)}
                      >
                        <option value="weekly">/ week</option>
                        <option value="monthly">/ month</option>
                        <option value="yearly">/ year</option>
                      </select>
                    </div>
                    <span className="absolute right-3 pointer-events-none text-base-content/60">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="m3-indicator absolute bottom-0 left-0 right-0 h-[1px] bg-base-content/40 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* APY / Pool row */}
            <div className="mt-5 pt-4 border-t border-base-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-font-grey">Net benchmark APY</span>
                  <span className="text-lg font-bold text-secondary">{netBenchmarkApy.toFixed(2)}%</span>
                  <InfoTooltip tip="After applying the pool's commission and fee to your benchmark yield input." />
                </div>
                {pools.length > 1 && (
                  <button
                    onClick={() => setShowPoolDrawer(true)}
                    className="btn btn-outline btn-sm rounded-full px-4 gap-1.5 border-base-300 text-base-content/70 hover:text-secondary hover:border-secondary"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 3l4 4-4 4" />
                      <path d="M20 7H4" />
                      <path d="M8 21l-4-4 4-4" />
                      <path d="M4 17h16" />
                    </svg>
                    Pick another pool
                  </button>
                )}
              </div>

              {/* Benchmark Yield — lite-specific */}
              <div className="mt-3 relative w-full m3-input">
                <div className="relative flex items-center rounded-t-md overflow-hidden bg-base-200 hover:bg-base-300/80 transition-colors duration-200">
                  <div className="relative flex-1 min-h-[56px]">
                    <label className="absolute left-3 top-2 text-xs text-base-content/60 pointer-events-none z-10">
                      Benchmark Yield
                    </label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      className="w-full h-[56px] px-3 pt-6 pb-2 bg-transparent text-lg font-medium text-base-content outline-none"
                      value={benchmarkApyInput}
                      onChange={e => {
                        setIsBenchmarkUserEdited(true);
                        setBenchmarkApyInput(e.target.value);
                      }}
                    />
                  </div>
                  <span className="pr-3 text-sm font-medium text-base-content">% APY</span>
                  <div className="m3-indicator absolute bottom-0 left-0 right-0 h-[1px] bg-base-content/40 transition-all duration-200" />
                </div>
                <p className="mt-1 ml-3 text-xs text-base-content/50">
                  {liveYield
                    ? `Pre-filled from DeFiLlama (${liveYield.project}) — editable`
                    : isLiveYieldLoading
                      ? "Fetching reference yield from DeFiLlama..."
                      : "Editable benchmark — live reference yield unavailable for this pool."}
                </p>
              </div>

              {/* Pool info row */}
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-font-grey">
                  Pool:{" "}
                  <span className="font-medium text-base-content">
                    {selectedPool.shieldedTokenSymbol} / {selectedPool.backingTokenSymbol}
                  </span>
                </span>
                <span className="text-font-grey">
                  {formatBps(selectedPool.commissionRate)} commission + {formatBps(selectedPool.poolFee)} fee
                </span>
              </div>

              {/* Over-capacity warning */}
              {isOverCapacity && (
                <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded-lg">
                  <p className="text-xs text-error flex items-center gap-1.5 my-0">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z" />
                    </svg>
                    Amount exceeds this pool&apos;s available capacity. Reduce the amount or pick another pool.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 5. CTA / Confirmation */}
          <div className="mt-6">
            {!showConfirmation ? (
              !isConnected ? (
                <button
                  onClick={onConnectClick}
                  className="btn btn-secondary btn-lg w-full text-lg hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                >
                  Connect Wallet to Start
                </button>
              ) : (
                <button
                  onClick={handleStartInvesting}
                  disabled={isOverCapacity || depositAmount <= 0}
                  className={`btn btn-lg w-full text-lg transition-all duration-200 ${
                    isOverCapacity || depositAmount <= 0
                      ? "btn-disabled bg-base-300 text-base-content/50 cursor-not-allowed"
                      : "btn-secondary hover:scale-[1.02] hover:shadow-lg"
                  }`}
                >
                  {isOverCapacity
                    ? "Amount Exceeds Pool Capacity"
                    : depositAmount <= 0
                      ? "Enter an Amount"
                      : `Start Investing — ${formatFullCurrency(depositAmount)}`}
                </button>
              )
            ) : (
              <div className="bg-base-100 rounded-xl border-2 border-secondary/30 overflow-hidden">
                <div className="bg-secondary/5 px-5 py-4 border-b border-secondary/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Confirm Your Deposit</h3>
                    <button onClick={() => setShowConfirmation(false)} disabled={isDepositing} className="btn btn-ghost btn-sm btn-circle">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-font-grey">Amount</span>
                    <span className="text-xl font-bold">{formatFullCurrency(depositAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-font-grey">Pool</span>
                    <span className="font-medium">
                      {selectedPool.shieldedTokenSymbol} / {selectedPool.backingTokenSymbol}
                    </span>
                  </div>
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--ys-success-bg)", borderColor: "var(--ys-success-border)", borderWidth: "1px" }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-sm mt-0 mb-0" style={{ color: "var(--ys-success)" }}>100% Principal Protected</p>
                      <p className="text-xs text-font-grey mt-1 mb-0">Fully shielded against loss</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 flex gap-3">
                  <button onClick={() => setShowConfirmation(false)} disabled={isDepositing} className="btn btn-outline flex-1">Cancel</button>
                  <button
                    onClick={handleConfirmDeposit}
                    disabled={isDepositing}
                    className={`btn btn-secondary flex-1 ${isDepositing ? "" : "hover:scale-[1.02]"} transition-all duration-200`}
                  >
                    {isDepositing ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm & Deposit
                        <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Benefits Footer */}
          {!showConfirmation && (
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-base-300">
              <div className="flex items-center gap-2 text-sm text-font-grey">
                <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Withdraw Anytime</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-font-grey">
                <svg className="w-4 h-4 text-info" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <span>Compound Interest</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-font-grey">
                <svg className="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                <span>Non-custodial</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pool Selection Drawer */}
      <Drawer isOpen={showPoolDrawer} onClose={() => setShowPoolDrawer(false)}>
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h3 className="text-lg font-bold text-base-content">Select a Pool</h3>
            <p className="text-sm text-font-grey mt-0.5">Choose from available shield pools</p>
          </div>
          <button onClick={() => setShowPoolDrawer(false)} className="btn btn-ghost btn-circle min-h-[44px] min-w-[44px]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {sortedPools.map(pool => {
            const isSelected = pool.address === selectedPool.address;
            const isBestApy = pool.address === bestApyAddress;
            const isLowestFee = pool.address === lowestFeeAddress;
            const yieldEntry = poolYieldsByAddress.get(pool.address);
            const netApy = yieldEntry?.netApy ?? null;
            const project = yieldEntry?.project ?? null;

            return (
              <button
                key={pool.address}
                onClick={() => { onSelectPool(pool.address); setShowPoolDrawer(false); }}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  isSelected
                    ? "bg-secondary/10 border-2 border-secondary"
                    : "bg-base-100 border-2 border-transparent hover:border-base-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TokenPairMark shieldedSymbol={pool.shieldedTokenSymbol} backingSymbol={pool.backingTokenSymbol} />
                      <span className="font-semibold text-base-content">
                        {pool.shieldedTokenSymbol} / {pool.backingTokenSymbol}
                      </span>
                      {isBestApy && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-secondary/20 text-secondary rounded-full">
                          Best APY
                        </span>
                      )}
                      {isLowestFee && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-secondary/20 text-secondary rounded-full">
                          Lowest Fee
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-white rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-font-grey mt-1">Created {pool.createdAtLabel}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <PoolHealthDot
                        shieldedBalance={pool.shieldedBalance}
                        backingBalance={pool.backingBalance}
                        collateralRatio={pool.collateralRatio}
                        shieldedTokenDecimals={pool.shieldedTokenDecimals}
                        backingTokenDecimals={pool.backingTokenDecimals}
                      />
                      <span className="text-xs text-font-grey">
                        {formatBps(pool.commissionRate)} commission + {formatBps(pool.poolFee)} fee
                      </span>
                    </div>
                    <p className="text-xs text-font-grey mt-1">
                      Backing: {formatTokenAmount(pool.backingBalance, pool.backingTokenDecimals)} {pool.backingTokenSymbol}
                    </p>
                  </div>
                  <div className="text-right ml-3 min-w-[88px]">
                    {netApy !== null ? (
                      <>
                        <p className="text-xl font-bold text-secondary">{netApy.toFixed(2)}%</p>
                        <p className="text-xs text-font-grey">Net APY</p>
                        {project && <p className="text-[10px] text-font-grey mt-0.5">via {project}</p>}
                      </>
                    ) : isAllYieldsLoading ? (
                      <>
                        <span className="loading loading-spinner loading-sm text-secondary" aria-hidden="true" />
                        <p className="text-xs text-font-grey mt-1">Net APY</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-font-grey">—</p>
                        <p className="text-xs text-font-grey">No live rate</p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-shrink-0 p-4 border-t border-base-300 bg-base-100/50">
          <p className="text-xs text-font-grey text-center">Compare pools by net yield, fees, and capacity.</p>
        </div>
      </Drawer>
    </>
  );
}
