import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DappPage } from "./features/dapp/DappPage";
import { DocsHome } from "./features/docs/DocsHome";
import { DocsLayout } from "./features/docs/DocsLayout";
import ArchitectureOverviewDoc from "./features/docs/content/architecture.mdx";
import ArchContractsDoc from "./features/docs/content/architecture/contracts.mdx";
import ArchFeeStructureDoc from "./features/docs/content/architecture/fee-structure.mdx";
import ArchOracleSystemDoc from "./features/docs/content/architecture/oracle-system.mdx";
import ArchPoolAccessControlDoc from "./features/docs/content/architecture/pool-access-control.mdx";
import ArchReceiptNftsDoc from "./features/docs/content/architecture/receipt-nfts.mdx";
import ArchSecurityModelDoc from "./features/docs/content/architecture/security-model.mdx";
import ArchSplitRiskPoolDoc from "./features/docs/content/architecture/split-risk-pool.mdx";
import ArchYsGovernorDoc from "./features/docs/content/architecture/ys-governor.mdx";
import CapitalEfficiencyDoc from "./features/docs/content/capital-efficiency.mdx";
import DefiAdapterDoc from "./features/docs/content/defi-adapter.mdx";
import HighestRatesDoc from "./features/docs/content/highest-rates.mdx";
import IntroDoc from "./features/docs/content/intro.mdx";
import ProtectionDoc from "./features/docs/content/protection.mdx";
import ShieldActivationDoc from "./features/docs/content/shield-activation.mdx";
import ShieldPoolGuideDoc from "./features/docs/content/guides/shield-pool.mdx";
import UsingPoolsGuideDoc from "./features/docs/content/guides/using-pools.mdx";
import WhitepaperDoc from "./features/docs/content/whitepaper.mdx";
import { GovernancePage } from "./features/governance/GovernancePage";
import { HomePage } from "./features/home/HomePage";
import { PointsPage } from "./features/points/PointsPage";
import { CreatePoolPage } from "./features/pools/CreatePoolPage";
import { PoolDetailPage } from "./features/pools/PoolDetailPage";
import { PoolsPage } from "./features/pools/PoolsPage";
import { AppShell } from "./layout/AppShell";
import { PublicShell } from "./layout/PublicShell";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsHome />} />
            <Route path="intro" element={<IntroDoc />} />
            <Route path="highest-rates" element={<HighestRatesDoc />} />
            <Route path="shield-activation" element={<ShieldActivationDoc />} />
            <Route path="protection" element={<ProtectionDoc />} />
            <Route path="capital-efficiency" element={<CapitalEfficiencyDoc />} />
            <Route path="defi-adapter" element={<DefiAdapterDoc />} />
            <Route path="guides/shield-pool" element={<ShieldPoolGuideDoc />} />
            <Route path="guides/using-pools" element={<UsingPoolsGuideDoc />} />
            <Route path="architecture" element={<ArchitectureOverviewDoc />} />
            <Route path="architecture/split-risk-pool" element={<ArchSplitRiskPoolDoc />} />
            <Route path="architecture/contracts" element={<ArchContractsDoc />} />
            <Route path="architecture/receipt-nfts" element={<ArchReceiptNftsDoc />} />
            <Route path="architecture/fee-structure" element={<ArchFeeStructureDoc />} />
            <Route path="architecture/oracle-system" element={<ArchOracleSystemDoc />} />
            <Route path="architecture/ys-governor" element={<ArchYsGovernorDoc />} />
            <Route path="architecture/pool-access-control" element={<ArchPoolAccessControlDoc />} />
            <Route path="architecture/security-model" element={<ArchSecurityModelDoc />} />
            <Route path="whitepaper" element={<WhitepaperDoc />} />
          </Route>
        </Route>

        <Route element={<AppShell />}>
          <Route path="/dapp" element={<DappPage />} />
          <Route
            path="/dashboard"
            element={
              <div className="container mx-auto px-4 py-8">
                <PoolsPage />
              </div>
            }
          />
          <Route path="/pools/create" element={<CreatePoolPage />} />
          <Route
            path="/pools/:address"
            element={
              <div className="min-h-screen bg-base-100">
                <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
                  <PoolDetailPage />
                </div>
              </div>
            }
          />
          <Route path="/governance" element={<GovernancePage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
