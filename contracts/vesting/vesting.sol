// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract VestingContract is Ownable {
    struct VestingInfo {
        uint256 amount;
        uint256 fundedTimestamp;
    }

    IERC20 immutable _token;
    mapping(address => VestingInfo) public vestingInfo;

    event TokensClaimed(address indexed claimant, uint256 amount);

    constructor(IERC20 vestedToken) Ownable(msg.sender) {
        _token = vestedToken;
    }

    function vestTokensMany(address[] calldata toArray, uint256[] calldata amountArray) external onlyOwner {
        require(toArray.length == amountArray.length, "Array lengths mismatch");
        for (uint256 i = 0; i < toArray.length; i++) {
            vestingInfo[toArray[i]] = VestingInfo({amount: amountArray[i], fundedTimestamp: block.timestamp});
        }
    }

    function claimTokens(uint256 amount) external {
        require(canClaimTokens(amount), "Cannot claim yet");
        vestingInfo[msg.sender].amount -= amount;
        // _token.transfer(msg.sender, amount);

        emit TokensClaimed(msg.sender, amount);
    }

    function canClaimTokens(uint256 amount) private view returns (bool) {
        VestingInfo memory info = vestingInfo[msg.sender];
        return block.timestamp >= info.fundedTimestamp + 2 * 365 days && info.amount >= amount;
    }
}
