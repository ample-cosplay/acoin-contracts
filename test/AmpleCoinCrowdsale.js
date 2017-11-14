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
} from './helpers/aco';

contract('AmpleCoinCrowdsale', ([investor, wallet, purchaser, premiumWallet]) => {
  const someOfEtherAmount = ether(42);
  const presaleRate = 1650;
  const expectedPresaleTokenAmount = new BigNumber(presaleRate).mul(someOfEtherAmount);
  const expectedTokenAmount = new BigNumber(rate).mul(someOfEtherAmount);
  const expectedInitialTokenAmount = expectedPresaleTokenAmount.add(initialAmpleCoinFundBalance).add(initialPremiumWalletBalance);

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

  describe('initialized correctly', () => {
    it('should be correct AmpleCoinFund address', async () => {
      const fund = await AmpleCoinFund.deployed();
      const cs = await AmpleCoinCrowdsale.deployed();
      const expect = await fund.address;
      const actual = await cs.wallet();
      actual.should.be.equal(expect);
    });

    it('should token be instance of AmpleCoinToken', async function () {
      this.token.should.be.an.instanceof(AmpleCoinToken);
    });

    it('should AmpleCoinFund has 700,000,000 tokens.', async function () {
      const expect = aco(700000000);
      const actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });

    it('should PremiumWallet has 30,000,000 tokens.', async function () {
      const expect = aco(30000000);
      const actual = await this.token.balanceOf(premiumWallet);
      await actual.should.be.bignumber.equal(expect);
    });

    it('should total supply be 730,000,000 tokens.', async function () {
      const expect = aco(730000000);
      const actual = await this.token.totalSupply();
      await actual.should.be.bignumber.equal(expect);
    });

    // Offering amount - Premiumsale wallet
    // 300,000,000 - 30,000,000 = 270,000,000
    it('should offering amount be 270,000,000 tokens.', async function () {
      const expect = aco(270000000);
      const totalSupply = await this.token.totalSupply();
      const crowdSaleCap = await this.crowdsale.tokenCap();
      const actual = crowdSaleCap.sub(totalSupply);
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('token owner', () => {
    it('should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });
  });

  describe('accepting payments', () => {
    it('should reject payments before start', async function () {
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { from: purchaser, value: someOfEtherAmount })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments were rejected before start', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    it('should accept payments after start', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });

    it('should accept payments after Pre sale start', async function () {
      await increaseTimeTo(this.presaleStartTime);
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });

    it('should accept payments after Token sale start', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });

    it('should accept payments before Pre sale end -1 minute', async function () {
      await increaseTimeTo(this.presaleEndTime - duration.minutes(1));
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });

    it('should accept payments before Token sale end -1 minute', async function () {
      await increaseTimeTo(this.tokensaleEndTime - duration.minutes(1));
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });

    it('should reject payments after end', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should reject payments Pre sale end', async function () {
      await increaseTimeTo(this.presaleEndTime + 1);
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should reject payments Token sale end', async function () {
      await increaseTimeTo(this.tokensaleEndTime + 1);
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    // before startTime
    // it('should reject payments before Pre sale start -1 minute', async function () {
    //   await increaseTimeTo(this.presaleStartTime - duration.minutes(1));
    //   await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
    //   await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
    //     .should.be.rejectedWith(EVMThrow);
    // });

    it('should reject payments Token sale start -1 minute', async function () {
      await increaseTimeTo(this.tokensaleStartTime - duration.minutes(1));
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments were rejected after end', async function () {
      await increaseTimeTo(this.endTime + 1);
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
  });

  describe('token amount adjustments', () => {
    it('should fund has 700,000,000 tokens even if received ether', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(someOfEtherAmount);
      const expect = aco(700000000);
      const actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });

    // 700,000,000 + 30,000,000 + ( 100 * 1,650 ) = 730,165,000
    it('should total supply be 730,165,000 million tokens after received 100 ether', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(ether(100));
      const expect = aco(730165000);
      const actual = await this.token.totalSupply();
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('high-level purchase', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(someOfEtherAmount);
      event.args.amount.should.be.bignumber.equal(expectedPresaleTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.send(someOfEtherAmount);
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(expectedInitialTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedPresaleTokenAmount);
    });

    it('should not forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });
      const post = web3.eth.getBalance(wallet);
      post.should.be.bignumber.equal(pre);
    });
  });

  describe('low-level purchase', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(someOfEtherAmount);
      event.args.amount.should.be.bignumber.equal(expectedPresaleTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(expectedInitialTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedPresaleTokenAmount);
    });

    it('should not forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const post = web3.eth.getBalance(wallet);
      post.should.be.bignumber.equal(pre);
    });
  });

  describe('ending', () => {
    it('should be opened at the last minute', async function () {
      let ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);

      await increaseTimeTo(this.endTime - duration.seconds(3));
      ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);
    });

    it('should be ended after endTime', async function () {
      let ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);

      await increaseTimeTo(this.endTime + duration.seconds(3));
      ended = await this.crowdsale.hasEnded();
      ended.should.equal(true);
    });
  });
});
