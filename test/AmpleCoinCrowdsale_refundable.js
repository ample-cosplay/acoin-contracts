import aco from '../utilities/aco';
import ether from './helpers/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

import {
  AmpleCoinToken,
  AmpleCoinFund,
  PremiumWallet,
  AmpleCoinCrowdsale,
  BigNumber,
  cap,
  tokenCap,
  rate,
  startTime,
  endTime,
  presaleStartTime,
  presaleEndTime,
  tokensaleStartTime,
  tokensaleEndTime,
  initialAmpleCoinFundBalance,
  initialPremiumWalletBalance,
  should,
  goal,
  setTimeToDeployable,
  setTimeToStart,
  currentTimestamp
} from './helpers/aco';

contract('AmpleCoinCrowdsale', ([owner, wallet, premiumWallet, investor, notInvestor]) => {
  const someOfEtherAmount = ether(42);
  const presaleRate = 1650;
  const expectedPresaleTokenAmount = new BigNumber(presaleRate).mul(someOfEtherAmount);
  const expectedTokenAmount = new BigNumber(rate).mul(someOfEtherAmount);
  const expectedInitialTokenAmount = expectedPresaleTokenAmount.add(initialAmpleCoinFundBalance).add(initialPremiumWalletBalance);

  const lessThanGoal = ether(goal).minus(ether(1));

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async function () {
    const now = latestTime();
    this.startTime          = now + duration.seconds(5);
    this.endTime            = this.startTime + (endTime            - startTime);
    this.presaleStartTime   = this.startTime + (presaleStartTime   - startTime);
    this.presaleEndTime     = this.startTime + (presaleEndTime     - startTime);
    this.tokensaleStartTime = this.startTime + (tokensaleStartTime - startTime);
    this.tokensaleEndTime   = this.startTime + (tokensaleEndTime   - startTime);

    this.crowdsale = await AmpleCoinCrowdsale.new(
      this.startTime,
      this.endTime,
      this.presaleStartTime,
      this.presaleEndTime,
      this.tokensaleStartTime,
      this.tokensaleEndTime,
      rate,
      wallet,
      premiumWallet,
      ether(cap),
      aco(tokenCap),
      initialAmpleCoinFundBalance,
      initialPremiumWalletBalance,
      ether(goal)
    );
    this.token = AmpleCoinToken.at(await this.crowdsale.token());
  });

  describe('creating a valid refundable crowdsale', () => {
    it('should goal be 10 ETH', async function () {
      await increaseTimeTo(this.startTime);
      const expect = ether(10);
      const actual = await this.crowdsale.goal();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should has enough AmpleCoin token to reach the goal', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should goal unit be wei(not ether)', async () => {
      const target = await AmpleCoinCrowdsale.deployed();
      const actual = await target.goal();
      actual.should.be.bignumber.equal(ether(goal));
    });
  });

  describe('deny refunds', () => {
    it('should deny refunds before end', async function () {
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
      await increaseTimeTo(this.startTime - 1);
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should deny refunds after end if goal was reached', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should deny refunds after end if goal was exceeded', async function () {
      await increaseTimeTo(this.startTime);
      const exceeded = ether(goal).plus(ether(100));
      await this.crowdsale.sendTransaction({ value: exceeded, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should deny refunds if cap was reached', async function () {
      await increaseTimeTo(this.startTime);

      const capReachingAmount = await ether(125000);
      await this.crowdsale.sendTransaction({ value: capReachingAmount, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should goalReached() be true', async function () {
      await increaseTimeTo(this.startTime);
      const exceeded = ether(goal).plus(ether(100));
      await this.crowdsale.sendTransaction({ value: exceeded, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const actual = await this.crowdsale.goalReached();

      await actual.should.equal(true);
    });
  });

  describe('allow refunds', () => {
    it('should allow refunds after end if goal was not reached', async function () {
      const beforeSend = web3.eth.getBalance(investor);

      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction(
        { value: lessThanGoal, from: investor, gasPrice: 0 });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const sent = web3.eth.getBalance(investor);
      await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 })
        .should.be.fulfilled;
      const afterClaim = web3.eth.getBalance(investor);

      await beforeSend.should.be.bignumber.equal(afterClaim);
      await afterClaim.minus(sent).should.be.bignumber.equal(lessThanGoal);
    });

    it('should allow refunds after end if goal was only 1 ether missing', async function () {
      await increaseTimeTo(this.startTime);
      const onlyOneEtherMissing = ether(goal).minus(ether(1));
      await this.crowdsale.sendTransaction({ value: onlyOneEtherMissing, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const pre = web3.eth.getBalance(investor);
      await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(investor);

      post.minus(pre).should.be.bignumber.equal(onlyOneEtherMissing);
    });

    it('should return 0 ether to non investors', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const pre = web3.eth.getBalance(notInvestor);
      await this.crowdsale.claimRefund({ from: notInvestor, gasPrice: 0 })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(notInvestor);

      post.should.be.bignumber.equal(pre);
    });

    it('should goalReached() be false', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const actual = await this.crowdsale.goalReached();

      actual.should.equal(false);
    });
  });

  describe('goal was reached', () => {
    it('should forward funds to wallet after end', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      await increaseTimeTo(this.endTime + 1);

      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.finalize({ from: owner });
      const post = web3.eth.getBalance(wallet);

      post.minus(pre).should.be.bignumber.equal(ether(goal));
    });
  });
});
