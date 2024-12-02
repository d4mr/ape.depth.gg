import { toast } from "sonner";
import { ArrowDown, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { bsc, base } from "thirdweb/chains";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { tokenOverviewQueryOptions } from "@/queries/token-overview";
import {
  portfolioQueryOptions,
  type PortfolioToken,
} from "@/queries/portfolio";
import { useActiveAccount } from "thirdweb/react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import ky from "ky";
import { client } from "@/client";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { getChainIdByChainName } from "./trenches-table";

export function BuyToken({
  chainName,
  tokenAddress,
}: {
  chainName: string;
  tokenAddress: string;
}) {
  const buyTokenQuery = useQuery(
    tokenOverviewQueryOptions({ chainId: chainName, tokenAddress })
  );

  const account = useActiveAccount();

  const userTokensQuery = useQuery(
    portfolioQueryOptions({
      address: account?.address,
    })
  );

  const [selectedToken, setSelectedToken] = useState<PortfolioToken | null>(
    null
  );

  const [inputAmount, setInputAmount] = useState<string>("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputAmount(value);
    }
  };

  const isLoadingTokens = userTokensQuery.isLoading;
  const userTokens = userTokensQuery.data?.items || [];

  const isLoadingFixedToken = buyTokenQuery.isLoading;
  const fixedToken = buyTokenQuery.data;

  const isInputValid = () => {
    if (!selectedToken || !inputAmount) return false;
    const inputValue = Number.parseFloat(inputAmount);
    const maxAmount =
      Number(selectedToken.balance) / 10 ** selectedToken.decimals;
    return inputValue > 0 && inputValue <= maxAmount;
  };

  const [isQuoteLocked, setQuoteLocked] = useState(false);

  const [debouncedAmount] = useDebounce(inputAmount, 500);

  const quoteQuery = useQuery<QuoteResponse>({
    queryKey: [
      "quote",
      debouncedAmount,
      selectedToken?.address,
      fixedToken?.address,
    ],
    queryFn: async () => {
      if (!selectedToken || !fixedToken) throw Error("not fulfilled");

      const searchParams = {
        amount: (
          Number(debouncedAmount) *
          10 ** (selectedToken.decimals || 18)
        ).toString(),
        fromTokenAddress: selectedToken.address,
        fromTokenChainId: getChainIdByChainName(selectedToken.chainName),
        toTokenAddress: fixedToken.address,
        toTokenChainId: getChainIdByChainName(chainName),
        destFuel: "0",
        slippageTolerance: "2",
        partnerId: "0",
        refundAddress:
          account?.address ?? "0xF768E66c72F6B18192E0c89d38B3028755649853",
      };

      return ky
        .get("https://api.pay.routerprotocol.com/swap-on-nitro", {
          searchParams,
          timeout: 60000,
          retry: 0,
        })
        .json<QuoteResponse>();
    },
    enabled: Boolean(
      debouncedAmount &&
        isInputValid() &&
        selectedToken?.address &&
        fixedToken?.address &&
        !isQuoteLocked
    ),
    refetchInterval: 60000,
    retry: false,
  });

  return (
    <Card className="w-full h-full min-h-0">
      <CardContent className="space-y-4 mt-4">
        {isLoadingTokens ? (
          <Skeleton className="h-10 w-full" />
        ) : userTokens.length > 0 ? (
          <TokenSelector
            tokens={userTokens}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
          />
        ) : (
          <div className="h-10 flex items-center justify-center border rounded-md">
            No tokens available
          </div>
        )}

        <div className="flex justify-center">
          <ArrowDown className="text-gray-500" />
        </div>

        {isLoadingFixedToken ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          fixedToken && (
            <div className="flex items-center justify-between p-2 pl-8 text-sm border rounded-md">
              <div className="flex items-center gap-1">
                <img
                  src={fixedToken.logoURI || "https://placehold.co/32x32"}
                  alt={fixedToken.name}
                  className="mr-2 rounded-full h-6 w-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/32x32";
                  }}
                />
                <span className="font-logo">{fixedToken.symbol}</span>
                <span className="text-muted-foreground">({chainName})</span>
              </div>
            </div>
          )
        )}
        <div className="pt-4">
          <Input
            type="text"
            className="py-6 font-logo"
            placeholder="Enter amount"
            value={inputAmount}
            onChange={handleInputChange}
          />
          <p className="text-center text-sm uppercase text-muted-foreground font-logo pt-4">
            enter amount to fetch quote
          </p>
        </div>

        <QuoteDisplay quoteQuery={quoteQuery} />
        {quoteQuery.data && fixedToken?.address && selectedToken?.address && (
          <TransactionFlow
            tokenAddress={selectedToken.address}
            quote={quoteQuery.data}
            isQuoteLoading={quoteQuery.isLoading}
            onQuoteLock={(v) => setQuoteLocked(v)}
          />
        )}
      </CardContent>

      {/* <CardFooter>
        <Button
          className="w-full"
          disabled={!isInputValid() || isLoadingQuote || !quote}
        >
          BUY
        </Button>
      </CardFooter> */}
    </Card>
  );
}

interface TokenSelectorProps {
  tokens: PortfolioToken[];
  selectedToken: PortfolioToken | null;
  onSelectToken: (token: PortfolioToken) => void;
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelectToken,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);

  const formatBalance = (balance: bigint, decimals: number) => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(4);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={"lg"}
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedToken ? (
            <div className="flex items-center gap-1">
              <img
                src={selectedToken.logoURI || "https://placehold.co/32x32"}
                alt={selectedToken.name || ""}
                width={24}
                height={24}
                className="mr-2 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://placehold.co/32x32";
                }}
              />
              <span className="font-logo">{selectedToken.symbol}</span>
              <span className="text-muted-foreground">
                ({selectedToken.chainName})
              </span>
            </div>
          ) : (
            "Select token"
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <ScrollArea className="h-[300px]">
          {tokens.length > 0 ? (
            <div className="p-2 flex flex-col gap-2">
              {tokens.map((token) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                <div
                  key={`${token.chainName}-${token.address}`}
                  className={cn(
                    "w-full p-8 hover h-12",
                    buttonVariants({ variant: "ghost", size: "lg" })
                  )}
                  onClick={() => {
                    onSelectToken(token);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <img
                        src={token.logoURI || "https://placehold.co/32x32"}
                        alt={token.name || ""}
                        className="mr-2 rounded-full h-8 w-8"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/32x32";
                        }}
                      />
                      <div className="text-left font-logo">
                        <div>{token.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {token.chainName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {formatBalance(token.balance, token.decimals)}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        ${token.valueUsd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No tokens available
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface TokenInfo {
  decimals: number;
  symbol: string;
  name: string;
  chainId: string;
  chainType: string;
  address: string;
  resourceID: string;
  isMintable: boolean;
  isWrappedAsset: boolean;
  isReserveAsset: boolean;
}

interface BridgeFee {
  address: string;
  amount: string;
  decimals: number;
  symbol: string;
}

interface ChainInfo {
  chainId: string;
  asset: TokenInfo;
  stableReserveAsset: Omit<TokenInfo, "chainType">;
  tokenAmount: string;
  stableReserveAmount: string;
  path: string[];
  flags: string[];
  priceImpact: string;
  tokenPath: string;
  dataTx: string[];
}

interface QuoteResponse {
  depositInfo: {
    uid: string;
    chainId: number;
    depositAddress: string;
    amount: string;
    refundAddress: string;
    status: string;
    createdAt: string;
    expirationAt: string;
  };
  bestRoute: {
    bridgeFee: BridgeFee;
    flowType: string;
    isTransfer: boolean;
    isWrappedToken: boolean;
    allowanceTo: string;
    source: ChainInfo;
    destination: ChainInfo;
    fromTokenAddress: string;
    toTokenAddress: string;
    senderAddress: string;
    receiverAddress: string;
    partnerId: string;
    txn: string;
  };
}

export function QuoteDisplay({
  quoteQuery,
}: {
  quoteQuery: UseQueryResult<QuoteResponse, Error>;
}) {
  if (quoteQuery.isLoading) {
    return (
      <div className="space-y-2 mt-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (quoteQuery.error) {
    return (
      <div className="text-sm text-red-500 mt-4">
        Failed to fetch quote. Please try again.
      </div>
    );
  }

  const quote = quoteQuery.data;

  if (!quote) return null;

  const deadline = new Date(quote.depositInfo.expirationAt);
  const receivedAmount = quote.bestRoute.destination.tokenAmount;
  const formattedAmount = receivedAmount
    ? (
        Number(receivedAmount) /
        10 ** quote.bestRoute.destination.asset.decimals
      ).toFixed(6)
    : "0";

  return (
    <div className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between p-3 bg-muted rounded-lg">
        <span className="text-muted-foreground">You will receive</span>
        <span className="font-medium">
          {formattedAmount} {quote.bestRoute.destination.asset.symbol}
        </span>
      </div>
      <div className="flex justify-between p-3 bg-muted rounded-lg">
        <span className="text-muted-foreground">Quote expires in</span>
        <span className="font-medium">{deadline.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

interface TransactionStatusResponse {
  results: Array<{
    status: "SUCCESS" | "PENDING" | "FAILED";
    relayTxn: string;
    chainId: number;
    amount: string;
    refundAddress: string;
    createdAt: string;
    updatedAt: string;
    uid: string;
    expirationAt: string;
    currentBalance: string;
    depositAddress: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TransactionFlowProps {
  quote: QuoteResponse;
  isQuoteLoading: boolean;
  onQuoteLock: (locked: boolean) => void;
  tokenAddress: string;
}

function TransactionFlow({
  quote,
  isQuoteLoading,
  onQuoteLock,
  tokenAddress,
}: TransactionFlowProps) {
  const queryClient = useQueryClient();
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  const chain = quote.depositInfo.chainId === bsc.id ? bsc : base;

  const contract = getContract({
    client,
    chain: chain,
    address: tokenAddress,
  });

  const {
    mutate: sendTransaction,
    isPending,
    isSuccess: isDepositSuccess,
  } = useSendAndConfirmTransaction();

  // Status polling query
  const { data: txStatus } = useQuery({
    queryKey: ["txStatus", depositAddress],
    queryFn: async () => {
      if (!depositAddress) return null;
      const out = await ky
        .get(
          "https://api.pay.routerprotocol.com/get-status-by-deposit-address",
          {
            searchParams: {
              depositAddress,
              chainId: chain.id,
            },
            retry: 0,
          }
        )
        .json<TransactionStatusResponse>();

      if (out?.results[0]?.status === "SUCCESS") {
        toast("Your swap has been completed successfully!");
        setAllDone(true);
        // Clean up
        setDepositAddress(null);
        onQuoteLock(false);
      }

      return out;
    },
    enabled: Boolean(depositAddress && isDepositSuccess),
    refetchInterval: (data) => {
      if (allDone) return false;
      return 5000; // Poll every 5 seconds
    },
  });

  const handleTransaction = async () => {
    if (!quote) return;

    onQuoteLock(true);
    setDepositAddress(quote.depositInfo.depositAddress);

    console.log(quote);

    const transaction = transfer({
      contract,
      to: quote.depositInfo.depositAddress,
      amountWei: BigInt(quote.depositInfo.amount),
    });

    sendTransaction(transaction, {
      onError: (error) => {
        console.error("Transaction failed:", error);
        toast.error("Failed!");
        onQuoteLock(false);
        setDepositAddress(null);
      },
      onSuccess: () => {
        toast("Deposit successful");
        queryClient.invalidateQueries({
          queryKey: ["txStatus", quote.depositInfo.depositAddress],
        });
      },
    });
  };

  const currentStatus = txStatus?.results[0]?.status;

  return (
    <div className="mt-4">
      <Button
        className="w-full"
        disabled={isQuoteLoading || !quote || isPending}
        onClick={handleTransaction}
      >
        {isPending
          ? currentStatus === "SUCCESS"
            ? "Bought Successfully!"
            : currentStatus === "FAILED"
              ? "FAILED"
              : "Purchase in Progress..."
          : "Swap Tokens"}
      </Button>
    </div>
  );
}
