// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// solhint-disable-next-line
import "hardhat/console.sol";
import "./erc20-votes.sol";

contract MyTokenTradableVotes is MyTokenVotes {
    uint256 public buyFeePercent;
    uint256 public sellFeePercent;

    event TokensBought(address indexed buyer, uint256 amount, uint256 etherSpent);
    event TokensSold(address indexed seller, uint256 amount, uint256 etherReturned);

    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 votingPeriod_
    ) public virtual override initializer {
        MyTokenVotes.initialize(name_, symbol_, decimals_, initialSupply_, votingPeriod_);

        buyFeePercent = 3;
        sellFeePercent = 5;
    }

    function setBuyFeePercent(uint256 fee) public onlyAdmin {
        buyFeePercent = fee;
    }

    function setSellFeePercent(uint256 fee) public onlyAdmin {
        sellFeePercent = fee;
    }

    function buy() public payable {
        require(msg.value > 0, "Ether required to buy tokens");
        uint256 tokensToBuy = calculateTokensToBuy(msg.value, buyFeePercent);
        _mint(msg.sender, tokensToBuy);
        emit TokensBought(msg.sender, tokensToBuy, msg.value);
    }

    function sell(uint256 amount) public {
        require(amount > 0 && _balances[msg.sender] >= amount, "Insufficient token balance");
        uint256 etherToReturn = calculateEtherToReturn(amount, sellFeePercent);
        require(address(this).balance >= etherToReturn, "Insufficient contract balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(etherToReturn);
        emit TokensSold(msg.sender, amount, etherToReturn);
    }

    function calculateTokensToBuy(uint256 etherAmount, uint256 feePercentage) private view returns (uint256) {
        uint256 fee = (etherAmount * feePercentage) / 100;
        uint256 netEther = etherAmount - fee;
        return (netEther * defaultPrice);
    }

    function calculateEtherToReturn(uint256 tokenAmount, uint256 feePercentage) private view returns (uint256) {
        uint256 fee = (tokenAmount * feePercentage) / 100;
        uint256 netTokens = tokenAmount - fee;
        return (netTokens / defaultPrice);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(_canParticipate(sender, amount), "Not enough free tokens");
        super._transfer(sender, recipient, amount);
    }

    function _approve(address ownerAddress, address spender, uint256 amount) internal override {
        require(_canParticipate(ownerAddress, amount), "Not enough free tokens");
        super._approve(ownerAddress, spender, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "Mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "Burn from the zero address");
        require(_balances[account] >= amount, "Burn amount exceeds balance");
        require(_canParticipate(account, amount), "Not enough free tokens");

        _balances[account] -= amount;
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function _canParticipate(address account, uint256 amount) private view returns (bool) {
        if (currentVote.isFinalized) {
            return true;
        }

        uint256 availableBalance = _voterBalances[account][currentVoteRound];
        return _balances[account] - amount >= availableBalance;
    }
}
