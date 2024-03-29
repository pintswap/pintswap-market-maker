import { ethers } from "ethers";
import path from "path";
import url from "url";
import { getLogger } from "./logger";
import { toWETH } from "@pintswap/sdk/lib/trade";
import qs from "querystring";
import { HttpProxyAgent } from "http-proxy-agent";
import { ChainId, Token, WETH, Fetcher, Route } from "@uniswap/sdk";

const fetch = (global as any).fetch;

const logger = getLogger();

const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";

const agent = process.env.PINTSWAP_MARKET_MAKER_PROXY
  ? new HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY)
  : null;

const coerceToWeth = async (address, providerOrSigner) => {
  if (address === ethers.ZeroAddress) {
    const { chainId } = await toProvider(providerOrSigner).getNetwork();
    return toWETH(chainId);
  }
  return address;
};

const URI = url.format({
  protocol: "http:",
  hostname: HOST,
  port: PORT,
});

export const add = async ({
  getsAmount,
  givesAmount,
  getsToken,
  givesToken,
}) => {
  logger.info("adding order");
  return (
    await fetch(URI + "/add", {
      method: "POST",
      body: JSON.stringify({
        getsAmount,
        givesAmount,
        getsToken,
        givesToken,
      }),
      headers: {
        "content-type": "application/json",
      },
    })
  ).json();
};

async function publishOnce() {
  return await fetch(URI + "/publish-once", {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
    },
  });
}

export const offers = async () => {
  return (
    await (
      await fetch(URI + "/offers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
      })
    ).json()
  ).result;
};

export const deleteOffer = async ({ id }) => {
  return (
    await fetch(URI + "/delete", {
      method: "POST",
      body: JSON.stringify({
        id,
      }),
      headers: {
        "content-type": "application/json",
      },
    })
  ).json();
};

export const clearOrderbookForPair = async ({
  tokenA: getsToken,
  tokenB: givesToken,
}) => {
  const offerList = await offers();
  logger.info("deleting " + offerList.length + " orders");
  const [gets, gives] = [getsToken, givesToken].map((v) => v.toLowerCase());
  const filtered = offerList
    .filter(
      (v) =>
        (v.gets.token.toLowerCase() === gets &&
          v.gives.token.toLowerCase() === gives) ||
        (v.gives.token.toLowerCase() === gets &&
          v.gets.token.toLowerCase() === gives),
    )
    .map((v) => v.id);
  for (const id of filtered) {
    await deleteOffer({ id });
  }
  logger.info("done");
};

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

export const toProvider = (providerOrSigner) => {
  if (providerOrSigner.sendTransaction && providerOrSigner.getAddress)
    return providerOrSigner.provider;
  return providerOrSigner;
};

export const proxyFetch = async (uri, config?) => {
  config = (config && { ...config }) || { method: "GET" };
  config.agent = agent || null;
  return await fetch(uri, config);
};

export const ln = (v) => (console.log(v), v);

export const getFairValue = async (token, providerOrSigner) => {
  if (ethers.getAddress(token) === USDC_ADDRESS) return BigInt(1000000);
  if (token === ethers.ZeroAddress)
    token = toWETH((await toProvider(providerOrSigner).getNetwork()).chainId);
  const response = await (
    await proxyFetch("https://api.dexscreener.com/latest/dex/tokens/" + token)
  ).text();
  logger.info(response);
  const responseAsJson = JSON.parse(response);
  const priceUsd = responseAsJson.pairs[0].priceUsd;
  logger.info("fair value of asset is " + priceUsd);
  return BigInt(ethers.parseUnits(Number(priceUsd).toFixed(6), 6));
};

export const toHex = (n: number) => {
  return ethers.toBeHex(ethers.getUint(BigInt(Number(Number(n).toFixed(0)))));
};

export const postSpread = async (
  { getsToken, givesToken },
  tolerance,
  nOffers,
  signer,
) => {
  const [getsTokenPrice, givesTokenPrice] = await Promise.all(
    [getsToken, givesToken].map(async (v) => getFairValue(v, signer)),
  );
  const [getsTokenDecimals, givesTokenDecimals] = await Promise.all(
    [getsToken, givesToken].map(async (v) =>
      new ethers.Contract(
        await coerceToWeth(v, signer),
        ["function decimals() view returns (uint8)"],
        signer,
      ).decimals(),
    ),
  );
  const givesTokenBalance =
    givesToken === ethers.ZeroAddress
      ? await signer.provider.getBalance(await signer.getAddress())
      : await new ethers.Contract(
          givesToken,
          ["function balanceOf(address) view returns (uint256)"],
          signer,
        ).balanceOf(await signer.getAddress());
  const priceMultipliers = Array(Number(nOffers) + 1)
    .fill(0)
    .map((_, i) => 1 + i * (Number(tolerance) / Number(nOffers)))
    .slice(1);
  const offersToInsert = priceMultipliers
    .map((v) => Math.pow(v - 1, 2))
    .map(
      (() => {
        let sum;
        return (v, i, ary) => {
          if (!sum) sum = ary.reduce((r, v) => r + v, 0);
          return v / sum;
        };
      })(),
    )
    .map((v, i) => {
      return {
        givesToken,
        givesAmount: toHex(v * Number(givesTokenBalance)),
        getsToken,
        getsAmount: toHex(
          (v *
            Number(givesTokenBalance) *
            priceMultipliers[i] *
            Number(givesTokenPrice) *
            Math.pow(10, Number(getsTokenDecimals))) /
            (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice)),
        ),
      };
    });
  logger.info("posting spread --");
  for (const item of offersToInsert) {
    logger.info(item);
    await add(item);
  }
  logger.info("spread posted!");
};

const LLAMA_NODES_KEY =
  process.env.PROCESS_APP_LLAMA_NODES_KEY || "01HDHGP0YXWDYKRT37QQBDGST5";
// const provider = new ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`);
// const provider = new ethers.AlchemyProvider(`mainnet`, `KsA01_UT0zpC1_F11oCf25sblF1ZCVdb`);
const provider = new ethers.InfuraProvider('mainnet', '1efb74c6a48c478298a1b2d68ad4532d');
const signer = new ethers.Wallet(process.env.PINTSWAP_DAEMON_WALLET).connect(provider);

const TIMEOUT_MS = 300e3;

const timeout = async (n) => {
  await new Promise((resolve) => setTimeout(resolve, n));
};

export const runMarketMaker = async ({ tokenA, tokenB }) => {
  while (true) {
    await clearOrderbookForPair({ tokenA, tokenB });
    await postSpread(
      { getsToken: tokenA, givesToken: tokenB },
      0.08,
      5,
      signer,
    );
    await postSpread(
      { getsToken: tokenB, givesToken: tokenA },
      0.08,
      5,
      signer,
    );
    await publishOnce();
    await timeout(TIMEOUT_MS);
  }
};
