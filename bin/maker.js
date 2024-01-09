#!/usr/bin/env node
'use strict';

const { MarketMaker } = require('../lib/maker');
const yargs = require('yargs');
yargs.parserConfiguration({
  'parse-numbers': false
});
const { getLogger } = require('../lib/logger');

const logger = getLogger();

(async () => {
  const { tokenA, tokenB, tolerance, offers, interval, side, amount, chainId } = yargs.argv;
  const marketmaker = new MarketMaker({})
  await marketmaker.runMarketMaker({
    tokens: { tokenA, tokenB }, 
    tolerance: Number(tolerance ?? 0.08), 
    offers: Number(offers ?? 5), 
    signer: undefined,
    interval: Number(interval ?? (300 * 1000)),
    side: side ?? 'both',
    amount: amount ?? '',
    chainId: chainId ?? 1
  });
})().catch((err) => logger.error(err));
