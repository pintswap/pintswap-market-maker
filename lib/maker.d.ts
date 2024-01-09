import { Signer } from "ethers";
import { IMarketMakerMethodConfig } from "./types";
export declare const add: ({ getsAmount, givesAmount, getsToken, givesToken, }: {
    getsAmount: any;
    givesAmount: any;
    getsToken: any;
    givesToken: any;
}, uri?: string) => Promise<any>;
export declare const offers: (uri?: string) => Promise<any>;
export declare const deleteOffer: ({ id }: {
    id: any;
}, uri?: string) => Promise<any>;
export declare const clearOrderbookForPair: ({ tokenA: getsToken, tokenB: givesToken, }: {
    tokenA: any;
    tokenB: any;
}, uri: any) => Promise<void>;
export declare const getFairValue: (token: any, providerOrSigner: any) => Promise<bigint>;
export declare const postSpread: ({ getsToken, givesToken }: {
    getsToken: any;
    givesToken: any;
}, tolerance?: number, nOffers?: number, signer?: Signer, amount?: string, uri?: string) => Promise<void>;
export declare const postStaticSpread: ({ getsToken, givesToken }: {
    getsToken: any;
    givesToken: any;
}, tolerance: number, startPriceInUsd: number, nOffers?: number, signer?: Signer, amount?: string, uri?: string) => Promise<void>;
export declare function ensureChainId(chainId: number, signer: Signer): Promise<void>;
export declare class MarketMaker {
    isStarted: boolean;
    uri: string;
    dcaTokenA: string;
    dcaTokenB: string;
    chainId: number;
    constructor({ uri, isStarted, chainId, }: {
        uri: string;
        isStarted: boolean;
        chainId: number;
    });
    staticDca({ tokens, startPriceInUsd, tolerance, nOffers, signer, side, amount, chainId }: IMarketMakerMethodConfig): Promise<void>;
    stopStaticDca(): Promise<void>;
    stop(): boolean;
    runMarketMaker({ tokens, tolerance, nOffers, signer, interval, side, amount, chainId }: IMarketMakerMethodConfig): Promise<void>;
}
