import { Signer, ethers } from "ethers";
import url from "url";
import { getLogger } from "./logger";
import { toWETH } from "@pintswap/sdk/lib/trade";
import { TIMEOUT_MS, USDC_ADDRESS, coerceToWeth, proxyFetch, timeout, toHex, toProvider } from "./utils";
import { SIGNER, URI } from "./env";

const fetch = (global as any).fetch;

const logger = getLogger();

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

export const getFairValue = async (token, providerOrSigner) => {
  if (ethers.getAddress(token) === USDC_ADDRESS) return BigInt(1000000);
  if (token === ethers.ZeroAddress) token = toWETH((await toProvider(providerOrSigner).getNetwork()).chainId);
  const response = await (await proxyFetch("https://api.dexscreener.com/latest/dex/tokens/" + token)).text();
  logger.info(response);
  const responseAsJson = JSON.parse(response);
  const priceUsd = responseAsJson.pairs[0].priceUsd;
  logger.info('fair value of asset is ' + priceUsd);
  return BigInt(ethers.parseUnits(Number(priceUsd).toFixed(6), 6));
};

export const postSpread = async (
  { getsToken, givesToken },
  tolerance: number = 0.08,
  nOffers: number = 5,
  signer: Signer = SIGNER
) => {
  const [getsTokenPrice, givesTokenPrice] = await Promise.all(
    [getsToken, givesToken].map(async (v) => getFairValue(v, signer))
  );
  const [getsTokenDecimals, givesTokenDecimals] = await Promise.all(
    [getsToken, givesToken].map(
      async (v) =>
        new ethers.Contract(
          await coerceToWeth(v, signer),
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

export const runMarketMaker = async (
  { tokenA, tokenB }, 
  tolerance: number = 0.08, 
  nOffers: number = 5, 
  interval: number = TIMEOUT_MS,
  side: 'buy' | 'sell' | 'both' = 'both'
) => {
  while (true) {
    await clearOrderbookForPair({ tokenA, tokenB });
    if(side === 'buy' || side === 'both') {
      await postSpread(
        { getsToken: tokenA, givesToken: tokenB },
        tolerance,
        nOffers,
        SIGNER
      );
    }
    if(side === 'sell' || side === 'both') {
      await postSpread(
        { getsToken: tokenB, givesToken: tokenA },
        tolerance,
        nOffers,
        SIGNER
      );
    }
    await timeout(interval);
  }
};
