pragma solidity ^0.4.15;

import 'zeppelin/contracts/token/BasicToken.sol';
import 'zeppelin/contracts/token/BurnableToken.sol';
import 'zeppelin/contracts/math/SafeMath.sol';
import 'zeppelin/contracts/token/MintableToken.sol';


contract AmpleCoinToken is BasicToken, BurnableToken, MintableToken {
  using SafeMath for uint256;

  string public constant name = 'AMPLE! Coin';

  string public constant symbol = 'ACO';

  // Using same decimal value as ETH
  uint public constant decimals = 18;
}
