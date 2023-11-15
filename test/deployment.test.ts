import { expect } from "chai";
import { SignerWithAddress, setupContract } from "./_setup";
import { MyToken } from "../typechain-types";

describe("Voting Functionality", function () {
  let myToken: MyToken;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner } = await setupContract());
  });

  it("Should set the right owner", async function () {
    expect(await myToken.owner()).to.equal(owner.address);
  });

  it("Should assign the total supply of tokens to the owner", async function () {
    const ownerBalance = await myToken.balanceOf(owner.address);
    expect(await myToken.totalSupply()).to.equal(ownerBalance);
  });
});
