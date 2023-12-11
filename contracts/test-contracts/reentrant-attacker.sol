pragma solidity ^0.8.20;

import "../erc20/erc20-tradable-votes.sol";

contract ReentrantAttacker {
    MyTokenTradableVotes public myToken;
    address public owner;

    constructor(address _myTokenAddress) {
        myToken = MyTokenTradableVotes(_myTokenAddress);
        owner = msg.sender;
    }

    function attack(uint256 amount) public {
        myToken.sell(amount);
    }

    fallback() external payable {
        if (address(myToken).balance >= 1 ether) {
            myToken.sell(1 ether);
        }
    }

    receive() external payable {
        if (address(myToken).balance >= 1 ether) {
            myToken.sell(1 ether);
        }
    }
}
