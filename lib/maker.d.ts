import { Signer } from "ethers";
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
export declare class MarketMaker {
    isStarted: boolean;
    uri: string;
    dcaTokenA: string;
    dcaTokenB: string;
    constructor({ uri, isStarted, }: {
        uri: string;
        isStarted: boolean;
    });
    staticDca({ tokenA, tokenB }: {
        tokenA: any;
        tokenB: any;
    }, tolerance?: number, nOffers?: number, signer?: Signer, side?: 'buy' | 'sell' | 'both', amount?: string): Promise<void>;
    stopStaticDca(): Promise<void>;
    stop(): boolean;
    runMarketMaker({ tokenA, tokenB }: {
        tokenA: any;
        tokenB: any;
    }, tolerance?: number, nOffers?: number, signer?: Signer, interval?: number, side?: 'buy' | 'sell' | 'both', amount?: string): Promise<void>;
}
