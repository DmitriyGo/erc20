import { expect } from "chai";
import { SignerWithAddress, setupContract } from "./_setup";
import { MyToken } from "../typechain-types";

describe("Utils", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner, addr1 } = await setupContract());
  });

  it("should allow only admin to set time to vote", async function () {
    const newTimeToVote = 10000; // example new time
    await expect(myToken.connect(owner).setVotingDuration(newTimeToVote)).to.not.be.reverted;
  });

  it("should revert if non-admin tries to set time to vote", async function () {
    const newTimeToVote = 10000; // example new time
    await expect(myToken.connect(addr1).setVotingDuration(newTimeToVote)).to.be.revertedWith("Caller is not an admin");
  });

  it("should allow only admin to set buy fee percent", async function () {
    const newBuyFee = 5;
    await expect(myToken.connect(owner).setBuyFeePercent(newBuyFee)).to.not.be.reverted;
    expect(await myToken.buyFeePercent()).to.equal(newBuyFee);
  });

  it("should revert if non-admin tries to set buy fee percent", async function () {
    const newBuyFee = 5;
    await expect(myToken.connect(addr1).setBuyFeePercent(newBuyFee)).to.be.revertedWith("Caller is not an admin");
  });

  it("should allow only admin to set sell fee percent", async function () {
    const newSellFee = 3;
    await expect(myToken.connect(owner).setSellFeePercent(newSellFee)).to.not.be.reverted;
    expect(await myToken.sellFeePercent()).to.equal(newSellFee);
  });

  it("should revert if non-admin tries to set sell fee percentage", async function () {
    const newSellFee = 3;
    await expect(myToken.connect(addr1).setSellFeePercent(newSellFee)).to.be.revertedWith("Caller is not an admin");
  });
});
