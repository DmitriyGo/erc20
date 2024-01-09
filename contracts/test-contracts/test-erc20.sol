// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "../erc20/erc20-tradable-votes.sol";

contract MyTokenTest is MyTokenTradableVotes {
    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 votingPeriod_
    ) public override initializer {
        MyTokenTradableVotes.initialize(name_, symbol_, decimals_, initialSupply_, votingPeriod_);
    }

    function mint(address account, uint256 amount) public {
        require(account != address(0), "mint to zero address");

        _totalSupply += amount;
        _balances[account] += amount;

        emit Transfer(address(0), account, amount);
    }
}
