import { useState } from "react";
import ky from "ky";
import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabRadioGroup } from "@/components/ui/tab-radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "./ui/scroll-area";
import { getBirdeyeApiKey } from "@/config";
import { useNavigate } from "@tanstack/react-router";

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  liquidity: number;
  v24hUSD: number;
  v24hChangePercent: number;
  mc: number;
}

interface TrendingTokenData {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  liquidity: number;
  volume24hUSD: number;
  rank: number;
  price: number;
}

interface ApiResponse {
  data: {
    tokens: TokenData[];
  };
  success: boolean;
}

interface TrendingApiResponse {
  data: {
    tokens: TrendingTokenData[];
  };
  success: boolean;
}

const chains = [
  // { value: "solana", label: "Solana" },
  { value: "bsc", label: "BSC", id: "56" },
  { value: "base", label: "Base", id: "8453" },
];

const hiddenChain = [{ value: "arbitrum", label: "Arbitrum", id: "42161" }];

export const getChainIdByChainName = (chainName: string) => {
  let maybeChain = chains.find((chain) => chain.value === chainName);
  maybeChain ??= hiddenChain.find((chain) => chain.value === chainName);
  if (!maybeChain) throw new Error("Invalid chain name");
  return maybeChain.id;
};

export const getChainNameByChainId = (chainId: string) => {
  let maybeChain = chains.find((chain) => chain.id === chainId);
  maybeChain ??= hiddenChain.find((chain) => chain.id === chainId);

  if (!maybeChain) throw new Error("Invalid chain id");
  return maybeChain.value;
};

const sortOptions = [
  { value: "v24hUSD", label: "Volume" },
  { value: "mc", label: "Market Cap" },
  { value: "v24hChangePercent", label: "% Change" },
];

const trendingSortOptions = [
  { value: "rank", label: "Rank" },
  { value: "volume24hUSD", label: "Volume" },
  { value: "liquidity", label: "Liquidity" },
];

export const placeholderImage = "https://placehold.co/24x24?text=?";

export default function TrenchesTable() {
  const [activeTab, _setActiveTab] = useState("all");
  const [chain, setChain] = useState("base");
  const [sortBy, setSortBy] = useState("v24hUSD");
  const [trendingSortBy, setTrendingSortBy] = useState("rank");
  const [sortType, setSortType] = useState("desc");
  const [page, setPage] = useState(0);

  const navigate = useNavigate();

  const setActiveTab = (tab: string) => {
    _setActiveTab(tab);
    setPage(0);
    setSortType(tab === "all" ? "desc" : "asc");
  };

  const listLimit = 25;
  const trendingLimit = 20;

  const limit = activeTab === "all" ? listLimit : trendingLimit;

  const trendingTokensQuery = useQuery({
    queryKey: ["trendingTokens", chain, trendingSortBy, sortType, page],
    queryFn: async () => {
      const { data } = await ky
        .get<TrendingApiResponse>(
          "https://public-api.birdeye.so/defi/token_trending",
          {
            searchParams: {
              sort_by: trendingSortBy,
              sort_type: sortType,
              offset: page * trendingLimit,
              limit: trendingLimit,
            },
            headers: {
              "X-API-KEY": getBirdeyeApiKey(),
              accept: "application/json",
              "x-chain": chain,
            },
          }
        )
        .json();
      return data.tokens;
    },
    enabled: activeTab === "trending" && getBirdeyeApiKey() !== "",
  });

  const tokenListQuery = useQuery({
    queryKey: ["tokenList", chain, sortBy, sortType, page],
    queryFn: async () => {
      const { data } = await ky
        .get<ApiResponse>("https://public-api.birdeye.so/defi/tokenlist", {
          searchParams: {
            sort_by: sortBy,
            sort_type: sortType,
            offset: page * listLimit,
            limit: listLimit,
            min_liquidity: 100,
          },
          headers: {
            "X-API-KEY": getBirdeyeApiKey(),
            accept: "application/json",
            "x-chain": chain,
          },
        })
        .json();
      return data.tokens;
    },
    enabled: activeTab === "all" && getBirdeyeApiKey() !== "",
  });

  const isLoading =
    activeTab === "all"
      ? tokenListQuery.isLoading
      : trendingTokensQuery.isLoading;

  const isError =
    activeTab === "all" ? tokenListQuery.isError : trendingTokensQuery.isError;

  const tokens = tokenListQuery.data ?? [];
  const trendingTokens = trendingTokensQuery.data ?? [];

  const handleSort = (column: string) => {
    const newSortBy =
      activeTab === "all" ? column : (column as keyof TrendingTokenData);
    if ((activeTab === "all" ? sortBy : trendingSortBy) === newSortBy) {
      setSortType(sortType === "asc" ? "desc" : "asc");
    } else {
      if (activeTab === "all") {
        setSortBy(newSortBy);
      } else {
        setTrendingSortBy(newSortBy);
      }
      setSortType("desc");
    }
  };

  const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined) return "N/A";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const renderTableContent = () => {
    if (isLoading) {
      return Array(limit)
        .fill(0)
        .map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-24 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-24 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
          </TableRow>
        ));
    }

    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center">
            Error fetching data
          </TableCell>
        </TableRow>
      );
    }

    if (activeTab === "all") {
      return tokens.map((token) => (
        <TableRow
          key={token.address}
          onClick={() =>
            navigate({
              to: "/tokens/$chainId/$tokenId",
              params: {
                chainId: getChainIdByChainName(chain),
                tokenId: token.address,
              },
            })
          }
        >
          <TableCell className="font-medium">
            <div className="flex items-center space-x-2">
              <img
                src={token.logoURI ?? placeholderImage}
                alt={token.name}
                width={24}
                height={24}
                className="rounded-full h-6 w-6"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = placeholderImage;
                }}
              />
              <span className="font-logo text-nowrap">${token.symbol}</span>
            </div>
          </TableCell>
          <TableCell className="text-right">
            ${formatNumber(token.mc)}
          </TableCell>
          <TableCell className="text-right">
            ${formatNumber(token.v24hUSD)}
          </TableCell>
          <TableCell
            className={`text-right ${token.v24hChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {formatNumber(token.v24hChangePercent)}%
          </TableCell>
          <TableCell className="text-right">
            ${formatNumber(token.liquidity)}
          </TableCell>
        </TableRow>
      ));
    }

    return trendingTokens.map((token) => (
      <TableRow
        key={token.address}
        onClick={() =>
          navigate({
            to: "/tokens/$chainId/$tokenId",
            params: {
              chainId: getChainIdByChainName(chain),
              tokenId: token.address,
            },
          })
        }
      >
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            <img
              src={token.logoURI ?? placeholderImage}
              alt={token.name}
              width={24}
              height={24}
              className="rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = placeholderImage;
              }}
            />
            <span className="font-logo">${token.symbol}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">{token.rank}</TableCell>
        <TableCell className="text-right">
          ${formatNumber(token.volume24hUSD)}
        </TableCell>
        <TableCell className="text-right">
          ${formatNumber(token.liquidity)}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card className="h-full flex-col flex min-h-0">
      <CardHeader className="p-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold uppercase tracking-wide font-logo">
            TRENCHES
          </CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Tokens</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div>
          <div className="flex space-x-4">
            <TabRadioGroup
              value={chain}
              onValueChange={setChain}
              options={chains}
              className="h-8"
            />
            <TabRadioGroup
              value={activeTab === "all" ? sortBy : trendingSortBy}
              onValueChange={(value) => {
                if (activeTab === "all") {
                  setSortBy(value as keyof TokenData);
                } else {
                  setTrendingSortBy(value as keyof TrendingTokenData);
                }
                setSortType("desc");
              }}
              options={activeTab === "all" ? sortOptions : trendingSortOptions}
              className="h-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="font-mono flex-grow overflow-hidden flex flex-col">
        <ScrollArea className="h-full flex-grow">
          <Table className="relative">
            <TableHeader className="sticky top-0">
              <TableRow className="font-logo bg-background/95 hover:bg-black">
                <TableHead className="w-[100px]">Token</TableHead>
                {activeTab === "all" ? (
                  <>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("mc")}
                    >
                      Market Cap
                      {sortBy === "mc" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("v24hUSD")}
                    >
                      Volume
                      {sortBy === "v24hUSD" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("v24hChangePercent")}
                    >
                      Change
                      {sortBy === "v24hChangePercent" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer">
                      Liquidity
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("rank")}
                    >
                      Rank
                      {trendingSortBy === "rank" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("volume24hUSD")}
                    >
                      Volume
                      {trendingSortBy === "volume24hUSD" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("liquidity")}
                    >
                      Liquidity
                      {trendingSortBy === "liquidity" && (
                        <ChevronsUpDown className="ml-2 h-4 w-4 inline" />
                      )}
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{renderTableContent()}</TableBody>
          </Table>
        </ScrollArea>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((old) => Math.max(old - 1, 0))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((old) => old + 1)}
            disabled={
              (activeTab === "all" ? tokens : trendingTokens).length < limit
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
