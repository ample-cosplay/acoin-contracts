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

contract('AmpleCoinToken', ([wallet, premiumWallet, thirdparty]) => {

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

  describe('burn', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('owner should be able to burn tokens', async function () {
      await this.token.burn(aco(100000000), { from: wallet });

      const balance = await this.token.balanceOf(wallet);
      balance.should.be.bignumber.equal(aco(600000000));

      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(aco(630000000));
    });

    it('owner can burn all tokens', async function () {
      await this.token.burn(aco(700000000), { from: wallet })
        .should.be.fulfilled;
    });

    it('cannot burn more tokens than your balance', async function () {
      await this.token.burn(aco(700000001), { from: wallet })
        .should.be.rejectedWith(EVMThrow);
    });

    it('thirdparty can burn own tokens', async function () {
      await this.crowdsale.buyTokens(thirdparty, { value: ether(1), from: thirdparty }).should.be.fulfilled;
      await this.token.burn(aco(1), { from: thirdparty }).should.be.fulfilled;
    });
  });

});
