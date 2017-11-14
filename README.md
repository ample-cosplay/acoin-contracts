# AMPLE! Coin(ACO) contracts

ICO contracts of AMPLE! Coin (ACO)
https://acoin.ample-cosplay.com/

[![AMPLE! Coin(ACO)](./logo_ample_coin.png)](https://acoin.ample-cosplay.com/)

## Development

### Setup

Node: v8.2.1

```
$ yarn
```

### Setting for private net

Copy example config files, and modify that.

```
$ cp config/AmpleCoinFund.json{.dist,}
$ cp config/PremiumWallet.json{.dist,}

$ cp config/development/AmpleCoinCrowdsale.json{.dist,}
$ cp config/development/AmpleCoinFund.json{.dist,}
$ cp config/development/PremiumWallet.json{.dist,}
$ cp config/development/genesis.json{.dist,}
```

Make data directory.

```
$ mkdir -p ./var/datadir
```

Create accounts.

```
$ geth --datadir ./var/datadir account new
$ geth --datadir ./var/datadir account new
$ geth --datadir ./var/datadir account new
```

Put above account addresses into your config files.

- `alloc` in `config/development/genesis.json`
- `owners` in `config/development/AmpleCoinFund.json`
- `owners` in `config/development/PremiumWallet.json`

Initialize private net.

```
$ geth init ./config/development/genesis.json --datadir ./var/datadir/
```

### Run RPC

```
$ geth --datadir ./var/datadir \
 --networkid 10 \
 --ipcpath ~/Library/Ethereum/geth.ipc \
 --rpc --rpcaddr "localhost" --rpcport "8545" --rpccorsdomain "*" \
 --mine --minerthreads 4 \
 --unlock 0,1 \
 console 2>> /tmp/geth.log

> miner.start()
```

### Connect

geth

```
$ geth --networkid "10" --nodiscover --datadir ./var/datadir/ console
```

truffle console

```
$ yarn console
```

### Deploy

```
$ yarn compile
$ yarn deploy
```

## truffle console

```
$ yarn console

truffle(development)> AmpleCoinCrowdsale.deployed().then(o => acc = o)

truffle(development)> acc.token()
'0x906add499f07ae3179389097bbfb6299112342d7'

truffle(development)> token = AmpleCoinToken.at('0x906add499f07ae3179389097bbfb6299112342d7')

# ETH balance
truffle(development)> web3.fromWei(web3.eth.getBalance(web3.eth.accounts[1]))
{ [String: '10000'] s: 1, e: 4, c: [ 10000 ] }

# ACO balance
truffle(development)> token.balanceOf(web3.eth.accounts[1])
{ [String: '0'] s: 1, e: 0, c: [ 0 ] }

# buy tokens
truffle(development)> acc.sendTransaction({from: web3.eth.accounts[1], to: web3.eth.accounts[1], value: web3.toWei(10, "ether")})
{ tx: '0xc1f9ed0a9e66ea773ecff53a6791a2b87296b5da69ee4a4c815ffcebbfe1004e',
  receipt:
   { blockHash: '0x2e637fa8816328047fac15157e9ebac17da076126e2acdb2be0d3b8c1034c0c7',
     blockNumber: 2589,
     contractAddress: null,
     cumulativeGasUsed: 97907,
     from: '0x7e19ac4e56ee6362d53fc163a530b2963320eea0',
     gasUsed: 97907,
     logs: [ [Object], [Object], [Object] ],
     logsBloom: '0x00000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000008000000000000000000000000002000000000000000000000020000000000000000000800000000000000400000000010000000040000000000000200080000000000000000000000000000000000000000000000000080000008000000000000000000000000000000000000000000000000000000000002080000000200000002000000000000000000000000000000000020000004000000000000000000000000000000000000000020000000000040000000',
     root: '0xc25256f4a958c02915a273e70b4541bb326df694afab70c0040274295172c862',
     to: '0x1611c6c48ce418c659ffdfdd0b96f780821421b2',
     transactionHash: '0xc1f9ed0a9e66ea773ecff53a6791a2b87296b5da69ee4a4c815ffcebbfe1004e',
     transactionIndex: 0 },
  logs:
   [ { address: '0x1611c6c48ce418c659ffdfdd0b96f780821421b2',
       blockNumber: 2589,
       transactionHash: '0xc1f9ed0a9e66ea773ecff53a6791a2b87296b5da69ee4a4c815ffcebbfe1004e',
       transactionIndex: 0,
       blockHash: '0x2e637fa8816328047fac15157e9ebac17da076126e2acdb2be0d3b8c1034c0c7',
       logIndex: 2,
       removed: false,
       event: 'TokenPurchase',
       args: [Object] } ] }

# ETH balance after payment
truffle(development)> web3.fromWei(web3.eth.getBalance(web3.eth.accounts[1]))
{ [String: '9989.7943953'] s: 1, e: 3, c: [ 9989, 79439530000000 ] }

# ACO balance after payment
truffle(development)> token.balanceOf(web3.eth.accounts[1])
{ [String: '1.65e+22'] s: 1, e: 22, c: [ 165000000 ] }
```

## Thanks

We make use of the below projects as a reference. Thank you very much.

- https://github.com/OpenZeppelin/zeppelin-solidity
- https://github.com/gnosis/MultiSigWallet
- https://github.com/AlisProject/ico-contracts
- https://github.com/trufflesuite/truffle

## License

- [GPL v3](https://www.gnu.org/licenses/gpl-3.0.txt)
