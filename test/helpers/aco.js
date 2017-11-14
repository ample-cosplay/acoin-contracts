import aco from '../../utilities/aco';
import { increaseTimeTo, duration } from './increaseTime';
import latestTime from './latestTime'
import ether from './ether'

const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiBigNumber = require('chai-bignumber');

const crowdsaleParams = JSON.parse(fs.readFileSync('./config/AmpleCoinCrowdsale.json', 'utf8'));

export const BigNumber = web3.BigNumber;
export const should = chai
  .use(chaiAsPromised)
  .use(chaiBigNumber(BigNumber))
  .should();

export const AmpleCoinToken = artifacts.require('AmpleCoinToken.sol');
export const AmpleCoinFund = artifacts.require('AmpleCoinFund.sol');
export const PremiumWallet = artifacts.require('PremiumWallet.sol');
export const AmpleCoinCrowdsale = artifacts.require('AmpleCoinCrowdsale.sol');
export const startTime = crowdsaleParams.startTime;
export const endTime = crowdsaleParams.endTime;
export const presaleStartTime = crowdsaleParams.presaleStartTime;
export const presaleEndTime = crowdsaleParams.presaleEndTime;
export const tokensaleStartTime = crowdsaleParams.tokensaleStartTime;
export const tokensaleEndTime = crowdsaleParams.tokensaleEndTime;
export const cap = crowdsaleParams.cap;
export const tokenCap = crowdsaleParams.tokenCap;
export const rate = crowdsaleParams.rate.base;
export const initialAmpleCoinFundBalance = aco(crowdsaleParams.initialAmpleCoinFundBalance);
export const initialPremiumWalletBalance = aco(crowdsaleParams.initialPremiumWalletBalance);
export const goal = crowdsaleParams.goal;
