export const setBirdeyeApiKey = (apiKey: string) => {
	localStorage.setItem("birdeye_api_key", apiKey);
};

export const getBirdeyeApiKey = () => {
	return localStorage.getItem("birdeye_api_key") || "";
};
