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

contract('AmpleCoinCrowdsale', ([investor, owner, wallet, purchaser, premiumWallet]) => {

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

  describe('Pre sale', () => {
    const someOfEtherAmount = ether(10);

    it('should reject payments if before presaleStartTime', async function () {
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments were rejected', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    it('should accept payments if after presaleStartTime', async function () {
      await increaseTimeTo(this.presaleStartTime);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.fulfilled;
    });

    it('should accept payments 10 ETH / 16,500 tokens', async function () {
      await increaseTimeTo(this.presaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 10 * 1650 = 16500
      afterAco.should.be.bignumber.equal(aco(16500));
    });

    it('should accept payments 149.99 ETH / 247,483.5 tokens', async function () {
      await increaseTimeTo(this.presaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(149.99), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 149.99 * 1650 = 247483.5
      afterAco.should.be.bignumber.equal(aco(247483.5));
    });

    it('should accept payments 150 ETH / 272,250 tokens (Volume discount first)', async function () {
      await increaseTimeTo(this.presaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(150), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 150 * (1650 * 1.1) = 272250
      afterAco.should.be.bignumber.equal(aco(272250));
    });

    it('should accept payments 299.99 ETH / 544,481.85 tokens (Volume discount first)', async function () {
      await increaseTimeTo(this.presaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(299.99), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 299.99 * (1650 * 1.1) = 544481.85
      afterAco.should.be.bignumber.equal(aco(544481.85));
    });

    it('should accept payments 300 ETH / 594,000 tokens (Volume discount second)', async function () {
      await increaseTimeTo(this.presaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(300), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 300 * (1650 * 1.2) = 594000
      afterAco.should.be.bignumber.equal(aco(594000));
    });
  });

  describe('Token sale', () => {
    const someOfEtherAmount = ether(10);

    it('should reject payments if before tokensaleStartTime', async function () {
      await increaseTimeTo(this.tokensaleStartTime - 10);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments were rejected', async function () {
      await increaseTimeTo(this.tokensaleStartTime - 3);
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    it('should accept payments if after tokensaleStartTime', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.fulfilled;
    });

    it('should accept payments 10 ETH / 11,000 token', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 10 * 1100 = 11000
      afterAco.should.be.bignumber.equal(aco(11000));
    });

    it('should accept payments 149.99 ETH / 164989 tokens', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(149.99), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 149.99 * 1100 = 164989
      afterAco.should.be.bignumber.equal(aco(164989));
    });

    it('should accept payments 150 ETH / 181,500 tokens (Volume discount first)', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(150), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 150 * (1100 * 1.1) = 181500
      afterAco.should.be.bignumber.equal(aco(181500));
    });

    it('should accept payments 299.99 ETH / 362987.9 tokens (Volume discount first)', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(299.99), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 299.99 * (1100 * 1.1) = 362987.9
      afterAco.should.be.bignumber.equal(aco(362987.9));
    });

    it('should accept payments 300 ETH / 396,000 tokens (Volume discount second)', async function () {
      await increaseTimeTo(this.tokensaleStartTime);
      const beforeAco = await this.token.balanceOf(investor);
      beforeAco.should.be.bignumber.equal(0);

      await this.crowdsale.buyTokens(investor, { value: ether(300), from: purchaser })
        .should.be.fulfilled;
      const afterAco = await this.token.balanceOf(investor);

      // 300 * (1100 * 1.2) = 396000
      afterAco.should.be.bignumber.equal(aco(396000));
    });
  });
});
