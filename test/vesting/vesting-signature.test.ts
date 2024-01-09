import { expect } from "chai";
import { getBytes, parseEther, solidityPackedKeccak256 } from "ethers";

import { MyTokenTradableVotes, VestingSignatureContract } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";

describe("Vesting Deployment", function () {
  let myToken: MyTokenTradableVotes;
  let vestingSignature: VestingSignatureContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, vestingSignature, owner, addr1 } = await setupContract());
    console.log("contract owner ==>", await owner.getAddress());
  });

  it("Should set the right owner", async function () {
    expect(await vestingSignature.owner()).to.equal(owner.address);
  });

  it("Should allow token claim with a valid signature", async function () {
    const amount = parseEther("100");
    const nonce = 1; // Example nonce
    const message = solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [addr1.address, amount, nonce, await vestingSignature.getAddress()],
    );
    const signature = await owner.signMessage(getBytes(message));

    await expect(vestingSignature.connect(addr1).claimTokens(amount, nonce, signature))
      .to.emit(vestingSignature, "TokensClaimed") // Assuming such an event exists
      .withArgs(addr1.address, amount);

    expect(await myToken.balanceOf(addr1.address)).to.equal(amount);
  });
});
