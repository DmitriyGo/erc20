import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress, setupContract } from "./_setup";
import { MyToken } from "../typechain-types";

describe("Voting Functionality", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    ({ myToken, owner, addr1, addr2, addrs } = await setupContract());
  });

  it("Should fail to start a vote with insufficient balance", async function () {
    const proposedPrice = BigInt("1000000000000000000");
    await expect(myToken.connect(addr2).initiateVote(proposedPrice)).to.be.revertedWith(
      "Insufficient balance to initiate vote"
    );
  });

  it("Should start a vote with valid conditions", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);
    const proposedPrice = BigInt("1000000000000000000");
    await expect(myToken.connect(addr1).initiateVote(proposedPrice))
      .to.emit(myToken, "VoteInitiated")
      .withArgs(1, proposedPrice, addr1.address);
  });

  it("Should allow valid voting", async function () {
    const addr3 = addrs[0];
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);
    await myToken.transfer(addr2.address, totalSupply / 2000n);
    await myToken.transfer(addr3.address, totalSupply / 2000n);

    const proposedPrice = BigInt("1000000000000000000");
    const smallerProposedPrice = BigInt("10000000000000000");

    await myToken.connect(addr1).initiateVote(proposedPrice);

    await expect(myToken.connect(addr2).vote(smallerProposedPrice))
      .to.emit(myToken, "Voted")
      .withArgs(1, smallerProposedPrice, await myToken.balanceOf(addr2.address), addr2.address);

    await expect(myToken.connect(addr3).vote(proposedPrice))
      .to.emit(myToken, "Voted")
      .withArgs(1, proposedPrice, await myToken.balanceOf(addr3.address), addr3.address);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    expect(await myToken.connect(addr1).finalizeVote())
      .to.emit(myToken, "VoteFinalized")
      .withArgs(1, proposedPrice);
  });

  it("Should fail to vote with insufficient balance", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);
    await expect(myToken.connect(addr2).vote(proposedPrice)).to.be.revertedWith("Insufficient balance to vote");
  });

  it("Should fail to vote if there is ongoing voting", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);
    await myToken.transfer(addr2.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);
    await expect(myToken.connect(addr2).initiateVote(proposedPrice)).to.be.revertedWith("Active vote ongoing");
  });

  it("Should fail to vote after the voting period has ended", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");

    await expect(myToken.connect(addr1).vote(proposedPrice)).to.be.revertedWith("Voting period has ended");
  });

  it("Should finalize a vote after the voting period", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(myToken.connect(addr1).finalizeVote()).to.emit(myToken, "VoteFinalized").withArgs(1, proposedPrice);
  });

  it("Should fail to finalize a vote before the voting period ends", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);
    await expect(myToken.connect(addr1).finalizeVote()).to.be.revertedWith("Voting period not ended yet");
  });

  it("Should fail to finalize an already finalized vote", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(myToken.connect(addr1).finalizeVote()).to.not.be.reverted;
    await expect(myToken.connect(addr1).finalizeVote()).to.be.revertedWith("Vote already finalized");
  });

  it("Should fail to vote twice", async function () {
    const totalSupply = await myToken.totalSupply();
    await myToken.transfer(addr1.address, totalSupply / 1000n);

    const proposedPrice = BigInt("1000000000000000000");
    await myToken.connect(addr1).initiateVote(proposedPrice);

    await expect(myToken.connect(addr1).vote(proposedPrice)).to.be.revertedWith("Already voted this round");
  });
});
