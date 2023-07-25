import "setimmediate";
import { Logger } from "winston";
declare const createLogger: (proc?: string) => Logger;
declare const getLogger: () => any;
export { createLogger, getLogger, Logger };
