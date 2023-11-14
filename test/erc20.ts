import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, parseEther, ZeroAddress, getBigInt } from "ethers";
import { MyToken__factory, MyToken } from "../typechain-types";

type SignerWithAddress = {
  address: string;
} & Signer;

describe("MyToken", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const myTokenFactory = (await ethers.getContractFactory("MyToken", owner)) as MyToken__factory;
    const totalSupply = parseEther("1000000000"); // 1 billion tokens
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
      await myToken.transfer(addr1.address, 50);
      const addr1Balance = await myToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);
    });

    it("Should fail if recipient address is zero address", async function () {
      await expect(myToken.transfer(ZeroAddress, 50)).to.be.revertedWith("Transfer to the zero address");
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await myToken.balanceOf(owner.address);

      await expect(myToken.connect(addr1).transfer(owner.address, 1)).to.be.revertedWith(
        "Transfer amount exceeds balance"
      );

      expect(await myToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await myToken.balanceOf(owner.address);

      await myToken.transfer(addr1.address, 100);

      await myToken.transfer(addr2.address, 50);

      const finalOwnerBalance = await myToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - 150n);

      const addr1Balance = await myToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await myToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("approve", function () {
    it("should allow users to approve a spender", async function () {
      const approveAmount = parseEther("100");

      await expect(myToken.connect(addr1).approve(addr2.address, approveAmount))
        .to.emit(myToken, "Approval")
        .withArgs(addr1.address, addr2.address, approveAmount);

      const allowance = await myToken.allowance(addr1.address, addr2.address);
      expect(allowance).to.equal(approveAmount);
    });

    it("should fail when the spender is the zero address", async function () {
      const approveAmount = parseEther("100");
      await expect(myToken.connect(addr1).approve(ZeroAddress, approveAmount)).to.be.revertedWith(
        "Approve to the zero address"
      );
    });
  });

  describe("transferFrom", function () {
    it("should allow a spender to transfer tokens on behalf of the owner", async function () {
      const transferAmount = parseEther("100");
      await myToken.connect(owner).approve(addr1.address, transferAmount);
      await expect(myToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, addr2.address, transferAmount);

      const finalBalance = await myToken.balanceOf(addr2.address);
      expect(finalBalance).to.equal(transferAmount);
    });

    it("should fail when the spender does not have enough allowance", async function () {
      const transferAmount = parseEther("100");
      const allowanceAmount = parseEther("99");

      await myToken.connect(owner).approve(addr1, allowanceAmount);

      await expect(myToken.connect(addr1).transferFrom(owner, addr2, transferAmount)).to.be.revertedWith(
        "Insufficient allowance"
      );
    });

    it("should fail when transferring from the zero address", async function () {
      const transferAmount = parseEther("100");
      await myToken.connect(owner).approve(addr1.address, transferAmount);
      await expect(myToken.connect(addr1).transferFrom(ZeroAddress, addr2.address, transferAmount)).to.be.revertedWith(
        "Insufficient allowance"
      );
    });
  });
});
