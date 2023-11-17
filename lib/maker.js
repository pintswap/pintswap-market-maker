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
exports.runMarketMaker = exports.postSpread = exports.getFairValue = exports.clearOrderbookForPair = exports.deleteOffer = exports.offers = exports.add = void 0;
const ethers_1 = require("ethers");
const logger_1 = require("./logger");
const trade_1 = require("@pintswap/sdk/lib/trade");
const utils_1 = require("./utils");
const env_1 = require("./env");
const fetch = global.fetch;
const logger = (0, logger_1.getLogger)();
const add = ({ getsAmount, givesAmount, getsToken, givesToken, }) => __awaiter(void 0, void 0, void 0, function* () {
    logger.info("adding order");
    return (yield fetch(env_1.URI + "/add", {
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
const offers = () => __awaiter(void 0, void 0, void 0, function* () {
    return (yield (yield fetch(env_1.URI + "/offers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
            "content-type": "application/json",
        },
    })).json()).result;
});
exports.offers = offers;
const deleteOffer = ({ id }) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield fetch(env_1.URI + "/delete", {
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
const getFairValue = (token, providerOrSigner) => __awaiter(void 0, void 0, void 0, function* () {
    if (ethers_1.ethers.getAddress(token) === utils_1.USDC_ADDRESS)
        return BigInt(1000000);
    if (token === ethers_1.ethers.ZeroAddress)
        token = (0, trade_1.toWETH)((yield (0, utils_1.toProvider)(providerOrSigner).getNetwork()).chainId);
    const response = yield (yield (0, utils_1.proxyFetch)("https://api.dexscreener.com/latest/dex/tokens/" + token)).text();
    logger.info(response);
    const responseAsJson = JSON.parse(response);
    const priceUsd = responseAsJson.pairs[0].priceUsd;
    logger.info('fair value of asset is ' + priceUsd);
    return BigInt(ethers_1.ethers.parseUnits(Number(priceUsd).toFixed(6), 6));
});
exports.getFairValue = getFairValue;
const postSpread = ({ getsToken, givesToken }, tolerance = 0.08, nOffers = 5, signer = env_1.SIGNER) => __awaiter(void 0, void 0, void 0, function* () {
    const [getsTokenPrice, givesTokenPrice] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () { return (0, exports.getFairValue)(v, signer); })));
    const [getsTokenDecimals, givesTokenDecimals] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () {
        return new ethers_1.ethers.Contract(yield (0, utils_1.coerceToWeth)(v, signer), ["function decimals() view returns (uint8)"], signer).decimals();
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
            givesAmount: (0, utils_1.toHex)(v * Number(givesTokenBalance)),
            getsToken,
            getsAmount: (0, utils_1.toHex)((v *
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
<<<<<<< HEAD
const LLAMA_NODES_KEY = process.env.PROCESS_APP_LLAMA_NODES_KEY || '01HDHGP0YXWDYKRT37QQBDGST5';
const signer = new ethers_1.ethers.Wallet(process.env.PINTSWAP_DAEMON_WALLET).connect(new ethers_1.ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`));
const TIMEOUT_MS = 300e3;
const timeout = (n) => __awaiter(void 0, void 0, void 0, function* () {
    yield new Promise((resolve) => setTimeout(resolve, n));
});
const runMarketMaker = ({ tokenA, tokenB }) => __awaiter(void 0, void 0, void 0, function* () {
=======
const runMarketMaker = ({ tokenA, tokenB }, tolerance = 0.08, nOffers = 5, interval = utils_1.TIMEOUT_MS) => __awaiter(void 0, void 0, void 0, function* () {
>>>>>>> 7a687b1 (update)
    while (true) {
        yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB });
        yield (0, exports.postSpread)({ getsToken: tokenA, givesToken: tokenB }, tolerance, nOffers, env_1.SIGNER);
        yield (0, exports.postSpread)({ getsToken: tokenB, givesToken: tokenA }, tolerance, nOffers, env_1.SIGNER);
        yield (0, utils_1.timeout)(interval);
    }
});
exports.runMarketMaker = runMarketMaker;
//# sourceMappingURL=maker.js.map