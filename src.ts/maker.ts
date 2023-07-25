import { ethers } from "ethers";
import path from "path";
import url from "url";
import { getLogger } from "./logger";
import { toWETH } from "@pintswap/sdk/lib/trade";
import qs from "querystring";
const fetch = (global as any).fetch;

const logger = getLogger();

const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";

const coerceToWeth = (address) => {
  if (address === ethers.ZeroAddress) return toWETH(1);
  return address;
};

const URI = url.format({
  protocol: "http:",
  hostname: "127.0.0.1",
  port: 42161,
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
        (v.gets.token.toLowerCase() === gets && v.gives.token.toLowerCase() === gives) ||
        (v.gives.token.toLowerCase() === gets && v.gets.token.toLowerCase() === gives)
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

export const getFairValue = async (token, providerOrSigner) => {
  const provider = toProvider(providerOrSigner);
  if (ethers.getAddress(token) === ethers.getAddress(USDC_ADDRESS))
    return ethers.parseUnits("1", 6);
  const contract = new ethers.Contract(
    coerceToWeth(token),
    ["function decimals() view returns (uint8)"],
    providerOrSigner
  );
  const decimals = await contract.decimals();
  const response = await (
    await fetch(
      "https://api.1inch.io/v4.0/1/quote?" +
        qs.stringify({
          src: coerceToWeth(token),
          dst: USDC_ADDRESS,
          amount: ethers.getUint(ethers.parseUnits("1", decimals)).toString(10),
        }),
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      }
    )
  ).json();
  logger.info("fair value of " + token + " is " + response.toTokenAmount);
  return BigInt(response.toTokenAmount);
};

export const toHex = (n: number) => {
  return ethers.toBeHex(ethers.getUint(Number(n).toFixed(0)));
};

export const postSpread = async (
  { getsToken, givesToken },
  tolerance,
  nOffers,
  signer
) => {
  const [getsTokenPrice, givesTokenPrice] = await Promise.all(
    [getsToken, givesToken].map((v) => getFairValue(coerceToWeth(v), signer))
  );
  const [getsTokenDecimals, givesTokenDecimals] = await Promise.all(
    [getsToken, givesToken].map(
      (v) =>
        new ethers.Contract(
          coerceToWeth(v),
          ["function decimals() view returns (uint8)"],
          signer
        ).decimals()
    )
  );
  const givesTokenBalance =
    givesToken === ethers.ZeroAddress
      ? await signer.provider.getBalance(await signer.getAddress())
      : await new ethers.Contract(
          givesToken,
          ["function balanceOf(address) view returns (uint256)"],
          signer
        ).balanceOf(await signer.getAddress());
  const priceMultipliers = Array(Number(nOffers) + 1)
    .fill(0)
    .map((_, i) => 1 + i * (Number(tolerance) / Number(nOffers)))
    .slice(1);
    console.log(givesTokenDecimals);
    console.log(getsTokenDecimals);
  const offersToInsert = priceMultipliers
    .map((v) => Math.pow(v - 1, 2))
    .map(
      (() => {
        let sum;
        return (v, i, ary) => {
          if (!sum) sum = ary.reduce((r, v) => r + v, 0);
          return v / sum;
        };
      })()
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
            Number(givesTokenPrice))*Math.pow(10, Number(getsTokenDecimals)) /
            (Math.pow(10, Number(givesTokenDecimals))*Number(getsTokenPrice))
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

const signer = new ethers.Wallet(process.env.WALLET).connect(
  new ethers.InfuraProvider("mainnet")
);

const TIMEOUT_MS = 120e3;

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
      signer
    );
    await postSpread(
      { getsToken: tokenB, givesToken: tokenA },
      0.08,
      5,
      signer
    );
    await timeout(TIMEOUT_MS);
  }
};
