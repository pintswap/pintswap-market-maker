import { BigNumberish, Signer, Wallet, ethers, getAddress, isAddress } from "ethers";
import { createLogger, getLogger } from "./logger";
import { toWETH } from "@pintswap/sdk/lib/trade";
import { TIMEOUT_MS, USDC_ADDRESS, coerceToWeth, proxyFetch, timeout, toHex, toProvider } from "./utils";
import { SIGNER, URI } from "./env";
import { IMarketMaker } from "./types";
import { Pintswap } from "@pintswap/sdk";

const fetch = (global as any).fetch;

const logger = getLogger();

export const add = async ({
  getsAmount,
  givesAmount,
  getsToken,
  givesToken,
}, uri = URI) => {
  logger.info("adding order");
  return (
    await fetch(uri + "/add", {
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

async function publishOnce(uri = URI) {
  return await fetch(uri + "/publish-once", {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
    },
  });
}

export const offers = async (uri = URI) => {
  return (
    await (
      await fetch(uri + "/offers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
      })
    ).json()
  ).result;
};

export const deleteOffer = async ({ id }, uri = URI) => {
  return (
    await fetch(uri + "/delete", {
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
}, uri) => {
  const offerList = await offers(uri);
  logger.info("deleting " + offerList.length + " orders");
  const [gets, gives] = [getsToken, givesToken].map((v) => v?.toLowerCase());
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
    await deleteOffer({ id }, uri);
  }
  logger.info("done");
};

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

export const postSpread = async (
  { getsToken, givesToken },
  tolerance: number = 0.08,
  nOffers: number = 5,
  signer: Signer = SIGNER,
  amount?: string,
  uri = URI
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
  
  let maxOfferAmount: BigNumberish;
  if(amount) {
    if(givesToken === ethers.ZeroAddress) {
      maxOfferAmount = ethers.parseEther(amount);
    } else {
      const decimals = await new ethers.Contract(
        givesToken,
        ['function decimals() view returns (uint8)'],
        signer,
      ).decimals();
      maxOfferAmount = ethers.parseUnits(amount, decimals);
    }
  } else {
    const givesTokenBalance =
    givesToken === ethers.ZeroAddress
      ? await signer.provider.getBalance(await signer.getAddress())
      : await new ethers.Contract(
          givesToken,
          ["function balanceOf(address) view returns (uint256)"],
          signer,
        ).balanceOf(await signer.getAddress());
    maxOfferAmount = givesTokenBalance;
  }

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
        givesAmount: toHex(v * Number(maxOfferAmount)),
        getsToken,
        getsAmount: toHex(
          (v *
            Number(maxOfferAmount) *
            priceMultipliers[i] *
            Number(givesTokenPrice) *
            Math.pow(10, Number(getsTokenDecimals))) /
            (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice)),
        ),
      };
    });

  logger.info("-- posting spread --");
  for (const item of offersToInsert) {
    logger.info(item);
    await add(item, uri);
  }
  logger.info("-- spread posted --");
};

export const postStaticSpread = async (
  { getsToken, givesToken },
  tolerance: number = 0.08,
  startPriceInUsd: number,
  nOffers: number = 5,
  signer: Signer = SIGNER,
  amount?: string,
  uri = URI
) => {
  const givesTokenPrice = BigInt(ethers.parseUnits(Number(startPriceInUsd).toFixed(6), 6));
  const getsTokenPrice = await getFairValue(getsToken, signer);


  const [getsTokenDecimals, givesTokenDecimals] = await Promise.all(
    [getsToken, givesToken].map(async (v) =>
      new ethers.Contract(
        await coerceToWeth(v, signer),
        ["function decimals() view returns (uint8)"],
        signer,
      ).decimals(),
    ),
  );
  
  let maxOfferAmount: BigNumberish;
  if(amount) {
    if(givesToken === ethers.ZeroAddress) {
      maxOfferAmount = ethers.parseEther(amount);
    } else {
      const decimals = await new ethers.Contract(
        givesToken,
        ['function decimals() view returns (uint8)'],
        signer,
      ).decimals();
      maxOfferAmount = ethers.parseUnits(amount, decimals);
    }
  } else {
    const givesTokenBalance =
    givesToken === ethers.ZeroAddress
      ? await signer.provider.getBalance(await signer.getAddress())
      : await new ethers.Contract(
          givesToken,
          ["function balanceOf(address) view returns (uint256)"],
          signer,
        ).balanceOf(await signer.getAddress());
    maxOfferAmount = givesTokenBalance;
  }

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
        givesAmount: toHex(v * Number(maxOfferAmount)),
        getsToken,
        getsAmount: toHex(
          (v *
            Number(maxOfferAmount) *
            priceMultipliers[i] *
            Number(givesTokenPrice) *
            Math.pow(10, Number(getsTokenDecimals))) /
            (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice)),
        ),
      };
    });

  logger.info("-- posting spread --");
  for (const item of offersToInsert) {
    logger.info(item);
    await add(item, uri);
  }
  logger.info("-- spread posted --");
};

export class MarketMaker {
  public isStarted: boolean;
  public uri: string;
  public dcaTokenA: string;
  public dcaTokenB: string;

  constructor({
    uri = URI,
    isStarted = false,
  }: { uri: string; isStarted: boolean; }) {
    Object.assign(this, {
      uri,
      isStarted,
    });
  }

  async staticDca (
    { tokenA, tokenB }, 
    startPriceInUsd: number, 
    tolerance: number = 0.08,
    nOffers: number = 5, 
    signer: Signer = SIGNER,
    side: 'buy' | 'sell' | 'both' = 'both',
    amount?: string,
  ){
    this.dcaTokenA = tokenA;
    this.dcaTokenB = tokenB;
    if(side === 'buy' || side === 'both') {
      await postStaticSpread(
        { getsToken: tokenA, givesToken: tokenB },
        tolerance,
        startPriceInUsd,
        nOffers,
        signer,
        amount,
        this.uri
      );
    }

    if(side === 'sell' || side === 'both') {
      await postStaticSpread(
        { getsToken: tokenB, givesToken: tokenA },
        tolerance,
        startPriceInUsd,
        nOffers,
        signer,
        amount,
        this.uri

      );
    }

    await publishOnce(this.uri);
  }

  async stopStaticDca(){
    const tokenA = this.dcaTokenA;
    const tokenB = this.dcaTokenB;
    await clearOrderbookForPair({ tokenA, tokenB }, this.uri);
  }

  stop() {
    if(!this.isStarted) {
      logger.info('Market Maker not started.')
      return
    };
    return this.isStarted = false;
  }

  async runMarketMaker (
    { tokenA, tokenB }, 
    tolerance: number = 0.08, 
    nOffers: number = 5, 
    signer: Signer = SIGNER,
    interval: number = TIMEOUT_MS,
    side: 'buy' | 'sell' | 'both' = 'both',
    amount?: string,
  ) {
    if(this.isStarted) {
      logger.error('Market Maker already running. Please stop and rerun.')
      return;
    }
    this.isStarted = true;
    while (this.isStarted) {
      await clearOrderbookForPair({ tokenA, tokenB }, this.uri);
  
      if(side === 'buy' || side === 'both') {
        await postSpread(
          { getsToken: tokenA, givesToken: tokenB },
          tolerance,
          nOffers,
          signer,
          amount,
          this.uri
        );
      }
  
      if(side === 'sell' || side === 'both') {
        await postSpread(
          { getsToken: tokenB, givesToken: tokenA },
          tolerance,
          nOffers,
          signer,
          amount,
          this.uri
        );
      }
  
      await publishOnce(this.uri);
      await timeout(interval);
    }
    await clearOrderbookForPair({ tokenA, tokenB }, this.uri);
  };
  // TODO: finish
  // public uri: string;
  // public isStarted: boolean;
  // public side: 'sell' | 'buy' | 'both';
  // public tokenA: string;
  // public tokenB: string;
  // public numberOfOffers: number;
  // public tolerance: number;
  // public interval: number;
  // public amount: string;
  // public price: string;
  // public signer: Signer;
  // public pintswap: Pintswap;
  // public logger: ReturnType<typeof createLogger>;

  // constructor({
  //   uri = URI,
  //   isStarted = false,
  //   side = 'both',
  //   tokenA,
  //   tokenB,
  //   numberOfOffers = 5,
  //   tolerance = 0.08,
  //   interval = TIMEOUT_MS,
  //   amount,
  //   price,
  //   signer = SIGNER,
  // }: IMarketMaker) {
  //   this.logger = logger;
  //   Object.assign(this, {
  //     uri,
  //     isStarted,
  //     side,
  //     tokenA,
  //     tokenB,
  //     numberOfOffers,
  //     tolerance,
  //     interval,
  //     amount,
  //     price,
  //     signer,
  //   });
  // }

  // async setSigner(signer: Signer) {

  // }

  // getSigner() {
  //   return this.signer;
  // }

  // async setInterval(_interval: number) {

  // }

  // async setPair(tokenA: string, tokenB: string) {
  //   if(!isAddress(tokenA)) {
  //     this.logger.error('Token A is not an appropriate address.');
  //     return;
  //   }
  //   if(!isAddress(tokenB)) {
  //     this.logger.error('Token B is not an appropriate address.');
  //     return;
  //   }
  //   this.tokenA = getAddress(tokenA);
  //   this.tokenB = getAddress(tokenB);
  // }

  // getPair() {
  //   return [this.tokenA, this.tokenB];
  // }

  // run() {
  //   if(this.isStarted) {
  //     this.logger.info('Market Maker already started.')
  //     return;
  //   };
  //   return this.isStarted = true;
  // }

  // stop() {
  //   if(!this.isStarted) {
  //     this.logger.info('Market Maker not started.')
  //     return
  //   };
  //   return this.isStarted = false;
  // }
}
