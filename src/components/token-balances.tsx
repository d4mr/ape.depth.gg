import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { portfolioQueryOptions } from "@/queries/portfolio";
import { useActiveAccount } from "thirdweb/react";
import { placeholderImage } from "./trenches-table";

const formatNumber = (num: number, decimals: number) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default function TokenBalances() {
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const account = useActiveAccount();
  const walletAddress = account?.address;

  const { data, isLoading, isError } = useQuery(
    portfolioQueryOptions({
      address: walletAddress,
    })
  );

  const toggleExpand = (tokenSymbol: string) => {
    const newExpandedTokens = new Set(expandedTokens);
    if (newExpandedTokens.has(tokenSymbol)) {
      newExpandedTokens.delete(tokenSymbol);
    } else {
      newExpandedTokens.add(tokenSymbol);
    }
    setExpandedTokens(newExpandedTokens);
  };

  // Group tokens by symbol across chains
  const groupedTokens = !data
    ? undefined
    : data.items.reduce(
        (acc, balance) => {
          const symbol = balance.symbol;
          if (!acc[symbol]) {
            acc[symbol] = {
              symbol,
              logoURI: balance.logoURI,
              address: balance.address,
              chains: [],
              totalValueUsd: 0,
            };
          }

          acc[symbol].chains.push({
            chain: balance.chainName,
            balance: balance.balance,
            decimals: balance.decimals,
            valueUsd: balance.valueUsd,
            displayBalance: balance.uiAmount,
          });

          acc[symbol].totalValueUsd += balance.valueUsd;
          return acc;
        },
        {} as Record<
          string, // token symbol
          {
            symbol: string;
            address: string;
            logoURI: string | null;

            chains: {
              chain: string;
              balance: bigint;
              displayBalance: string | null;
              valueUsd: number;
              decimals: number;
            }[];
            totalValueUsd: number;
          }
        >
      );

  const renderContent = () => {
    if (!walletAddress) {
      return (
        <div className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">
            Please connect wallet to see portfolio
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (isError) {
      return (
        <div className="flex justify-center items-center h-40">
          <p className="text-red-500">Error loading portfolio data</p>
        </div>
      );
    }

    return (
      <TableBody>
        {groupedTokens &&
          Object.values(groupedTokens).map((token) => (
            <>
              <TableRow
                key={token.symbol}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleExpand(token.symbol)}
              >
                <TableCell>
                  <Button variant="ghost" size="sm" className="p-0">
                    {expandedTokens.has(token.symbol) ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <img
                      src={token.logoURI ?? placeholderImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = placeholderImage;
                      }}
                      alt=""
                      className="rounded-full h-6 w-6"
                    />
                    <span className="font-logo">${token.symbol}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${formatNumber(token.totalValueUsd, 2)}
                </TableCell>
              </TableRow>
              {expandedTokens.has(token.symbol) &&
                token.chains.map((chain) => (
                  <TableRow
                    key={`${token.symbol}-${chain.chain}`}
                    className="bg-muted/50 text-muted-foreground"
                  >
                    <TableCell> </TableCell>
                    <TableCell className="pl-8 font-mono uppercase">
                      {chain.chain}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {chain.displayBalance ?? ""} ($
                      {formatNumber(chain.valueUsd, 2)})
                    </TableCell>
                  </TableRow>
                ))}
            </>
          ))}
      </TableBody>
    );
  };

  return (
    <div className="container mx-auto">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wide pt-2 font-logo">
            Token Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="font-logo">
                <TableHead className="w-[50px]"> </TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Value (USD)</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </CardContent>
        <CardFooter>
          <div className="grid grid-cols-[auto_1fr] text-muted-foreground w-full text-sm">
            <div className="font-logo">Total</div>
            <div>
              {data?.totalValue ? (
                <p className="font-logo text-right">{data?.totalValue} USD</p>
              ) : (
                <Skeleton className="h-6 w-20 ml-auto" />
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
