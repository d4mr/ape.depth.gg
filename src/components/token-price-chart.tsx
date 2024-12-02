import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  LineStyle,
  type Time,
} from "lightweight-charts";
import ky from "ky";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { getBirdeyeApiKey } from "@/config";
import { getChainNameByChainId } from "./trenches-table";

interface PriceData {
  time: Time;
  value: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    items: Array<{
      unixTime: number;
      value: number;
    }>;
  };
}

type TimeResolution =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1H"
  | "2H"
  | "4H"
  | "6H"
  | "8H"
  | "12H"
  | "1D"
  | "3D"
  | "1W"
  | "1M";

const TIME_PERIODS: TimeResolution[] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1H",
  "2H",
  "4H",
  "6H",
  "8H",
  "12H",
  "1D",
  "3D",
  "1W",
  "1M",
];

const MAX_DAYS_BACK = 365;

export const TokenPriceChart = ({
  chainId,
  tokenAddress,
}: {
  chainId: string;
  tokenAddress: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [resolution, setResolution] = useState<TimeResolution>("15m");
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingMore = useRef(false);
  const dataRef = useRef<PriceData[]>([]);

  // Create the chart instance
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#09090B" },
        textColor: "#A1A1AA",
      },
      grid: {
        vertLines: { color: "#18181B" },
        horzLines: { color: "#18181B" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 12,
        fixLeftEdge: true,
        minBarSpacing: 4,
      },
    });

    const series = chart.addLineSeries({
      color: "#22C55E",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lineStyle: LineStyle.Solid,
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
      priceLineVisible: true,
      priceLineColor: "#22C55E",
      priceLineStyle: LineStyle.Dotted,
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  const fetchPriceData = useCallback(
    async (from: number, to: number) => {
      try {
        const response = await ky
          .get("https://public-api.birdeye.so/defi/history_price", {
            searchParams: {
              address: tokenAddress,
              address_type: "token",
              type: resolution,
              time_from: from.toString(),
              time_to: to.toString(),
            },
            headers: {
              "X-API-KEY": getBirdeyeApiKey(),
              accept: "application/json",
              "x-chain": getChainNameByChainId(chainId),
            },
          })
          .json<ApiResponse>();

        return response.data.items.map((item) => ({
          time: item.unixTime as Time,
          value: item.value,
        }));
      } catch (error) {
        console.error("Error fetching price data:", error);
        return [];
      }
    },
    [resolution, tokenAddress, chainId]
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!seriesRef.current) return;

      setIsLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - 24 * 60 * 60;
        const data = await fetchPriceData(dayAgo, now);

        if (seriesRef.current && data.length > 0) {
          dataRef.current = data;
          seriesRef.current.setData(data);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [fetchPriceData]);

  // Handle historical data loading
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const handleVisibleRangeChange = async () => {
      if (
        isLoadingMore.current ||
        !seriesRef.current ||
        dataRef.current.length === 0
      )
        return;

      const logicalRange = chartRef.current
        ?.timeScale()
        .getVisibleLogicalRange();
      if (!logicalRange) return;

      const barsInfo = seriesRef.current.barsInLogicalRange(logicalRange);
      if (!barsInfo || barsInfo.barsBefore > 50) return;

      const firstBar = dataRef.current[0];
      if (!firstBar) return;

      const now = Math.floor(Date.now() / 1000);
      const maxLookback = now - MAX_DAYS_BACK * 24 * 60 * 60;
      if (firstBar.time <= maxLookback) return;

      isLoadingMore.current = true;

      try {
        const newFrom = Math.max(
          maxLookback,
          Number(firstBar.time) - 24 * 60 * 60
        );
        const newData = await fetchPriceData(newFrom, Number(firstBar.time));

        if (!seriesRef.current) return;

        const uniqueData = [...newData, ...dataRef.current]
          .reduce((acc, curr) => {
            if (!acc.find((item) => item.time === curr.time)) {
              acc.push(curr);
            }
            return acc;
          }, [] as PriceData[])
          .sort((a, b) => Number(a.time) - Number(b.time));

        dataRef.current = uniqueData;
        seriesRef.current.setData(uniqueData);
      } catch (error) {
        console.error("Failed to load historical data:", error);
      } finally {
        isLoadingMore.current = false;
      }
    };

    chartRef.current
      .timeScale()
      .subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    return () => {
      chartRef.current
        ?.timeScale()
        .unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
    };
  }, [fetchPriceData]);

  return (
    <Card className="w-full h-full min-h-0 relative">
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-zinc-900 border-zinc-800">
              {resolution} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
            {TIME_PERIODS.map((period) => (
              <DropdownMenuItem
                key={period}
                className="text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                onClick={() => setResolution(period)}
              >
                {period}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div ref={containerRef} className="w-full h-full">
        {isLoading && (
          <div className="h-full w-full flex items-center justify-center text-zinc-400">
            Loading chart data...
          </div>
        )}
      </div>
    </Card>
  );
};
