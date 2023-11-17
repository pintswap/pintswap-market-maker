"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.URI = exports.AGENT = exports.HOST = exports.PORT = exports.SIGNER = void 0;
const ethers_1 = require("ethers");
const http_proxy_agent_1 = require("http-proxy-agent");
const url_1 = __importDefault(require("url"));
exports.SIGNER = new ethers_1.ethers.Wallet(process.env.PINTSWAP_DAEMON_WALLET).connect(new ethers_1.ethers.InfuraProvider("mainnet"));
exports.PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
exports.HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";
exports.AGENT = process.env.PINTSWAP_MARKET_MAKER_PROXY ? new http_proxy_agent_1.HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY) : null;
exports.URI = url_1.default.format({
    protocol: "http:",
    hostname: exports.HOST,
    port: exports.PORT
});
//# sourceMappingURL=env.js.map