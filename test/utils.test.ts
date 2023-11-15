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
    await expect(myToken.connect(owner).setTimeToVote(newTimeToVote)).to.not.be.reverted;
  });

  it("should revert if non-admin tries to set time to vote", async function () {
    const newTimeToVote = 10000; // example new time
    await expect(myToken.connect(addr1).setTimeToVote(newTimeToVote)).to.be.revertedWith("Caller is not an admin");
  });
});
