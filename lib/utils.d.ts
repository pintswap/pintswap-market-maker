export declare const TIMEOUT_MS = 300000;
export declare const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export declare const timeout: (n?: number) => Promise<void>;
export declare const toHex: (n: number) => string;
export declare const ln: (v: any) => any;
export declare const toProvider: (providerOrSigner: any) => any;
export declare const proxyFetch: (uri: any, config?: any) => Promise<Response>;
export declare const coerceToWeth: (address: any, providerOrSigner: any) => Promise<any>;
