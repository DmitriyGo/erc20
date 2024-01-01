import { expect } from "chai";
import { parseEther } from "ethers";
import { ethers } from "hardhat";

import { VestingContract } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";

describe("Vesting Deployment", function () {
  let vesting: VestingContract;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    ({ vesting, owner } = await setupContract());
  });

  it("Should set the right owner", async function () {
    expect(await vesting.owner()).to.equal(owner.address);
  });

  it("Should correctly vest tokens to multiple addresses", async function () {
    const signers = await generateSigners(100);
    const addresses = signers.map((signer) => signer.address);
    const amounts = signers.map(() => 100);

    const tx = await vesting.connect(owner).vestTokensMany(addresses, amounts);
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed;

    console.log("vesting mapping: gasUsed ==>", gasUsed);

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const amount = amounts[i];
      expect((await vesting.vestingInfo(address)).amount).to.equal(amount);
    }
  });

  it("Should revert claim if cliff haven't passed", async function () {
    const signers = await generateSigners(10);
    const addresses = [signers[1].address, signers[2].address];
    const amounts = [100, 200];

    await vesting.connect(owner).vestTokensMany(addresses, amounts);

    await expect(vesting.connect(signers[1]).claimTokens(100)).to.be.revertedWith("Cannot claim yet");

    await ethers.provider.send("evm_increaseTime", [2 * 365 * 24 * 60 * 60 - 2]); // 2 years
    await ethers.provider.send("evm_mine");

    await expect(vesting.connect(signers[1]).claimTokens(100)).to.be.revertedWith("Cannot claim yet");
  });

  it("Should claim tokens after cliff passed", async function () {
    const signers = await generateSigners(10);
    const addresses = [signers[1].address, signers[2].address];
    const amounts = [100, 200];

    await vesting.connect(owner).vestTokensMany(addresses, amounts);

    await ethers.provider.send("evm_increaseTime", [2 * 365 * 24 * 60 * 60]); // 2 years
    await ethers.provider.send("evm_mine");

    await expect(vesting.connect(signers[1]).claimTokens(100))
      .to.emit(vesting, "TokensClaimed")
      .withArgs(signers[1].address, 100);
  });
});

async function generateSigners(numberOfSigners: number) {
  const signers = [];
  for (let i = 0; i < numberOfSigners; i++) {
    const wallet = ethers.Wallet.createRandom();
    const fundedWallet = wallet.connect(ethers.provider);

    const [funder] = await ethers.getSigners();
    await funder.sendTransaction({
      to: fundedWallet.address,
      value: parseEther("1.0"),
    });
    signers.push(fundedWallet);
  }
  return signers;
}
