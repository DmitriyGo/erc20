// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// solhint-disable-next-line
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract MyToken is IERC20, Initializable, AccessControlUpgradeable {
    struct Vote {
        mapping(uint256 => uint256) totalVotesForPrice;
        mapping(address => uint256) votingBalance;
        uint256 leadingPrice;
        uint256 maxVotingPower;
        uint256 voteEndTime;
        bool finalized;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant SECONDS_IN_A_DAY = 86400; // 24 * 60 * 60
    uint256 public buyFeePercentage;
    uint256 public sellFeePercentage;
    uint256 public minTokenAmountToInitiateVote;
    uint256 public minTokenAmountToVote;
    uint256 public timeToVote;
    address public owner;
    uint256 public currentVoteIndex;
    Vote public currentVote;

    uint256 private _defaultPrice;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event VoteStarted(uint256 indexed voteIndex, uint256 proposedPrice, address indexed initiator);
    event Voted(uint256 indexed voteIndex, uint256 price, uint256 amount, address indexed voter);
    event VoteFinalized(uint256 indexed voteIndex, uint256 winningPrice);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 etherSpent);
    event TokensSold(address indexed seller, uint256 amount, uint256 etherReceived);

    function initialize(uint256 initialSupply_, uint256 timeToVote_) public initializer {
        __AccessControl_init();
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        owner = msg.sender;
        _totalSupply = initialSupply_ * 10 ** 18;
        _balances[msg.sender] = _totalSupply;
        _defaultPrice = 100;

        minTokenAmountToInitiateVote = _totalSupply / 1000;
        minTokenAmountToVote = _totalSupply / 2000;
        timeToVote = timeToVote_;

        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }

    function setBuyFeePercentage(uint256 fee) public onlyAdmin {
        buyFeePercentage = fee;
    }

    function setSellFeePercentage(uint256 fee) public onlyAdmin {
        sellFeePercentage = fee;
    }

    function setTimeToVote(uint256 _timeToVote) public onlyAdmin {
        timeToVote = _timeToVote;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
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
        uint256 tokensToBuy = calculateTokensToBuy(msg.value, buyFeePercentage);
        _mint(msg.sender, tokensToBuy);
        emit TokensPurchased(msg.sender, tokensToBuy, msg.value);
    }

    function sell(uint256 amount) public {
        require(amount > 0 && _balances[msg.sender] >= amount, "Insufficient token balance");
        uint256 etherToReturn = calculateEtherToReturn(amount, sellFeePercentage);
        require(address(this).balance >= etherToReturn, "Insufficient contract balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(etherToReturn);
        emit TokensSold(msg.sender, amount, etherToReturn);
    }

    function calculateTokensToBuy(uint256 etherAmount, uint256 feePercentage) private view returns (uint256) {
        uint256 fee = (etherAmount * feePercentage) / 100;
        uint256 netEther = etherAmount - fee;
        uint256 latestPrice = getLatestPrice();
        return (netEther * latestPrice);
    }

    function calculateEtherToReturn(uint256 tokenAmount, uint256 feePercentage) private view returns (uint256) {
        uint256 fee = (tokenAmount * feePercentage) / 100;
        uint256 netTokens = tokenAmount - fee;
        uint256 latestPrice = getLatestPrice();
        return (netTokens / latestPrice);
    }

    function startVote(uint256 proposedPrice) public {
        require(balanceOf(msg.sender) >= minTokenAmountToInitiateVote, "Insufficient balance to initiate vote");
        require(currentVote.finalized, "An active vote is still ongoing");

        delete currentVote.totalVotesForPrice;
        delete currentVote.votingBalance;
        currentVote.leadingPrice = proposedPrice;
        currentVote.maxVotingPower = balanceOf(msg.sender);
        currentVote.voteEndTime = block.timestamp + timeToVote;
        currentVote.finalized = false;

        currentVote.votingBalance[msg.sender] = balanceOf(msg.sender);
        currentVote.totalVotesForPrice[proposedPrice] = balanceOf(msg.sender);

        currentVoteIndex++;
        emit VoteStarted(currentVoteIndex, proposedPrice, msg.sender);
    }

    function vote(uint256 price) public {
        uint256 voterBalance = balanceOf(msg.sender);
        require(voterBalance >= minTokenAmountToVote, "Insufficient balance to vote");
        require(currentVote.voteEndTime > block.timestamp, "Voting period has ended");
        require(!currentVote.finalized, "Vote already finalized");
        require(currentVote.votingBalance[msg.sender] == 0, "This account already participated in this voting");

        currentVote.votingBalance[msg.sender] = voterBalance;
        uint256 updatedVoteCountForPrice = currentVote.totalVotesForPrice[price] + voterBalance;
        currentVote.totalVotesForPrice[price] = updatedVoteCountForPrice;

        if (updatedVoteCountForPrice > currentVote.maxVotingPower) {
            currentVote.leadingPrice = price;
            currentVote.maxVotingPower = updatedVoteCountForPrice;
        }

        emit Voted(currentVoteIndex, price, voterBalance, msg.sender);
    }

    function finalizeVote() public {
        require(currentVote.voteEndTime <= block.timestamp, "Voting period not ended yet");
        require(!currentVote.finalized, "Vote already finalized");

        uint256 winningPrice = currentVote.leadingPrice;
        currentVote.finalized = true;
        _defaultPrice = currentVote.leadingPrice;

        emit VoteFinalized(currentVoteIndex, winningPrice);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "Transfer from the zero address");
        require(recipient != address(0), "Transfer to the zero address");
        require(balanceOf(sender) >= amount, "Transfer amount exceeds balance");
        require(canParticipate(sender), "Cannot transfer during active voting");

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
        require(canParticipate(account), "Cannot buy during active voting");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "Burn from the zero address");
        require(_balances[account] >= amount, "Burn amount exceeds balance");
        require(canParticipate(account), "Cannot buy during active voting");

        _balances[account] -= amount;
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function canParticipate(address account) private view returns (bool) {
        return currentVote.finalized || currentVote.votingBalance[account] == 0;
    }

    function getLatestPrice() private view returns (uint256) {
        return _defaultPrice;
    }
}
