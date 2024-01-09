# pintswap-market-maker

PintSwap market maker process with REST API

## Usage

```sh
npm install -g
export PINTSWAP_DAEMON_PORT=42161 # Or choose your own
export PINTSWAP_DAEMON_HOST=127.0.0.1 # Or choose your own
export WALLET=0x... # Private key starting with 0x
pintswap-market-maker --token-a <address> --token-b <address>
```

## Optional Arguments

```sh
--tolerance <number> # the max percent fluctuation away from market price (Default: 0.08)
--offers <number> # number of offers to post (Default: 5)
--interval <number> # post new offers interval (Default: 5 min)
--amount <number> # amount of token you'd like to trade (Default: uses wallet token balance)
--side <buy | sell | both> # choose what side you would like to market make on (Default: both)
```

## Authors

Guerrilla DEX mafia. Get at me!
