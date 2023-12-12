import { Signer } from "ethers";

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