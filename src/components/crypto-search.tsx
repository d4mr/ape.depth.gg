import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Loader2, ChevronRight, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  info?: {
    imageUrl?: string;
  };
}

const supportedChains = ["base", "bsc"];

export function CryptoSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedCallback((value) => {
    if (value) {
      setIsLoading(true);
      fetch(`https://api.dexscreener.com/latest/dex/search/?q=${value}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.pairs);
          setIsLoading(false);
          setIsOpen(true);
        })
        .catch((err) => {
          console.error("Error fetching data:", err);
          setIsLoading(false);
        });
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Add this effect to maintain focus
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure focus after popover animation
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handlePopoverInteraction = (event: React.MouseEvent) => {
    event.preventDefault();
    inputRef.current?.focus();
  };

  const sortedResults = useMemo(() => {
    return [...(results ?? [])].sort((a, b) => {
      const aSupported = supportedChains.includes(a.chainId.toLowerCase());
      const bSupported = supportedChains.includes(b.chainId.toLowerCase());
      if (aSupported && !bSupported) return -1;
      if (!aSupported && bSupported) return 1;
      return 0;
    });
  }, [results]);

  const ResultItem = ({ result }: { result: SearchResult }) => {
    const isSupported = supportedChains.includes(result.chainId.toLowerCase());

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: go away plz */}
            <div
              className={`flex items-center justify-between py-2 px-3 hover:bg-accent/50 cursor-pointer ${
                !isSupported ? "opacity-50" : ""
              }`}
              onClick={() => isSupported && window.open(result.url, "_blank")}
            >
              <div className="flex items-center space-x-2 flex-grow">
                <img
                  src={
                    result.info?.imageUrl ?? "https://placehold.co/24x24?text=?"
                  }
                  alt={result.baseToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/24x24?text=?";
                  }}
                />
                <div className="flex-grow">
                  <p className="font-logo font-medium text-sm text-foreground">
                    ${result.baseToken.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {result.baseToken.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {result.chainId}
                </span>
                <p className="font-mono font-medium text-sm w-20 text-right">
                  ${Number.parseFloat(result.priceUsd).toFixed(4)}
                </p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </TooltipTrigger>
          {!isSupported && (
            <TooltipContent>
              <p>Sorry, this chain is not supported</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search the trenches..."
              className="pl-8 w-full appearance-none font-logo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && !isLoading && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isLoading && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-2rem)] max-w-3xl p-0"
          onMouseDown={handlePopoverInteraction} // Prevent focus stealing
          align="start"
          side="bottom"
        >
          <ScrollArea className="h-[60vh] rounded-md">
            {sortedResults.length > 0 ? (
              sortedResults.map((result, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <ResultItem key={index} result={result} />
              ))
            ) : (
              <div className="grid place-items-center">
                <p className="p-3 text-sm text-muted-foreground font-logo text-center">
                  No results found
                </p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
