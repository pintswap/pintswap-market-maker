#!/usr/bin/env node
'use strict';

const { runMarketMaker } = require('../lib/maker');
const yargs = require('yargs');
yargs.parserConfiguration({
  'parse-numbers': false
});
const { getLogger } = require('../lib/logger');

const logger = getLogger();

(async () => {
  const { tokenA, tokenB, tolerance, offers, interval, side } = yargs.argv;
  await runMarketMaker(
    { tokenA, tokenB }, 
    Number(tolerance || 0.08), 
    Number(offers || 5), 
    Number(interval || (300 * 1000)),
    side || 'both'
  );
})().catch((err) => logger.error(err));
