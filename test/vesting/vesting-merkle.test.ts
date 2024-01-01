import { expect } from "chai";
import { parseEther, solidityPackedKeccak256 } from "ethers";
import { ethers } from "hardhat";

import { VestingMerkleContract } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";
import { getRoot } from "../utils/merkle";

describe("Vesting Deployment", function () {
  let vestingMerkle: VestingMerkleContract;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    ({ vestingMerkle, owner } = await setupContract());
  });

  it("Should set the right owner", async function () {
    expect(await vestingMerkle.owner()).to.equal(owner.address);
  });

  it("Should correctly vest tokens to multiple addresses", async function () {
    const signers = await generateSigners(100);
    const addresses = signers.map((signer) => signer.address);

    const dataArray = addresses.map((address) => solidityPackedKeccak256(["address", "uint256"], [address, 100]));
    const root = getRoot(dataArray);

    const tx = await vestingMerkle.connect(owner).vestTokens(root);
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed;

    console.log("vesting merkle: gasUsed ==>", gasUsed);

    expect(await vestingMerkle.claimMerkleRoot()).to.equal(root);
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
