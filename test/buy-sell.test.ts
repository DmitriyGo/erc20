import { SignerWithAddress, setupContract } from "./_setup";
import { MyToken } from "../typechain-types";
import { parseEther, parseUnits } from "ethers";
import { ethers, network } from "hardhat";

describe("Transactions", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner, addr1, addr2 } = await setupContract());
  });

  const { expect } = require("chai");

  async function calculateTokensToBuy(etherAmount: bigint, feePercentage: bigint) {
    const fee = (etherAmount * feePercentage) / 100n;
    const netEther = etherAmount - fee;
    const defaultPrice = await myToken.defaultPrice();
    return netEther * defaultPrice;
  }

  async function calculateEtherToReturn(tokenAmount: bigint, feePercentage: bigint) {
    const fee = (tokenAmount * feePercentage) / 100n;
    const netTokens = tokenAmount - fee;
    const defaultPrice = await myToken.defaultPrice();
    return netTokens / defaultPrice;
  }

  describe("buy", function () {
    it("should allow a user to buy tokens with Ether", async function () {
      const buyValue = parseEther("1"); // 1 Ether
      await expect(() => myToken.connect(addr1).buy({ value: buyValue })).to.changeEtherBalances(
        [addr1, myToken],
        [-buyValue, buyValue]
      );

      const tokensToBuy = await calculateTokensToBuy(buyValue, await myToken.buyFeePercent());
      expect(await myToken.balanceOf(addr1.address)).to.equal(tokensToBuy);
    });

    it("should fail when Ether is not sent", async function () {
      await expect(myToken.connect(addr1).buy()).to.be.revertedWith("Ether required to buy tokens");
    });
  });

  describe("sell", function () {
    it("should allow a user to sell tokens for Ether", async function () {
      const tokenBalance = ethers.toQuantity(parseUnits("100", 20));
      const sellAmount = parseUnits("100", 18);

      await myToken.transfer(addr1.address, sellAmount);
      await network.provider.send("hardhat_setBalance", [await myToken.getAddress(), tokenBalance]);

      await myToken.connect(addr1).approve(await myToken.getAddress(), sellAmount);

      await expect(() => myToken.connect(addr1).sell(sellAmount)).to.changeTokenBalances(
        myToken,
        [addr1],
        [-sellAmount]
      );
    });

    it("should fail when selling more tokens than the balance", async function () {
      const sellAmount = parseUnits("100000000", 18); // A large number of tokens
      await expect(myToken.connect(addr1).sell(sellAmount)).to.be.revertedWith("Insufficient token balance");
    });
  });
});
