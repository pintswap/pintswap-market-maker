import { ethers } from "ethers";
import { HttpProxyAgent } from "http-proxy-agent";
import url from "url";

const LLAMA_NODES_KEY =
  process.env.PROCESS_APP_LLAMA_NODES_KEY || "01HDHGP0YXWDYKRT37QQBDGST5";
// const provider = new ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`);
// const provider = new ethers.AlchemyProvider(`mainnet`, `KsA01_UT0zpC1_F11oCf25sblF1ZCVdb`);
export const PROVIDER = new ethers.InfuraProvider('mainnet', '1efb74c6a48c478298a1b2d68ad4532d');

function walletFromEnv() { 
const WALLET = process.env.PINTSWAP_DAEMON_WALLET;
  if (!WALLET) {
    return ethers.Wallet.createRandom();
  }
  return new ethers.Wallet(WALLET);
}
    
export const SIGNER = walletFromEnv().connect(PROVIDER);

export const PORT = process.env.PINTSWAP_DAEMON_PORT || 42161;

export const HOST = process.env.PINTSWAP_DAEMON_HOST || "127.0.0.1";

export const AGENT = process.env.PINTSWAP_MARKET_MAKER_PROXY ? new HttpProxyAgent(process.env.PINTSWAP_MARKET_MAKER_PROXY) : null;

export const URI = url.format({
  protocol: "http:",
  hostname: HOST,
  port: PORT
});
