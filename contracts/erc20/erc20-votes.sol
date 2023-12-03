// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// solhint-disable-next-line
import "hardhat/console.sol";
import "./erc20.sol";

abstract contract MyTokenVotes is MyToken {
    uint256 public voteInitiationThreshold;
    uint256 public voteParticipationThreshold;
    uint256 public votingDuration;
    uint256 public defaultPrice;

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

    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 votingPeriod_
    ) public virtual initializer {
        MyToken.initialize(name_, symbol_, decimals_, initialSupply_);

        defaultPrice = 100;

        currentVote = Voting({
            leadingPrice: defaultPrice,
            maxVotingPower: 0,
            endTime: block.timestamp,
            isFinalized: true
        });

        voteInitiationThreshold = _totalSupply / 1000;
        voteParticipationThreshold = _totalSupply / 2000;
        votingDuration = votingPeriod_;
    }

    function setVotingDuration(uint256 newDuration) public onlyAdmin {
        votingDuration = newDuration;
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
