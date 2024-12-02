import { createFileRoute } from "@tanstack/react-router";

import { TokenHeader } from "@/components/token-header";
import { TokenDetails } from "@/components/token-details";
import { TokenTrades } from "@/components/token-trades";
import { TokenPriceChart } from "@/components/token-price-chart";
import { getChainNameByChainId } from "@/components/trenches-table";
import { BuyToken } from "@/components/buy-token";

export const Route = createFileRoute("/tokens_/$chainId/$tokenId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { chainId, tokenId } = Route.useParams();
  const chainName = getChainNameByChainId(chainId);

  return (
    <div className="p-2 grid grid-rows-[auto_1fr] gap-2 h-full min-h-0 overflow-hidden">
      <TokenHeader chainId={chainName} tokenAddress={tokenId} />
      <div className="grid grid-cols-[2fr_1fr] h-full w-full gap-2 min-h-0">
        {/* col 1 */}
        <div className="grid grid-rows-[2fr_1fr] gap-2 h-full min-h-0">
          <TokenPriceChart chainId={chainId} tokenAddress={tokenId} />
          <TokenTrades chainName={chainName} tokenAddress={tokenId} />
        </div>
        {/* col 2 */}
        <div className="grid grid-rows-[auto_1fr] gap-2 h-full min-h-0">
          <TokenDetails chainId={chainName} tokenAddress={tokenId} />
          <BuyToken chainName={chainName} tokenAddress={tokenId} />
        </div>
      </div>
    </div>
  );
}
