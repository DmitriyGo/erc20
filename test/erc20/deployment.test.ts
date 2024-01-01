import { expect } from "chai";

import { MyTokenTradableVotes } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";

describe("Voting Functionality", function () {
  let myToken: MyTokenTradableVotes;
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
