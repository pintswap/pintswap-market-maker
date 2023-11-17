import { Signer } from "ethers";
export declare const add: ({ getsAmount, givesAmount, getsToken, givesToken, }: {
    getsAmount: any;
    givesAmount: any;
    getsToken: any;
    givesToken: any;
}) => Promise<any>;
export declare const offers: () => Promise<any>;
export declare const deleteOffer: ({ id }: {
    id: any;
}) => Promise<any>;
export declare const clearOrderbookForPair: ({ tokenA: getsToken, tokenB: givesToken, }: {
    tokenA: any;
    tokenB: any;
}) => Promise<void>;
export declare const getFairValue: (token: any, providerOrSigner: any) => Promise<bigint>;
export declare const postSpread: ({ getsToken, givesToken }: {
    getsToken: any;
    givesToken: any;
}, tolerance?: number, nOffers?: number, signer?: Signer) => Promise<void>;
export declare const runMarketMaker: ({ tokenA, tokenB }: {
    tokenA: any;
    tokenB: any;
}, tolerance?: number, nOffers?: number, interval?: number) => Promise<never>;
