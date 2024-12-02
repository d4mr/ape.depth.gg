"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import ky from "ky";
import { getBirdeyeApiKey } from "@/config";

function formatNumber(num: number, decimals = 6): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface TokenInfo {
  symbol: string;
  decimals: number;
  address: string;
  amount: number;
  uiAmount: number;
  price: number | null;
  nearestPrice: number;
  changeAmount: number;
  uiChangeAmount: number;
}

interface Order {
  quote: TokenInfo;
  base: TokenInfo;
  side: "buy" | "sell";
  blockUnixTime: number;
  txHash: string;
  source: string;
  txType: string;
  owner: string;
  pricePair: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    items: Order[];
    hasNext: boolean;
  };
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function TokenTrades({
  chainName,
  tokenAddress,
}: {
  chainName: string;
  tokenAddress: string;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ky.get(
          "https://public-api.birdeye.so/defi/txs/token",
          {
            searchParams: {
              address: tokenAddress,
              limit: 50,
              tx_type: "swap",
              sort_type: "desc",
            },
            headers: {
              "X-API-KEY": getBirdeyeApiKey(),
              accept: "application/json",
              "x-chain": chainName,
            },
          }
        );
        const data: ApiResponse = await response.json();
        if (data.success) {
          setOrders(data.data.items);
        } else {
          throw new Error("Failed to fetch orders");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <Card className="h-full w-full overflow-hidden min-h-0 flex-col flex">
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-wide font-logo">
          Recent Swap Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="relative overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-center p-4 text-red-600">Error: {error}</div>
        ) : (
          <ScrollArea className="h-full flex-grow">
            <Table>
              <TableHeader className="sticky top-0 bg-black">
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Time & Date
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => {
                  const dogeToken =
                    order.base.symbol.toLowerCase() === "doge"
                      ? order.base
                      : order.quote;
                  const otherToken =
                    order.base.symbol.toLowerCase() === "doge"
                      ? order.quote
                      : order.base;

                  const amount = Math.abs(dogeToken.uiAmount);
                  const price = dogeToken.price; // USD price of DOGE
                  const total = amount * price;
                  const token = otherToken.symbol;

                  const isBuy = order.side === "buy";
                  const date = new Date(order.blockUnixTime * 1000);

                  return (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap">
                        {date.toLocaleTimeString()} {date.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isBuy ? "success" : "destructive"}>
                          {isBuy ? "BUY" : "SELL"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(price)}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(total)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {token}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
