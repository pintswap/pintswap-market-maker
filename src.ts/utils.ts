import { ethers } from "ethers";
import { AGENT } from "./env";
import { toWETH } from "@pintswap/sdk";

// Constants
export const TIMEOUT_MS = 30e4;
export const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Helpers
export const timeout = async (n: number = TIMEOUT_MS) => {
  await new Promise((resolve) => setTimeout(resolve, n));
};

export const toHex = (n: number) => {
  return ethers.toBeHex(ethers.getUint(BigInt(Number(Number(n).toFixed(0)))));
};

export const ln = (v) => ((console.log(v)), v);

export const toProvider = (providerOrSigner) => {
  if (providerOrSigner.sendTransaction && providerOrSigner.getAddress)
    return providerOrSigner.provider;
  return providerOrSigner;
};

export const proxyFetch = async (uri, config?) => {
  config = config && { ...config } || { method: 'GET'};
  config.agent = AGENT || null;
  return await fetch(uri, config);
};

export const coerceToWeth = async (address, providerOrSigner) => {
  if (address === ethers.ZeroAddress) {
    const { chainId } = await toProvider(providerOrSigner).getNetwork();
    return toWETH(chainId);
  }
  return address;
};