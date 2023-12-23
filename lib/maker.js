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
exports.MarketMaker = exports.postStaticSpread = exports.postSpread = exports.getFairValue = exports.clearOrderbookForPair = exports.deleteOffer = exports.offers = exports.add = void 0;
const ethers_1 = require("ethers");
const logger_1 = require("./logger");
const trade_1 = require("@pintswap/sdk/lib/trade");
const utils_1 = require("./utils");
const env_1 = require("./env");
const fetch = global.fetch;
const logger = (0, logger_1.getLogger)();
const add = ({ getsAmount, givesAmount, getsToken, givesToken, }, uri = env_1.URI) => __awaiter(void 0, void 0, void 0, function* () {
    logger.info("adding order");
    return (yield fetch(uri + "/add", {
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
function publishOnce(uri = env_1.URI) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fetch(uri + "/publish-once", {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "content-type": "application/json",
            },
        });
    });
}
const offers = (uri = env_1.URI) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield (yield fetch(uri + "/offers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
            "content-type": "application/json",
        },
    })).json()).result;
});
exports.offers = offers;
const deleteOffer = ({ id }, uri = env_1.URI) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield fetch(uri + "/delete", {
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
const clearOrderbookForPair = ({ tokenA: getsToken, tokenB: givesToken, }, uri) => __awaiter(void 0, void 0, void 0, function* () {
    const offerList = yield (0, exports.offers)(uri);
    logger.info("deleting " + offerList.length + " orders");
    const [gets, gives] = [getsToken, givesToken].map((v) => v === null || v === void 0 ? void 0 : v.toLowerCase());
    const filtered = offerList
        .filter((v) => (v.gets.token.toLowerCase() === gets &&
        v.gives.token.toLowerCase() === gives) ||
        (v.gives.token.toLowerCase() === gets &&
            v.gets.token.toLowerCase() === gives))
        .map((v) => v.id);
    for (const id of filtered) {
        yield (0, exports.deleteOffer)({ id }, uri);
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
    logger.info("fair value of asset is " + priceUsd);
    return BigInt(ethers_1.ethers.parseUnits(Number(priceUsd).toFixed(6), 6));
});
exports.getFairValue = getFairValue;
const postSpread = ({ getsToken, givesToken }, tolerance = 0.08, nOffers = 5, signer = env_1.SIGNER, amount, uri = env_1.URI) => __awaiter(void 0, void 0, void 0, function* () {
    const [getsTokenPrice, givesTokenPrice] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () { return (0, exports.getFairValue)(v, signer); })));
    const [getsTokenDecimals, givesTokenDecimals] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () {
        return new ethers_1.ethers.Contract(yield (0, utils_1.coerceToWeth)(v, signer), ["function decimals() view returns (uint8)"], signer).decimals();
    })));
    let maxOfferAmount;
    if (amount) {
        if (givesToken === ethers_1.ethers.ZeroAddress) {
            maxOfferAmount = ethers_1.ethers.parseEther(amount);
        }
        else {
            const decimals = yield new ethers_1.ethers.Contract(givesToken, ['function decimals() view returns (uint8)'], signer).decimals();
            maxOfferAmount = ethers_1.ethers.parseUnits(amount, decimals);
        }
    }
    else {
        const givesTokenBalance = givesToken === ethers_1.ethers.ZeroAddress
            ? yield signer.provider.getBalance(yield signer.getAddress())
            : yield new ethers_1.ethers.Contract(givesToken, ["function balanceOf(address) view returns (uint256)"], signer).balanceOf(yield signer.getAddress());
        maxOfferAmount = givesTokenBalance;
    }
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
            givesAmount: (0, utils_1.toHex)(v * Number(maxOfferAmount)),
            getsToken,
            getsAmount: (0, utils_1.toHex)((v *
                Number(maxOfferAmount) *
                priceMultipliers[i] *
                Number(givesTokenPrice) *
                Math.pow(10, Number(getsTokenDecimals))) /
                (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice))),
        };
    });
    logger.info("-- posting spread --");
    for (const item of offersToInsert) {
        logger.info(item);
        yield (0, exports.add)(item, uri);
    }
    logger.info("-- spread posted --");
});
exports.postSpread = postSpread;
const postStaticSpread = ({ getsToken, givesToken }, tolerance = 0.08, startPriceInUsd, nOffers = 5, signer = env_1.SIGNER, amount, uri = env_1.URI) => __awaiter(void 0, void 0, void 0, function* () {
    const givesTokenPrice = BigInt(ethers_1.ethers.parseUnits(Number(startPriceInUsd).toFixed(6), 6));
    const getsTokenPrice = yield (0, exports.getFairValue)(getsToken, signer);
    const [getsTokenDecimals, givesTokenDecimals] = yield Promise.all([getsToken, givesToken].map((v) => __awaiter(void 0, void 0, void 0, function* () {
        return new ethers_1.ethers.Contract(yield (0, utils_1.coerceToWeth)(v, signer), ["function decimals() view returns (uint8)"], signer).decimals();
    })));
    let maxOfferAmount;
    if (amount) {
        if (givesToken === ethers_1.ethers.ZeroAddress) {
            maxOfferAmount = ethers_1.ethers.parseEther(amount);
        }
        else {
            const decimals = yield new ethers_1.ethers.Contract(givesToken, ['function decimals() view returns (uint8)'], signer).decimals();
            maxOfferAmount = ethers_1.ethers.parseUnits(amount, decimals);
        }
    }
    else {
        const givesTokenBalance = givesToken === ethers_1.ethers.ZeroAddress
            ? yield signer.provider.getBalance(yield signer.getAddress())
            : yield new ethers_1.ethers.Contract(givesToken, ["function balanceOf(address) view returns (uint256)"], signer).balanceOf(yield signer.getAddress());
        maxOfferAmount = givesTokenBalance;
    }
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
            givesAmount: (0, utils_1.toHex)(v * Number(maxOfferAmount)),
            getsToken,
            getsAmount: (0, utils_1.toHex)((v *
                Number(maxOfferAmount) *
                priceMultipliers[i] *
                Number(givesTokenPrice) *
                Math.pow(10, Number(getsTokenDecimals))) /
                (Math.pow(10, Number(givesTokenDecimals)) * Number(getsTokenPrice))),
        };
    });
    logger.info("-- posting spread --");
    for (const item of offersToInsert) {
        logger.info(item);
        yield (0, exports.add)(item, uri);
    }
    logger.info("-- spread posted --");
});
exports.postStaticSpread = postStaticSpread;
class MarketMaker {
    constructor({ uri = env_1.URI, isStarted = false, }) {
        Object.assign(this, {
            uri,
            isStarted,
        });
    }
    staticDca({ tokenA, tokenB }, startPriceInUsd, tolerance = 0.08, nOffers = 5, signer = env_1.SIGNER, side = 'both', amount) {
        return __awaiter(this, void 0, void 0, function* () {
            this.dcaTokenA = tokenA;
            this.dcaTokenB = tokenB;
            if (side === 'buy' || side === 'both') {
                yield (0, exports.postStaticSpread)({ getsToken: tokenA, givesToken: tokenB }, tolerance, startPriceInUsd, nOffers, signer, amount, this.uri);
            }
            if (side === 'sell' || side === 'both') {
                yield (0, exports.postStaticSpread)({ getsToken: tokenB, givesToken: tokenA }, tolerance, startPriceInUsd, nOffers, signer, amount, this.uri);
            }
            yield publishOnce(this.uri);
        });
    }
    stopStaticDca() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenA = this.dcaTokenA;
            const tokenB = this.dcaTokenB;
            yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB }, this.uri);
        });
    }
    stop() {
        if (!this.isStarted) {
            logger.info('Market Maker not started.');
            return;
        }
        ;
        return this.isStarted = false;
    }
    runMarketMaker({ tokenA, tokenB }, tolerance = 0.08, nOffers = 5, signer = env_1.SIGNER, interval = utils_1.TIMEOUT_MS, side = 'both', amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isStarted) {
                logger.error('Market Maker already running. Please stop and rerun.');
                return;
            }
            this.isStarted = true;
            while (this.isStarted) {
                yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB }, this.uri);
                if (side === 'buy' || side === 'both') {
                    yield (0, exports.postSpread)({ getsToken: tokenA, givesToken: tokenB }, tolerance, nOffers, signer, amount, this.uri);
                }
                if (side === 'sell' || side === 'both') {
                    yield (0, exports.postSpread)({ getsToken: tokenB, givesToken: tokenA }, tolerance, nOffers, signer, amount, this.uri);
                }
                yield publishOnce(this.uri);
                yield (0, utils_1.timeout)(interval);
            }
            yield (0, exports.clearOrderbookForPair)({ tokenA, tokenB }, this.uri);
        });
    }
    ;
}
exports.MarketMaker = MarketMaker;
//# sourceMappingURL=maker.js.map