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

contract('AmpleCoinCrowdsale', ([owner, wallet, premiumWallet, thirdparty]) => {
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

  describe('finalize', () => {
    it('can be finalized by owner after ending', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });

    it('logs finalized', async function () {
      await increaseTimeTo(this.endTime + 1);
      const { logs } = await this.crowdsale.finalize({ from: owner });
      const event = logs.find(e => e.event === 'Finalized');
      should.exist(event);
    });

    it('do not finishes minting of token', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      const finished = await this.token.mintingFinished();
      finished.should.equal(false);
    });

    it('should able to minting token by wallet', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const beforeBalance = await this.token.balanceOf(wallet);
      await this.token.mint(wallet, aco(100), { from: wallet });
      const afterBalance = await this.token.balanceOf(wallet);
      const expect = await beforeBalance.plus(aco(100));
      await afterBalance.should.be.bignumber.equal(expect);
    });

    it('should able to minting token to thirdparty by wallet', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      const beforeBalance = await this.token.balanceOf(thirdparty);
      await this.token.mint(thirdparty, aco(100), { from: wallet });
      const afterBalance = await this.token.balanceOf(thirdparty);
      const expect = await beforeBalance.plus(aco(100));
      await afterBalance.should.be.bignumber.equal(expect);
    });

    it('should reject minting token by thirdparty', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      await this.token.mint(wallet, aco(100), { from: thirdparty }).should.be.rejectedWith(EVMThrow);
    });

    it('should change owner of AmpleCoinToken to AmpleCoinFund', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      const actual = await this.token.owner();
      actual.should.equal(wallet);
    });
  });

  describe('remaining tokens', () => {
    it('should store to AmpleCoin fund if tokens are remain', async function () {
      await increaseTimeTo(this.startTime);

      // ether * rate = sold amount
      // 100,000 * 1,650 * 1.2 = 198,000,000
      await this.crowdsale.send(ether(100000));

      // Offering amount - sold amount = remain
      // 270,000,000 - 198,000,000 = 72,000,000
      const remainingTokens = aco(0);

      let expect = aco(700000000);
      let actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);

      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      expect = expect.plus(remainingTokens);
      actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });

    it('should not care about goal, to keep code simple', async function () {
      let expect = aco(700000000);
      let actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);

      const goalReached = await this.crowdsale.goalReached();
      await goalReached.should.equal(false);

      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });

      expect = aco(700000000);
      actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('reject finalize', () => {
    it('cannot be finalized before ending', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMThrow);
    });

    it('cannot be finalized by third party after ending', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: thirdparty }).should.be.rejectedWith(EVMThrow);
    });

    it('cannot be finalized twice', async function () {
      await increaseTimeTo(this.endTime + 1);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMThrow);
    });
  });
});
