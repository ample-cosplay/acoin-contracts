pragma solidity ^0.4.15;


import './lib/MultiSigWallet.sol';


/**
 * MultisigWallet contract of AMPLE! Coin.
 */
contract AmpleCoinFund is MultiSigWallet {

  function AmpleCoinFund(address[] _owners, uint _required)
  public
  validRequirement(_owners.length, _required)
  MultiSigWallet(_owners, _required)
  {
  }
}
