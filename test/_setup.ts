// setup.ts
import { ethers, upgrades } from "hardhat";
import { MyToken, MyToken__factory } from "../typechain-types";
import { Signer } from "ethers";

export type SignerWithAddress = Signer & { address: string };

export async function setupContract() {
  const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  const myTokenFactory = (await ethers.getContractFactory("MyToken", owner)) as MyToken__factory;
  const totalSupply = BigInt(1000000000 * 10 ** 18); // 1 billion tokens in wei
  const timeToVote = 7 * 24 * 60 * 60; // 7 days in seconds
  const myToken = (await upgrades.deployProxy(myTokenFactory, [totalSupply, timeToVote], {
    initializer: "initialize",
  })) as unknown as MyToken;

  return { myToken, owner, addr1, addr2, addrs };
}
