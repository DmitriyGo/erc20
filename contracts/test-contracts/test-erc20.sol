// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "../erc20/erc20.sol";

contract MyTokenTest is MyToken {
    function initialize(uint256 initialSupply, uint256 votingPeriod) public override initializer {
        MyTokenVoting.initialize(initialSupply, votingPeriod);
    }

    function mint(address account, uint256 amount) public {
        require(account != address(0), "mint to zero address");

        _totalSupply += amount;
        _balances[account] += amount;

        emit Transfer(address(0), account, amount);
    }
}
