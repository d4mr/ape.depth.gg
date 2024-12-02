import { createThirdwebClient } from "thirdweb";

if (!import.meta.env.VITE_THIRDWEB_CLIENT_ID) {
  throw new Error("VITE_THIRDWEB_CLIENT_ID is required");
}

export const client = createThirdwebClient({
	clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});
