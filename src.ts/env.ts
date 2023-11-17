import { ethers } from "ethers";
import { HttpProxyAgent } from "http-proxy-agent";
import url from "url";

export const SIGNER = new ethers.Wallet(process.env.PINTSWAP_DAEMON_WALLET).connect(
  new ethers.InfuraProvider("mainnet")
);

export const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;

export const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";

export const AGENT = process.env.PINTSWAP_MARKET_MAKER_PROXY ? new HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY) : null;

export const URI = url.format({
  protocol: "http:",
  hostname: HOST,
  port: PORT
});