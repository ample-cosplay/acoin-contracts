pragma solidity ^0.4.15;


import './lib/MultiSigWallet.sol';


/**
 * MultisigWallet contract of AMPLE! Coin.
 * Use to send token to users of Premium sale.
 */
contract PremiumWallet is MultiSigWallet {

  function PremiumWallet(address[] _owners, uint _required)
  public
  validRequirement(_owners.length, _required)
  MultiSigWallet(_owners, _required)
  {
  }
}
