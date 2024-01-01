import { expect } from "chai";
import { parseUnits } from "ethers";
import { ethers, network } from "hardhat";

import { MyTokenTradableVotes, ReentrantAttacker } from "../../typechain-types";
import { SignerWithAddress, setupContract } from "../_setup";

describe("Reentrancy Attack on Sell Function", function () {
  let myToken: MyTokenTradableVotes;
  let attacker: ReentrantAttacker;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    ({ myToken, owner } = await setupContract());

    const attackerFactory = await ethers.getContractFactory("ReentrantAttacker", owner);
    attacker = (await attackerFactory.deploy(await myToken.getAddress())) as unknown as ReentrantAttacker;

    const transferAmount = parseUnits("1000", 18); // 1000 tokens
    await myToken.transfer(await attacker.getAddress(), transferAmount);
  });

  it("should prevent reentrancy attack", async function () {
    const tokenBalance = ethers.toQuantity(parseUnits("100", 20));
    await network.provider.send("hardhat_setBalance", [await myToken.getAddress(), tokenBalance]);

    const initialBalance = await ethers.provider.getBalance(await myToken.getAddress());
    const sellAmount = parseUnits("100", 18);
    await myToken.transfer(await attacker.getAddress(), sellAmount);
    await expect(attacker.attack(sellAmount)).to.be.reverted;

    const finalBalance = await ethers.provider.getBalance(await myToken.getAddress());
    expect(finalBalance).to.equal(initialBalance); // Balance should not change
  });
});
