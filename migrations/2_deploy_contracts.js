const fs = require('fs');

const AmpleCoinFund = artifacts.require("./AmpleCoinFund.sol");
const PremiumWallet = artifacts.require("./PremiumWallet.sol");
const AmpleCoinCrowdsale = artifacts.require("./AmpleCoinCrowdsale.sol");

function aco(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

module.exports = (deployer, network) => {

  let configPath = __dirname + '/../config';
  try {
    if (fs.statSync(configPath + '/' + network).isDirectory()) {
      configPath = configPath + '/' + network;
    }
  } catch (e) {};
  console.log('configPath: ' + configPath);

  const AmpleCoinFundParams = JSON.parse(fs.readFileSync(configPath + '/AmpleCoinFund.json', 'utf8'));
  const PremiumWalletParams = JSON.parse(fs.readFileSync(configPath + '/PremiumWallet.json', 'utf8'));
  const AmpleCoinCrowdsaleParams = JSON.parse(fs.readFileSync(configPath + '/AmpleCoinCrowdsale.json', 'utf8'));

  deployer.deploy(AmpleCoinFund, AmpleCoinFundParams.owners, AmpleCoinFundParams.required)
    .then(() => {
      return deployer.deploy(PremiumWallet, PremiumWalletParams.owners, PremiumWalletParams.required)
        .then(() => {

          if (network === 'development') {
            const timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 60;
            AmpleCoinCrowdsaleParams.startTime = AmpleCoinCrowdsaleParams.presaleStartTime = timestamp;
            console.log('startTime: ' + AmpleCoinCrowdsaleParams.startTime);
          }

          return deployer.deploy(
            AmpleCoinCrowdsale,
            AmpleCoinCrowdsaleParams.startTime,
            AmpleCoinCrowdsaleParams.endTime,
            AmpleCoinCrowdsaleParams.presaleStartTime,
            AmpleCoinCrowdsaleParams.presaleEndTime,
            AmpleCoinCrowdsaleParams.tokensaleStartTime,
            AmpleCoinCrowdsaleParams.tokensaleEndTime,
            AmpleCoinCrowdsaleParams.rate.base,
            AmpleCoinFund.address,
            PremiumWallet.address,
            web3.toWei(AmpleCoinCrowdsaleParams.cap, 'ether'),
            aco(AmpleCoinCrowdsaleParams.tokenCap),
            aco(AmpleCoinCrowdsaleParams.initialAmpleCoinFundBalance),
            aco(AmpleCoinCrowdsaleParams.initialPremiumWalletBalance),
            web3.toWei(AmpleCoinCrowdsaleParams.goal, 'ether')
          )
        })
    })
};
