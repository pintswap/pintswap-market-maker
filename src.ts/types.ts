import { Signer, Wallet } from "ethers";

export type ISpreadConfig = {
  pair: { tokenA: string; tokenB: string };
  tolerance: number;
  numberOfOffers: number;
  signer: Signer;
}

export type IMarketMaker = {
  uri: string;
  isStarted: boolean;
  side: 'sell' | 'buy' | 'both';
  tokenA: string;
  tokenB: string;
  numberOfOffers: number;
  tolerance: number;
  interval: number;
  amount: string;
  price: string;
  signer: Signer;
}

export type IMarketMakerMethodConfig = {
  tokens: { tokenA: string; tokenB: string };
  tolerance?: number;
  nOffers?: number;
  signer?: Signer;
  interval?: number;
  side?: 'buy' | 'sell' | 'both';
  amount?: string,
  chainId?: number;
  startPriceInUsd?: number;
}