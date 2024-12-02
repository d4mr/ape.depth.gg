import type { ReactNode } from "@tanstack/react-router";
import { placeholderImage } from "./trenches-table";
import { Card } from "./ui/card";
import { useQuery } from "@tanstack/react-query";
import { tokenOverviewQueryOptions } from "@/queries/token-overview";
import { Skeleton } from "./ui/skeleton";

const getPriceChangeColor = (change: number) =>
  change >= 0 ? "text-green-500" : "text-red-500";

function DataPoint({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono font-black text-muted-foreground">
        {label}
      </p>
      {value ? (
        <p className="text-lg font-bold font-logo">{value}</p>
      ) : (
        <Skeleton>
          <p className="text-lg font-bold font-logo text-white/0">hi</p>
        </Skeleton>
      )}
    </div>
  );
}

export function TokenHeader({
  chainId,
  tokenAddress,
}: {
  chainId: string;
  tokenAddress: string;
}) {
  const tokenDataQuery = useQuery(
    tokenOverviewQueryOptions({ chainId, tokenAddress })
  );

  const tokenData = tokenDataQuery.data;

  const formatPriceChange = (value: number) => (
    <span className={getPriceChangeColor(value)}>
      {value ? value.toFixed(2) : ""}%
    </span>
  );

  if (tokenDataQuery.isLoading || !tokenData) {
    return (
      <Card className="py-2 px-4 flex">
        <div className="flex items-center gap-2 flex-shrink-0 flex-grow">
          <Skeleton className="rounded-full h-8 w-8" />
          <Skeleton className="py-2 px-5" />

          <span className="font-logo">
            <Skeleton className="" />
          </span>
        </div>
        <div className="flex gap-20">
          <DataPoint label={"30m"} value={undefined} />
          <DataPoint label={"1h"} value={undefined} />
          <DataPoint label={"24h"} value={undefined} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="py-2 px-4 flex">
      <div className="flex items-center gap-2 flex-shrink-0 flex-grow">
        <img
          src={placeholderImage}
          alt={tokenData?.name ?? ""}
          className="rounded-full h-8 w-8"
        />
        <span className="font-logo">
          {tokenData.name} ({tokenData.symbol})
        </span>
      </div>
      <div className="flex gap-20">
        <DataPoint
          label={"30m"}
          value={formatPriceChange(tokenData.priceChange30mPercent)}
        />
        <DataPoint
          label={"1h"}
          value={formatPriceChange(tokenData.priceChange1hPercent)}
        />
        <DataPoint
          label={"24h"}
          value={formatPriceChange(tokenData.priceChange24hPercent)}
        />
      </div>
    </Card>
  );
}
