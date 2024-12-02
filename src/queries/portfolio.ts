import { queryOptions } from "@tanstack/react-query";
import ky from "ky";
import { toTokens } from "thirdweb/utils";
import {
	type BalancesResponse,
	GoldRushClient,
	type GoldRushResponse,
} from "@covalenthq/client-sdk";

type ChainbaseToken = {
	balance: string;
	contract_address: string;
	current_usd_price: number;
	decimals: number;
	logos: string[];
	name: string;
	symbol: string;
	total_supply: string;
	urls: string[];
};

type ChainbaseResponse = {
	code: number;
	message: string;
	data: ChainbaseToken[];
	count: number;
};

type PortfolioQueryArgs = {
	address: string | undefined;
};

export type PortfolioToken = {
	address: string;
	chainName: string;
	name: string | null;
	symbol: string;
	logoURI: string | null;
	uiAmount: string | null;
	decimals: number;
	valueUsd: number;
	balance: bigint;
};

const transformChainbaseBalances = (
	response: ChainbaseResponse,
	chainName: string,
) => {
	if (!response?.data) return [];

	return response.data
		.filter((item) => item.balance && BigInt(item.balance) > 0 && item.symbol)
		.map((item) => {
			const balance = BigInt(item.balance);
			return {
				address: item.contract_address,
				chainName,
				name: item.name,
				symbol: item.symbol,
				logoURI: item.logos?.[0],
				uiAmount: item.decimals ? toTokens(balance, item.decimals) : null,
				decimals: item.decimals,
				valueUsd: item.current_usd_price,
				balance,
			};
		});
};

export const portfolioQueryOptions = (args: PortfolioQueryArgs) =>
	queryOptions({
		queryKey: ["portfolio", args],
		queryFn: async () => {
			if (!args.address) throw new Error("Address is required");
			if (!import.meta.env.VITE_COVALENT_API_KEY)
				throw new Error("Missing Covalent API key");
			if (!import.meta.env.VITE_CHAINBASE_API_KEY)
				throw new Error("Missing Chainbase API key");

			// Get BSC data from Covalent/Goldrush
			const client = new GoldRushClient(import.meta.env.VITE_COVALENT_API_KEY);
			const bscBalances =
				await client.BalanceService.getTokenBalancesForWalletAddress(
					"bsc-mainnet",
					args.address,
				);

			// Get Base data from Chainbase
			const baseBalancesResponse = await ky
				.get(
					`https://api.chainbase.online/v1/account/tokens?chain_id=8453&address=${args.address}`,
					{
						headers: {
							"x-api-key": import.meta.env.VITE_CHAINBASE_API_KEY,
						},
					},
				)
				.json<ChainbaseResponse>();

			const arbitrumBalancesResponse = await ky
				.get(
					`https://api.chainbase.online/v1/account/tokens?chain_id=42161&address=${args.address}`,
					{
						headers: {
							"x-api-key": import.meta.env.VITE_CHAINBASE_API_KEY,
						},
					},
				)
				.json<ChainbaseResponse>();

			const transformBalances = (
				wrapper: GoldRushResponse<BalancesResponse>,
				chainName: string,
			) => {
				const data = wrapper.data;
				if (!data?.items) return [];

				return data.items
					.filter(
						(item) =>
							!item.is_spam &&
							item.balance &&
							item.balance > 0n &&
							item.contract_ticker_symbol &&
							!item.nft_data,
					)
					.map((item) => ({
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						address: item.contract_address!,
						chainName: chainName,
						name: item.contract_name,
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						symbol: item.contract_ticker_symbol!,
						logoURI: item.logo_urls?.token_logo_url || item.logo_url,
						uiAmount:
							item.balance && item.contract_decimals
								? toTokens(item.balance, item.contract_decimals)
								: null,
						decimals: item.contract_decimals || 0,
						valueUsd: item.quote || 0,
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						balance: item.balance!,
					}));
			};

			const items = [
				...transformBalances(bscBalances, "bsc"),
				...transformChainbaseBalances(baseBalancesResponse, "base"),
				...transformChainbaseBalances(arbitrumBalancesResponse, "arbitrum"),
			];

			return {
				items,
				totalValue: items.reduce((sum, item) => sum + item.valueUsd, 0),
			};
		},
		staleTime: 1000 * 60,
		enabled: !!args.address,
	});
