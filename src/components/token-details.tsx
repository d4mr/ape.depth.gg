import { Card } from "./ui/card";
import { tokenOverviewQueryOptions } from "@/queries/token-overview";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import type { ReactNode } from "react";

function DataPoint({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode | undefined;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {value ? (
        <p className="text-lg font-bold">{value}</p>
      ) : (
        <Skeleton className="py-2 px-8" />
      )}
    </div>
  );
}

export function TokenDetails({
  tokenAddress,
  chainId,
}: {
  tokenAddress: string;
  chainId: string;
}) {
  const tokenQuery = useQuery(
    tokenOverviewQueryOptions({ chainId, tokenAddress })
  );
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const tokenData = tokenQuery.data;

  return (
    <Card className="p-4 min-h-0 h-full">
      <div className="flex flex-col w-full min-w-0 gap-4">
        <DataPoint
          label={"Price"}
          value={tokenData ? `$${tokenData.price.toFixed(12)}` : undefined}
        />
        <DataPoint
          label="Liquidity"
          value={tokenData ? formatCurrency(tokenData.liquidity) : undefined}
        />
        <DataPoint
          label="Market Cap"
          value={tokenData ? formatCurrency(tokenData.mc) : undefined}
        />
      </div>
    </Card>
  );
}
