// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "hardhat/console.sol";

contract VestingSignatureContract is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    mapping(bytes => bool) signatureClaim;
    IERC20 immutable _token;

    constructor(IERC20 vestedToken) Ownable(msg.sender) {
        _token = vestedToken;
    }

    function claimTokens(uint256 amount, uint256 nonce, bytes calldata signature) external {
        require(canClaimTokens(amount, nonce, signature), "sig");
        signatureClaim[signature] = true;
        _token.transfer(msg.sender, amount);
    }

    function canClaimTokens(uint256 amount, uint256 nonce, bytes calldata signature) private view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(msg.sender, amount, nonce, address(this)));
        address recovered = message.recover(signature);
        console.log("recovered", recovered);
        console.log("owner", owner());

        return signatureClaim[signature] == false && message.toEthSignedMessageHash().recover(signature) == owner();
    }
}
