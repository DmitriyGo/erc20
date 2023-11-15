import { expect } from "chai";
import { SignerWithAddress, setupContract } from "./_setup";
import { MyToken } from "../typechain-types";
import { ZeroAddress } from "ethers";

describe("Transactions", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner, addr1, addr2 } = await setupContract());
  });

  describe("Transfer", function () {
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

  describe("Approve", function () {
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
});
