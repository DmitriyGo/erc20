// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyToken is IERC20, AccessControl {
    struct Vote {
        mapping(uint256 => uint256) totalVotesForPrice; // Maps price to total tokens voting for it
        uint256 leadingPrice;
        uint256 maxVotingPower;
        uint256 voteEndTime;
        bool finalized;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant SECONDS_IN_A_DAY = 86400; // 24 * 60 * 60
    uint256 public minTokenAmountToInitiateVote;
    uint256 public minTokenAmountToVote;
    uint256 public timeToVote;
    address public owner;
    Vote[] public votes;
    
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event VoteStarted(uint256 indexed voteIndex, uint256 proposedPrice, address indexed initiator);
    event Voted(uint256 indexed voteIndex, uint256 price, uint256 amount, address indexed voter);
    event VoteFinalized(uint256 indexed voteIndex, uint256 winningPrice);

    constructor(uint256 initialSupply, uint256 _timeToVote) {
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        owner = msg.sender;
        _totalSupply = initialSupply * 10 ** 18;
        _balances[msg.sender] = _totalSupply;

        minTokenAmountToInitiateVote = _totalSupply / 1000;
        minTokenAmountToVote = _totalSupply / 2000;
        timeToVote = _timeToVote;

        emit Transfer(address(0), msg.sender, _totalSupply);
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
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

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
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

     function startVote(uint256 proposedPrice) public {
        require(balanceOf(msg.sender) >= minTokenAmountToInitiateVote, "Insufficient balance to initiate vote");

        Vote storage newVote = votes.push();
        newVote.voteEndTime = block.timestamp + timeToVote;
        newVote.finalized = false;

        uint256 voteIndex = votes.length - 1;
        emit VoteStarted(voteIndex, proposedPrice, msg.sender);
    }

    function vote(uint256 voteIndex, uint256 price) public {
        require(balanceOf(msg.sender) >= minTokenAmountToVote, "Insufficient balance to vote");
        require(voteIndex < votes.length, "Invalid vote index");
        require(votes[voteIndex].voteEndTime > block.timestamp, "Voting period has ended");
        require(!votes[voteIndex].finalized, "Vote already finalized");

        uint256 voterBalance = balanceOf(msg.sender);
        uint256 updatedVoteCountForPrice = votes[voteIndex].totalVotesForPrice[price] + voterBalance;
        votes[voteIndex].totalVotesForPrice[price] = updatedVoteCountForPrice;

        if (updatedVoteCountForPrice > votes[voteIndex].maxVotingPower) {
            votes[voteIndex].leadingPrice = price;
            votes[voteIndex].maxVotingPower = updatedVoteCountForPrice;
        }

        emit Voted(voteIndex, price, balanceOf(msg.sender), msg.sender);
    }

   
    function finalizeVote(uint256 voteIndex) public {
        require(voteIndex < votes.length, "Invalid vote index");
        require(votes[voteIndex].voteEndTime <= block.timestamp, "Voting period not ended yet");
        require(!votes[voteIndex].finalized, "Vote already finalized");

        uint256 winningPrice = votes[voteIndex].leadingPrice;
        votes[voteIndex].finalized = true;

        emit VoteFinalized(voteIndex, winningPrice);
    }

    function setTimeToVote(uint256 _timeToVote) public onlyAdmin {
        timeToVote = _timeToVote;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "Transfer from the zero address");
        require(recipient != address(0), "Transfer to the zero address");
        require(balanceOf(sender) >= amount, "Transfer amount exceeds balance");

        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "Approve from the zero address");
        require(spender != address(0), "Approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
