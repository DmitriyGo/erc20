// setup.ts
import { Signer } from "ethers";
import { ethers, upgrades } from "hardhat";

import {
  MyTokenTradableVotes,
  VestingContract,
  VestingMerkleContract,
  VestingSignatureContract,
} from "../typechain-types";

export type SignerWithAddress = Signer & { address: string };

export async function setupContract() {
  const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  const myTokenFactory = await ethers.getContractFactory("MyTokenTradableVotes", owner);
  const totalSupply = 1e6;
  const timeToVote = 7 * 24 * 60 * 60; // 7 days in seconds
  const myToken = (await upgrades.deployProxy(myTokenFactory, ["MyToken", "MTN", 18, totalSupply, timeToVote], {
    initializer: "initialize(string,string,uint8,uint256,uint256)",
  })) as unknown as MyTokenTradableVotes;

  const vesting = (await ethers.deployContract("VestingContract", [myToken])) as unknown as VestingContract;
  const vestingMerkle = (await ethers.deployContract("VestingMerkleContract", [
    myToken,
  ])) as unknown as VestingMerkleContract;
  const vestingSignature = (await ethers.deployContract("VestingSignatureContract", [
    myToken,
  ])) as unknown as VestingSignatureContract;

  return { myToken, vesting, vestingMerkle, vestingSignature, owner, addr1, addr2, addrs };
}
