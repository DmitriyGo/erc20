import { expect } from "chai";
import { ZeroAddress, parseEther } from "ethers";
import { ethers, network } from "hardhat";

import { MyTokenTradableVotes } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";

describe("Transactions", function () {
  let myToken: MyTokenTradableVotes;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner, addr1, addr2 } = await setupContract());
  });

  describe("Transfer", function () {
    it("should transfer tokens successfully", async function () {
      const transferAmount = 100;
      await myToken.transfer(addr1.address, transferAmount);
      expect(await myToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("should fail to transfer from the zero address", async function () {
      const otherAccount = addr1.address;
      const transferAmount = 100;

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0000000000000000000000000000000000000000"],
      });
      const zeroAddressSigner = await ethers.getSigner("0x0000000000000000000000000000000000000000");
      owner.sendTransaction({
        to: zeroAddressSigner.address,
        value: parseEther("1"),
      });

      await expect(myToken.connect(zeroAddressSigner).transfer(otherAccount, transferAmount)).to.be.revertedWith(
        "Transfer from the zero address",
      );
    });

    it("should fail to transfer to zero address", async function () {
      const transferAmount = 100;
      await expect(myToken.transfer(ZeroAddress, transferAmount)).to.be.revertedWith("Transfer to the zero address");
    });

    it("should fail to transfer when balance is insufficient", async function () {
      const transferAmount = (await myToken.totalSupply()) + 1n;
      await expect(myToken.transfer(addr1.address, transferAmount)).to.be.revertedWith(
        "Transfer amount exceeds balance",
      );
    });

    it("should fail to transfer when not enough free tokens due to voting", async function () {
      const totalSupply = await myToken.totalSupply();
      const balance = totalSupply / 1000n;
      await myToken.transfer(addr1.address, balance);

      const proposedPrice = BigInt("1000000000000000000");
      await myToken.connect(addr1).initiateVote(proposedPrice);
      await expect(myToken.connect(addr1).transfer(addr2.address, balance / 2n)).to.be.revertedWith(
        "Not enough free tokens",
      );
    });
  });

  describe("Approve", function () {
    it("should return the correct allowance", async function () {
      const allowanceAmount = 100;
      await myToken.approve(addr1.address, allowanceAmount);
      expect(await myToken.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
    });

    it("should approve spender successfully", async function () {
      const allowanceAmount = 100;
      await myToken.approve(addr1.address, allowanceAmount);
      expect(await myToken.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
    });

    it("should fail to approve to zero address", async function () {
      await expect(myToken.approve(ZeroAddress, 100)).to.be.revertedWith("Approve to the zero address");
    });

    it("should fail to approve from the zero address", async function () {
      const spender = addr1.address;
      const approvalAmount = 100;

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x0000000000000000000000000000000000000000"],
      });
      const zeroAddressSigner = await ethers.getSigner("0x0000000000000000000000000000000000000000");

      await expect(myToken.connect(zeroAddressSigner).approve(spender, approvalAmount)).to.be.revertedWith(
        "Approve from the zero address",
      );
    });
  });

  describe("Transfer from", function () {
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
        myToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount),
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should fail when transferring from the zero address", async function () {
      const transferAmount = BigInt("50000000000000000000"); // 50 tokens in wei
      await myToken.connect(owner).approve(addr1.address, transferAmount);
      await expect(myToken.connect(addr1).transferFrom(ZeroAddress, addr2.address, transferAmount)).to.be.revertedWith(
        "Insufficient allowance",
      );
    });
  });
});
