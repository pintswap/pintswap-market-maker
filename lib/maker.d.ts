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
export declare const toProvider: (providerOrSigner: any) => any;
export declare const getFairValue: (token: any, providerOrSigner: any) => Promise<bigint>;
export declare const toHex: (n: number) => string;
export declare const postSpread: ({ getsToken, givesToken }: {
    getsToken: any;
    givesToken: any;
}, tolerance: any, nOffers: any, signer: any) => Promise<void>;
export declare const runMarketMaker: ({ tokenA, tokenB }: {
    tokenA: any;
    tokenB: any;
}) => Promise<never>;
