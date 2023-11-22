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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMarketMaker = exports.postSpread = exports.toHex = exports.getFairValue = exports.ln = exports.proxyFetch = exports.toProvider = exports.clearOrderbookForPair = exports.deleteOffer = exports.offers = exports.add = void 0;
const ethers_1 = require("ethers");
const url_1 = __importDefault(require("url"));
const logger_1 = require("./logger");
const trade_1 = require("@pintswap/sdk/lib/trade");
const http_proxy_agent_1 = require("http-proxy-agent");
const fetch = global.fetch;
const logger = (0, logger_1.getLogger)();
const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";
const agent = process.env.PINTSWAP_MARKET_MAKER_PROXY ? new http_proxy_agent_1.HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY) : null;
const coerceToWeth = (address, providerOrSigner) => __awaiter(void 0, void 0, void 0, function* () {
    if (address === ethers_1.ethers.ZeroAddress) {
        const { chainId } = yield (0, exports.toProvider)(providerOrSigner).getNetwork();
        return (0, trade_1.toWETH)(chainId);
    }
    return address;
});
const URI = url_1.default.format({
    protocol: "http:",
    hostname: HOST,
    port: PORT
});
const add = ({ getsAmount, givesAmount, getsToken, givesToken, }) => __awaiter(void 0, void 0, void 0, function* () {
    logger.info("adding order");
    return (yield fetch(URI + "/add", {
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
    })).json();
});
exports.add = add;
function publishOnce() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield fetch(URI + "/publish-once", {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "content-type": "application/json",
            }
        }));
    });
}
const offers = () => __awaiter(void 0, void 0, void 0, function* () {
    return (yield (yield fetch(URI + "/offers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
            "content-type": "application/json",
        },
    })).json()).result;
});
exports.offers = offers;
const deleteOffer = ({ id }) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield fetch(URI + "/delete", {
        method: "POST",
        body: JSON.stringify({
            id,
        }),
        headers: {
            "content-type": "application/json",
        },
    })).json();
});
exports.deleteOffer = deleteOffer;
const clearOrderbookForPair = ({ tokenA: getsToken, tokenB: givesToken, }) => __awaiter(void 0, void 0, void 0, function* () {
    const offerList = yield (0, exports.offers)();
    logger.info("deleting " + offerList.length + " orders");
    const [gets, gives] = [getsToken, givesToken].map((v) => v.toLowerCase());
    const filtered = offerList
        .filter((v) => (v.gets.token.toLowerCase() === gets && v.gives.token.toLowerCase() === gives) ||
        (v.gives.token.toLowerCase() === gets && v.gets.token.toLowerCase() === gives))
        .map((v) => v.id);
    for (const id of filtered) {
        yield (0, exports.deleteOffer)({ id });
    }
    logger.info("done");
});
exports.clearOrderbookForPair = clearOrderbookForPair;
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const toProvider = (providerOrSigner) => {
    if (providerOrSigner.sendTransaction && providerOrSigner.getAddress)
        return providerOrSigner.provider;
    return providerOrSigner;
};
exports.toProvider = toProvider;
const proxyFetch = (uri, config) => __awaiter(void 0, void 0, void 0, function* () {
    config = config && Object.assign({}, config) || { method: 'GET' };
    config.agent = agent || null;
    return yield fetch(uri, config);
});
exports.proxyFetch = proxyFetch;
const ln = (v) => ((console.log(v)), v);
exports.ln = ln;
const getFairValue = (token, providerOrSigner) => __awaiter(void 0, void 0, void 0, function* () {
    if (ethers_1.ethers.getAddress(token) === USDC_ADDRESS)
        return BigInt(1000000);
    if (token === ethers_1.ethers.ZeroAddress)
        token = (0, trade_1.toWETH)((yield (0, exports.toProvider)(providerOrSigner).getNetwork()).chainId);
    const response = yield (yield (0, exports.proxyFetch)("https://api.dexscreener.com/latest/dex/tokens/" + token)).text();
    logger.info(response);
    const responseAsJson = JSON.parse(response);
    const priceUsd = responseAsJson.pairs[0].priceUsd;
    logger.info('fair value of asset is ' + priceUsd);
    return BigInt(ethers_1.ethers.parseUnits(Number(priceUsd).toFixed(6), 6));
});
exports.getFairValue = getFairValue;
const toHex = (n) => {
    return ethers_1.ethers.toBeHex(ethers_1.ethers.getUint(BigInt(Number(Number(n).toFixed(0)))));
};
exports.toHex = toHex;
const postSpread = ({ getsToken, givesToken }, tolerance, nOffers, signer) => __awaiter(void 0, void 0, void 0, function* () {
    const [getsTokenPrice, givesTokenPrice] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () { return (0, exports.getFairValue)(v, signer); })));
    const [getsTokenDecimals, givesTokenDecimals] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () {
        return new ethers_1.ethers.Contract(yield coerceToWeth(v, signer), ["function decimals() view returns (uint8)"], signer).decimals();
    })));
    const givesTokenBalance = givesToken === ethers_1.ethers.ZeroAddress
        ? yield signer.provider.getBalance(yield signer.getAddress())
        : yield new ethers_1.ethers.Contract(givesToken, ["function balanceOf(address) view returns (uint256)"], signer).balanceOf(yield signer.getAddress());
    const priceMultipliers = Array(Number(nOffers) + 1)
        .fill(0)
        .map((_, i) => 1 + i * (Number(tolerance) / Number(nOffers)))
        .slice(1);
    const offersToInsert = priceMultipliers
        .map((v) => Math.pow(v - 1, 2))
        .map((() => {
        let sum;
        return (v, i, ary) => {
            if (!sum)
                sum = ary.reduce((r, v) => r + v, 0);
            return v / sum;
        };
    })())
        .map((v, i) => {
        return {
            givesToken,
            givesAmount: (0, exports.toHex)(v * Number(givesTokenBalance)),
            getsToken,
            getsAmount: (0, exports.toHex)((v *
                Number(givesTokenBalance) *
                priceMultipliers[i] *
                Number(givesTokenPrice)) * Math.pow(10, Number(getsTokenDecimals)) /
                (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice))),
        };
    });
    logger.info("posting spread --");
    for (const item of offersToInsert) {
        logger.info(item);
        yield (0, exports.add)(item);
    }
    logger.info("spread posted!");
});
exports.postSpread = postSpread;
const LLAMA_NODES_KEY = process.env.PROCESS_APP_LLAMA_NODES_KEY || '01HDHGP0YXWDYKRT37QQBDGST5';
const signer = new ethers_1.ethers.Wallet(process.env.PINTSWAP_DAEMON_WALLET).connect(new ethers_1.ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`));
const TIMEOUT_MS = 300e3;
const timeout = (n) => __awaiter(void 0, void 0, void 0, function* () {
    yield new Promise((resolve) => setTimeout(resolve, n));
});
const runMarketMaker = ({ tokenA, tokenB }) => __awaiter(void 0, void 0, void 0, function* () {
    while (true) {
        yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB });
        yield (0, exports.postSpread)({ getsToken: tokenA, givesToken: tokenB }, 0.08, 5, signer);
        yield (0, exports.postSpread)({ getsToken: tokenB, givesToken: tokenA }, 0.08, 5, signer);
        yield publishOnce();
        yield timeout(TIMEOUT_MS);
    }
});
exports.runMarketMaker = runMarketMaker;
//# sourceMappingURL=maker.js.map