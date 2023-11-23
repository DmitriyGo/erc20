// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// solhint-disable-next-line
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract MyTokenVoting is IERC20, Initializable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public owner;
    uint256 public voteInitiationThreshold;
    uint256 public voteParticipationThreshold;
    uint256 public votingDuration;
    uint256 public defaultPrice;

    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;
    mapping(address => mapping(address => uint256)) internal _allowances;

    struct Voting {
        uint256 leadingPrice;
        uint256 maxVotingPower;
        uint256 endTime;
        bool isFinalized;
    }
    Voting public currentVote;
    uint256 public currentVoteRound;

    mapping(uint256 => mapping(uint256 => uint256)) internal _totalVotes;
    mapping(address => mapping(uint256 => uint256)) internal _voterBalances;

    event VoteInitiated(uint256 indexed voteRound, uint256 proposedPrice, address indexed initiator);
    event Voted(uint256 indexed voteRound, uint256 price, uint256 amount, address indexed voter);
    event VoteFinalized(uint256 indexed voteRound, uint256 winningPrice);

    function initialize(uint256 initialSupply, uint256 votingPeriod) public virtual initializer {
        __AccessControl_init();
        _grantRole(ADMIN_ROLE, msg.sender);
        owner = msg.sender;

        _totalSupply = initialSupply * 1e18;
        _balances[msg.sender] = _totalSupply;
        defaultPrice = 100;

        currentVote = Voting({
            leadingPrice: defaultPrice,
            maxVotingPower: 0,
            endTime: block.timestamp,
            isFinalized: true
        });

        voteInitiationThreshold = _totalSupply / 1000;
        voteParticipationThreshold = _totalSupply / 2000;
        votingDuration = votingPeriod;

        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }

    function setVotingDuration(uint256 newDuration) public onlyAdmin {
        votingDuration = newDuration;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function initiateVote(uint256 proposedPrice) public {
        require(balanceOf(msg.sender) >= voteInitiationThreshold, "Insufficient balance to initiate vote");
        require(currentVote.isFinalized, "Active vote ongoing");

        currentVoteRound++;
        currentVote = Voting({
            leadingPrice: proposedPrice,
            maxVotingPower: balanceOf(msg.sender),
            endTime: block.timestamp + votingDuration,
            isFinalized: false
        });

        _updateVotingPower(msg.sender, proposedPrice, balanceOf(msg.sender));

        emit VoteInitiated(currentVoteRound, proposedPrice, msg.sender);
    }

    function vote(uint256 price) public {
        require(block.timestamp < currentVote.endTime, "Voting period has ended");
        require(_voterBalances[msg.sender][currentVoteRound] == 0, "Already voted this round");
        require(balanceOf(msg.sender) >= voteParticipationThreshold, "Insufficient balance to vote");

        _updateVotingPower(msg.sender, price, balanceOf(msg.sender));

        emit Voted(currentVoteRound, price, balanceOf(msg.sender), msg.sender);
    }

    function finalizeVote() public {
        require(block.timestamp >= currentVote.endTime, "Voting period not ended yet");
        require(!currentVote.isFinalized, "Vote already finalized");

        currentVote.isFinalized = true;
        defaultPrice = currentVote.leadingPrice;

        emit VoteFinalized(currentVoteRound, currentVote.leadingPrice);
    }

    function _updateVotingPower(address voter, uint256 price, uint256 votingPower) internal {
        _voterBalances[voter][currentVoteRound] = votingPower;
        uint256 newTotal = _totalVotes[currentVoteRound][price] + votingPower;
        _totalVotes[currentVoteRound][price] = newTotal;

        if (newTotal > currentVote.maxVotingPower) {
            currentVote.leadingPrice = price;
            currentVote.maxVotingPower = newTotal;
        }
    }
}
