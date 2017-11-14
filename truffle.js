require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4712388,
      gasPrice: 2100000000000
    },
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4712388,
      gasPrice: 2100000000000
    },
    coverage: {
      host: "localhost",
      port: 8555,
      network_id: "*",
      gas: 0xfffffffffff,
      gasPrice: 0x01
    },
    rinkeby: {
      host: "localhost",
      port: 8544,
      network_id: 4,
      gas: 4712388,
      gasPrice: 21000000000
    },
    live: {
      network_id: 1,
      host: "localhost",
      port: 8545,
      gas: 4712388,
      gasPrice: 21000000000
    }
  }
};
