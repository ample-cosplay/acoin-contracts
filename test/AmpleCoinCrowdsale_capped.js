import aco from '../utilities/aco';
import ether from './helpers/ether';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import { advanceBlock } from './helpers/advanceToBlock';
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

  const presaleRate = 1650;

  const lessThanCap = ether(cap).div(5);

  // Offered Value / base rate
  // 270000000 / 1100 = 245454
  const tokenCapOfEther = ether(245454);

  // Offered Value / (Presale rate * Volume Second)
  // 270000000 / (1650 * 1.2) = 136363.636363636
  const presaleCapOfEther = ether(136363)

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

  describe('creating a valid capped crowdsale', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should cap of ETH be 245,454', async function () {
      const expect = ether(245454);
      const crowdSaleTokenCap = await this.crowdsale.cap();
      await crowdSaleTokenCap.toNumber().should.be.bignumber.equal(expect);
    });

    it('should cap of AmpleCoinToken be 1,000,000,000', async function () {
      const expect = aco(1000000000);
      const crowdSaleTokenCap = await this.crowdsale.tokenCap();
      await crowdSaleTokenCap.toNumber().should.be.bignumber.equal(expect);
    });
  });

  describe('accepting payments with cap', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should accept payments within cap', async function () {
      const crowdSaleTokenCap = await this.crowdsale.tokenCap();
      await this.crowdsale.send(presaleCapOfEther.minus(lessThanCap)).should.be.fulfilled;
    });

    it('should accept payments just cap', async function () {
      await this.crowdsale.send(presaleCapOfEther.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;
    });

    it('should reject payments outside cap', async function () {
      await this.crowdsale.send(presaleCapOfEther);
      await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments outside cap', async function () {
      await this.crowdsale.send(presaleCapOfEther);

      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: ether(1), from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    it('should reject payments that exceed cap', async function () {
      await this.crowdsale.send(presaleCapOfEther.plus(ether(1))).should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments that exceed cap', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: presaleCapOfEther.plus(ether(1)), from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    it('should not over 1,000,000,000 AmpleCoin token if just cap', async function () {
      await this.crowdsale.send(presaleCapOfEther.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;

      const totalSupply = await new BigNumber(await this.token.totalSupply());
      const actual = await totalSupply.lessThanOrEqualTo(aco(1000000000));

      await actual.should.equal(true);
    });
  });

  describe('ending with cap', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should not be ended if under cap', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(lessThanCap);
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });
  });
});
