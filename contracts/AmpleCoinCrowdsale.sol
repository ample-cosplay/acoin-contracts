pragma solidity ^0.4.15;

import 'zeppelin/contracts/crowdsale/Crowdsale.sol';
import 'zeppelin/contracts/crowdsale/RefundableCrowdsale.sol';
import 'zeppelin/contracts/crowdsale/CappedCrowdsale.sol';
import 'zeppelin/contracts/lifecycle/Pausable.sol';
import 'zeppelin/contracts/token/MintableToken.sol';
import 'zeppelin/contracts/math/SafeMath.sol';
import 'zeppelin/contracts/ownership/Ownable.sol';
import './AmpleCoinToken.sol';

contract AmpleCoinCrowdsale is Crowdsale, Ownable, RefundableCrowdsale, CappedCrowdsale, Pausable {

  uint256 constant RATE_PRE_SALE = 1650;
  uint256 constant VOLUME_DISCOUNT_FIRST = 150 ether;
  uint256 constant VOLUME_DISCOUNT_SECOND = 300 ether;

  uint256 public presaleStartTime;
  uint256 public presaleEndTime;
  uint256 public tokensaleStartTime;
  uint256 public tokensaleEndTime;
  uint256 public tokenCap;

  function AmpleCoinCrowdsale(
  uint256 _startTime,
  uint256 _endTime,
  uint256 _presaleStartTime,
  uint256 _presaleEndTime,
  uint256 _tokensaleStartTime,
  uint256 _tokensaleEndTime,
  uint256 _baseRate,
  address _walletAmpleCoinFund,
  address _walletPremiumWallet,
  uint256 _cap,
  uint256 _tokenCap,
  uint256 _initialAmpleCoinFundBalance,
  uint256 _initialPremiumWalletBalance,
  uint256 _goal
  )
  Crowdsale(_startTime, _endTime, _baseRate, _walletAmpleCoinFund)
  CappedCrowdsale(_cap)
  RefundableCrowdsale(_goal)
  {
    presaleStartTime = _presaleStartTime;
    presaleEndTime = _presaleEndTime;
    tokensaleStartTime = _tokensaleStartTime;
    tokensaleEndTime = _tokensaleEndTime;
    tokenCap = _tokenCap;

    token.mint(_walletAmpleCoinFund, _initialAmpleCoinFundBalance);
    token.mint(_walletPremiumWallet, _initialPremiumWalletBalance);
  }

  function createTokenContract() internal returns (MintableToken) {
    return new AmpleCoinToken();
  }

  function validPurchase() internal constant returns (bool) {
    bool withinTokenCap = token.totalSupply().add(msg.value.mul(getRate())) <= tokenCap;
    return super.validPurchase() && withinTokenCap;
  }

  function hasEnded() public constant returns (bool) {
    bool tokenCapReached = token.totalSupply() >= tokenCap;
    return super.hasEnded() || tokenCapReached;
  }

  function finalization() internal {
    token.transferOwnership(wallet);

    if (goalReached()) {
      vault.close();
    } else {
      vault.enableRefunds();
    }
  }

  function buyTokens(address beneficiary) payable {
    require(!paused);
    require(beneficiary != 0x0);
    require(validPurchase());
    require(saleAccepting());

    uint256 weiAmount = msg.value;

    uint256 tokens = weiAmount.mul(getRate());

    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  function getRate() constant returns (uint256) {
    uint256 currentRate = rate;

    if (isPresale()) {
      currentRate = RATE_PRE_SALE;
    }

    if (isVolumeDiscountSecond()) {
      currentRate = currentRate.add(currentRate.mul(20).div(100));
    } else if (isVolumeDiscountFirst()) {
      currentRate = currentRate.add(currentRate.mul(10).div(100));
    }

    return currentRate;
  }

  function isPresale() internal constant returns (bool) {
    return presaleStartTime <= now && now <= presaleEndTime;
  }

  function isTokensale() internal constant returns (bool) {
    return tokensaleStartTime <= now && now <= tokensaleEndTime;
  }

  function saleAccepting() internal constant returns (bool) {
    return !isDowntime();
  }

  function isDowntime() internal constant returns (bool) {
    return !isPresale() && !isTokensale();
  }

  function isVolumeDiscountFirst() internal constant returns (bool) {
    return VOLUME_DISCOUNT_FIRST <= msg.value;
  }

  function isVolumeDiscountSecond() internal constant returns (bool) {
    return VOLUME_DISCOUNT_SECOND <= msg.value;
  }
}
