"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceToWeth = exports.proxyFetch = exports.toProvider = exports.ln = exports.toHex = exports.timeout = exports.USDC_ADDRESS = exports.TIMEOUT_MS = void 0;
const ethers_1 = require("ethers");
const env_1 = require("./env");
const sdk_1 = require("@pintswap/sdk");
// Constants
exports.TIMEOUT_MS = 30e4;
exports.USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// Helpers
const timeout = (n = exports.TIMEOUT_MS) => __awaiter(void 0, void 0, void 0, function* () {
    yield new Promise((resolve) => setTimeout(resolve, n));
});
exports.timeout = timeout;
const toHex = (n) => {
    return ethers_1.ethers.toBeHex(ethers_1.ethers.getUint(BigInt(Number(Number(n).toFixed(0)))));
};
exports.toHex = toHex;
const ln = (v) => ((console.log(v)), v);
exports.ln = ln;
const toProvider = (providerOrSigner) => {
    if (providerOrSigner.sendTransaction && providerOrSigner.getAddress)
        return providerOrSigner.provider;
    return providerOrSigner;
};
exports.toProvider = toProvider;
const proxyFetch = (uri, config) => __awaiter(void 0, void 0, void 0, function* () {
    config = config && Object.assign({}, config) || { method: 'GET' };
    config.agent = env_1.AGENT || null;
    return yield fetch(uri, config);
});
exports.proxyFetch = proxyFetch;
const coerceToWeth = (address, providerOrSigner) => __awaiter(void 0, void 0, void 0, function* () {
    if (address === ethers_1.ethers.ZeroAddress) {
        const { chainId } = yield (0, exports.toProvider)(providerOrSigner).getNetwork();
        return (0, sdk_1.toWETH)(chainId);
    }
    return address;
});
exports.coerceToWeth = coerceToWeth;
//# sourceMappingURL=utils.js.map