"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.URI = exports.AGENT = exports.HOST = exports.PORT = exports.SIGNER = exports.PROVIDER = void 0;
const ethers_1 = require("ethers");
const http_proxy_agent_1 = require("http-proxy-agent");
const url_1 = __importDefault(require("url"));
const LLAMA_NODES_KEY = process.env.PROCESS_APP_LLAMA_NODES_KEY || "01HDHGP0YXWDYKRT37QQBDGST5";
// const provider = new ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`);
// const provider = new ethers.AlchemyProvider(`mainnet`, `KsA01_UT0zpC1_F11oCf25sblF1ZCVdb`);
exports.PROVIDER = new ethers_1.ethers.InfuraProvider('mainnet', '1efb74c6a48c478298a1b2d68ad4532d');
function walletFromEnv() {
    const WALLET = process.env.PINTSWAP_DAEMON_WALLET;
    if (!WALLET) {
        return ethers_1.ethers.Wallet.createRandom();
    }
    return new ethers_1.ethers.Wallet(WALLET);
}
exports.SIGNER = walletFromEnv().connect(exports.PROVIDER);
exports.PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;
exports.HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";
exports.AGENT = process.env.PINTSWAP_MARKET_MAKER_PROXY ? new http_proxy_agent_1.HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY) : null;
exports.URI = url_1.default.format({
    protocol: "http:",
    hostname: exports.HOST,
    port: exports.PORT
});
//# sourceMappingURL=env.js.map