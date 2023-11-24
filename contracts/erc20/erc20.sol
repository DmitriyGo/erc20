// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// solhint-disable-next-line
import "hardhat/console.sol";
import "./erc20-voting.sol";

contract MyToken is MyTokenVoting {
    uint256 public buyFeePercent;
    uint256 public sellFeePercent;

    event TokensBought(address indexed buyer, uint256 amount, uint256 etherSpent);
    event TokensSold(address indexed seller, uint256 amount, uint256 etherReturned);

    function initialize(uint256 initialSupply, uint256 votingPeriod) public virtual override initializer {
        MyTokenVoting.initialize(initialSupply, votingPeriod);

        buyFeePercent = 3;
        sellFeePercent = 5;

        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function setBuyFeePercent(uint256 fee) public onlyAdmin {
        buyFeePercent = fee;
    }

    function setSellFeePercent(uint256 fee) public onlyAdmin {
        sellFeePercent = fee;
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address ownerAddress, address spender) external view override returns (uint256) {
        return _allowances[ownerAddress][spender];
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= value, "Insufficient allowance");

        _transfer(from, to, value);
        _approve(from, msg.sender, _allowances[from][msg.sender] - value);
        return true;
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

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "Transfer from the zero address");
        require(recipient != address(0), "Transfer to the zero address");
        require(balanceOf(sender) >= amount, "Transfer amount exceeds balance");
        require(_canParticipate(sender, amount), "Not enough free tokens");

        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address ownerAddress, address spender, uint256 amount) internal {
        require(ownerAddress != address(0), "Approve from the zero address");
        require(spender != address(0), "Approve to the zero address");

        _allowances[ownerAddress][spender] = amount;
        emit Approval(ownerAddress, spender, amount);
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
