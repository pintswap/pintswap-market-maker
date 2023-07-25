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
  const { tokenA, tokenB } = yargs.argv;
  await runMarketMaker({ tokenA, tokenB });
})().catch((err) => logger.error(err));
