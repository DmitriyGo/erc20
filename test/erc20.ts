import { expect } from "chai";
import { ethers } from "hardhat";
import { MyToken, MyToken__factory } from "../typechain-types";
import { Signer, ZeroAddress } from "ethers";

type SignerWithAddress = Signer & { address: string };

describe("MyToken", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const myTokenFactory = (await ethers.getContractFactory("MyToken", owner)) as MyToken__factory;
    const totalSupply = BigInt(1000000000 * 10 ** 18); // 1 billion tokens in wei
    const timeToVote = 7 * 24 * 60 * 60; // 7 days in seconds
    myToken = await myTokenFactory.deploy(totalSupply, timeToVote);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await myToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await myToken.balanceOf(owner.address);
      expect(await myToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await myToken.transfer(addr1.address, 50n);
      const addr1Balance = await myToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50n);
    });

    it("Should fail if recipient address is zero address", async function () {
      await expect(myToken.transfer(ZeroAddress, 50n)).to.be.revertedWith("Transfer to the zero address");
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await myToken.balanceOf(owner.address);
      await expect(myToken.connect(addr1).transfer(owner.address, 1n)).to.be.revertedWith(
        "Transfer amount exceeds balance"
      );
      expect(await myToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await myToken.balanceOf(owner.address);
      await myToken.transfer(addr1.address, 100n);
      await myToken.transfer(addr2.address, 50n);

      const finalOwnerBalance = await myToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - 150n);

      const addr1Balance = await myToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100n);

      const addr2Balance = await myToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50n);
    });
  });

  describe("approve", function () {
    it("should allow users to approve a spender", async function () {
      const approveAmount = BigInt("100000000000000000000"); // 100 tokens in wei
      await expect(myToken.connect(addr1).approve(addr2.address, approveAmount))
        .to.emit(myToken, "Approval")
        .withArgs(addr1.address, addr2.address, approveAmount);

      const allowance = await myToken.allowance(addr1.address, addr2.address);
      expect(allowance).to.equal(approveAmount);
    });

    it("should fail when the spender is the zero address", async function () {
      const approveAmount = BigInt("100000000000000000000"); // 100 tokens in wei
      await expect(myToken.connect(addr1).approve(ZeroAddress, approveAmount)).to.be.revertedWith(
        "Approve to the zero address"
      );
    });
  });

  describe("transferFrom", function () {
    it("should allow a spender to transfer tokens on behalf of the owner", async function () {
      const transferAmount = BigInt("50000000000000000000"); // 50 tokens in wei
      await myToken.connect(owner).approve(addr1.address, transferAmount);
      await expect(myToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);

      const finalBalance = await myToken.balanceOf(addr2.address);
      expect(finalBalance).to.equal(transferAmount);
    });

    it("should fail when the spender does not have enough allowance", async function () {
      const transferAmount = BigInt("100000000000000000000"); // 100 tokens in wei
      const allowanceAmount = transferAmount - 1n;

      await myToken.connect(owner).approve(addr1.address, allowanceAmount);
      await expect(
        myToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should fail when transferring from the zero address", async function () {
      const transferAmount = BigInt("50000000000000000000"); // 50 tokens in wei
      await myToken.connect(owner).approve(addr1.address, transferAmount);
      await expect(myToken.connect(addr1).transferFrom(ZeroAddress, addr2.address, transferAmount)).to.be.revertedWith(
        "Insufficient allowance"
      );
    });
  });

  describe("Voting Functionality", function () {
    it("Should fail to start a vote with insufficient balance", async function () {
      const proposedPrice = BigInt("1000000000000000000");
      await expect(myToken.connect(addr2).startVote(proposedPrice)).to.be.revertedWith(
        "Insufficient balance to initiate vote"
      );
    });

    it("Should start a vote with valid conditions", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);
      const proposedPrice = BigInt("1000000000000000000");
      await expect(myToken.connect(addr1).startVote(proposedPrice))
        .to.emit(myToken, "VoteStarted")
        .withArgs(0, proposedPrice, addr1.address);
    });

    it("Should allow valid voting", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);
      await myToken.transfer(addr2.address, totalSupply / 2000n);

      const proposedPrice = BigInt("1000000000000000000");
      const smallerProposedPrice = BigInt("10000000000000000");

      await myToken.connect(addr1).startVote(proposedPrice);

      await expect(myToken.connect(addr1).vote(0, proposedPrice))
        .to.emit(myToken, "Voted")
        .withArgs(0, proposedPrice, await myToken.balanceOf(addr1.address), addr1.address);

      await expect(myToken.connect(addr2).vote(0, smallerProposedPrice))
        .to.emit(myToken, "Voted")
        .withArgs(0, smallerProposedPrice, await myToken.balanceOf(addr2.address), addr2.address);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      expect(await myToken.connect(addr1).finalizeVote(0))
        .to.emit(myToken, "VoteFinalized")
        .withArgs(0, proposedPrice);
    });

    it("Should fail to vote with insufficient balance", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);
      await expect(myToken.connect(addr2).vote(0, proposedPrice)).to.be.revertedWith("Insufficient balance to vote");
    });

    it("Should fail to vote for an invalid vote index", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);
      const invalidVoteIndex = 999;
      await expect(myToken.connect(addr1).vote(invalidVoteIndex, proposedPrice)).to.be.revertedWith(
        "Invalid vote index"
      );
    });

    it("Should fail to vote after the voting period has ended", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(myToken.connect(addr1).vote(0, proposedPrice)).to.be.revertedWith("Voting period has ended");
    });

    it("Should finalize a vote after the voting period", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      await expect(myToken.connect(addr1).finalizeVote(0)).to.emit(myToken, "VoteFinalized").withArgs(0, proposedPrice);
    });

    it("Should fail to finalize a vote before the voting period ends", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);
      await expect(myToken.connect(addr1).finalizeVote(0)).to.be.revertedWith("Voting period not ended yet");
    });

    it("Should fail to finalize an already finalized vote", async function () {
      const totalSupply = await myToken.totalSupply();
      await myToken.transfer(addr1.address, totalSupply / 1000n);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).startVote(proposedPrice);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      await expect(myToken.connect(addr1).finalizeVote(0)).to.not.be.reverted;
      await expect(myToken.connect(addr1).finalizeVote(0)).to.be.revertedWith("Vote already finalized");
    });

    it("should revert finalizing a vote with an invalid index", async function () {
      const invalidVoteIndex = 999;
      await expect(myToken.finalizeVote(invalidVoteIndex)).to.be.revertedWith("Invalid vote index");
    });

    // Additional test cases...
  });

  describe("Admin functionalities", function () {
    it("should allow only admin to set time to vote", async function () {
      const newTimeToVote = 10000; // example new time
      await expect(myToken.connect(owner).setTimeToVote(newTimeToVote)).to.not.be.reverted;
    });

    it("should revert if non-admin tries to set time to vote", async function () {
      const newTimeToVote = 10000; // example new time
      await expect(myToken.connect(addr1).setTimeToVote(newTimeToVote)).to.be.revertedWith("Caller is not an admin");
    });
  });
});
