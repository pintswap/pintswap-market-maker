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
exports.runMarketMaker = exports.postSpread = exports.toHex = exports.getFairValue = exports.toProvider = exports.clearOrderbookForPair = exports.deleteOffer = exports.offers = exports.add = void 0;
const ethers_1 = require("ethers");
const url_1 = __importDefault(require("url"));
const logger_1 = require("./logger");
const trade_1 = require("@pintswap/sdk/lib/trade");
const querystring_1 = __importDefault(require("querystring"));
const fetch = global.fetch;
const logger = (0, logger_1.getLogger)();
const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";
const coerceToWeth = (address) => {
    if (address === ethers_1.ethers.ZeroAddress)
        return (0, trade_1.toWETH)(1);
    return address;
};
const URI = url_1.default.format({
    protocol: "http:",
    hostname: "127.0.0.1",
    port: 42161,
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
const getFairValue = (token, providerOrSigner) => __awaiter(void 0, void 0, void 0, function* () {
    const provider = (0, exports.toProvider)(providerOrSigner);
    if (ethers_1.ethers.getAddress(token) === ethers_1.ethers.getAddress(USDC_ADDRESS))
        return ethers_1.ethers.parseUnits("1", 6);
    const contract = new ethers_1.ethers.Contract(coerceToWeth(token), ["function decimals() view returns (uint8)"], providerOrSigner);
    const decimals = yield contract.decimals();
    const response = yield (yield fetch("https://api.1inch.io/v4.0/1/quote?" +
        querystring_1.default.stringify({
            src: coerceToWeth(token),
            dst: USDC_ADDRESS,
            amount: ethers_1.ethers.getUint(ethers_1.ethers.parseUnits("1", decimals)).toString(10),
        }), {
        method: "GET",
        headers: {
            "content-type": "application/json",
        },
    })).json();
    logger.info("fair value of " + token + " is " + response.toTokenAmount);
    return BigInt(response.toTokenAmount);
});
exports.getFairValue = getFairValue;
const toHex = (n) => {
    return ethers_1.ethers.toBeHex(ethers_1.ethers.getUint(Number(n).toFixed(0)));
};
exports.toHex = toHex;
const postSpread = ({ getsToken, givesToken }, tolerance, nOffers, signer) => __awaiter(void 0, void 0, void 0, function* () {
    const [getsTokenPrice, givesTokenPrice] = yield Promise.all([getsToken, givesToken].map((v) => (0, exports.getFairValue)(coerceToWeth(v), signer)));
    const [getsTokenDecimals, givesTokenDecimals] = yield Promise.all([getsToken, givesToken].map((v) => new ethers_1.ethers.Contract(coerceToWeth(v), ["function decimals() view returns (uint8)"], signer).decimals()));
    const givesTokenBalance = givesToken === ethers_1.ethers.ZeroAddress
        ? yield signer.provider.getBalance(yield signer.getAddress())
        : yield new ethers_1.ethers.Contract(givesToken, ["function balanceOf(address) view returns (uint256)"], signer).balanceOf(yield signer.getAddress());
    const priceMultipliers = Array(Number(nOffers) + 1)
        .fill(0)
        .map((_, i) => 1 + i * (Number(tolerance) / Number(nOffers)))
        .slice(1);
    console.log(givesTokenDecimals);
    console.log(getsTokenDecimals);
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
const signer = new ethers_1.ethers.Wallet(process.env.WALLET).connect(new ethers_1.ethers.InfuraProvider("mainnet"));
const TIMEOUT_MS = 120e3;
const timeout = (n) => __awaiter(void 0, void 0, void 0, function* () {
    yield new Promise((resolve) => setTimeout(resolve, n));
});
const runMarketMaker = ({ tokenA, tokenB }) => __awaiter(void 0, void 0, void 0, function* () {
    while (true) {
        yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB });
        yield (0, exports.postSpread)({ getsToken: tokenA, givesToken: tokenB }, 0.08, 5, signer);
        yield (0, exports.postSpread)({ getsToken: tokenB, givesToken: tokenA }, 0.08, 5, signer);
        yield timeout(TIMEOUT_MS);
    }
});
exports.runMarketMaker = runMarketMaker;
//# sourceMappingURL=maker.js.map