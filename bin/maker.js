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
  const { tokenA, tokenB, tolerance, offers, interval, side, amount } = yargs.argv;
  const marketmaker = new MarketMaker({})
  await marketmaker.runMarketMaker(
    { tokenA, tokenB }, 
    Number(tolerance || 0.08), 
    Number(offers || 5), 
    undefined,
    Number(interval || (300 * 1000)),
    side || 'both',
    amount || ''
  );
})().catch((err) => logger.error(err));
