import { Signer } from "ethers";

export type ISpreadConfig = {
  pair: { tokenA: string; tokenB: string };
  tolerance: number;
  numberOfOffers: number;
  signer: Signer;
}