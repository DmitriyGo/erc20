import { JsonRpcProvider, Wallet, parseUnits } from "ethers";
import { task } from "hardhat/config";

import { getSepoliaAlchemyUrl } from "../helpers/alchemy";

import "@nomicfoundation/hardhat-toolbox";

const getConnecion = (privatekey: string, alchemykey: string) => {
  const alchemyUrl = getSepoliaAlchemyUrl(alchemykey);

  const provider = new JsonRpcProvider(alchemyUrl);
  const signer = new Wallet(privatekey, provider);

  return { provider, signer };
};

// yarn hardhat deploy --initial-supply 1000 --voting-period 604800
task("deploy", "Deploys MyToken contract to Sepolia")
  .addParam("initialSupply", "The initial supply of tokens")
  .addParam("votingPeriod", "The voting period in blocks")
  .setAction(async (taskArgs, hre) => {
    const privatekey = process.env.PRIVATE_KEY || "";
    const alchemykey = process.env.SEPOLIA_API_KEY || "";

    const { signer } = getConnecion(privatekey, alchemykey);
    const signerAddress = await signer.getAddress();

    const factory = await hre.ethers.getContractFactory("MyTokenTest", signer);
    console.log("Deploying MyToken to Sepolia...");

    const initialSupply = taskArgs.initialSupply;
    const votingPeriod = taskArgs.votingPeriod;

    const myToken = await (
      await hre.upgrades.deployProxy(factory, [initialSupply, votingPeriod], {
        initializer: "initialize",
      })
    ).waitForDeployment();

    await (await myToken.mint(signerAddress, parseUnits(initialSupply, 18))).wait();

    console.log("MyToken deployed to:", await myToken.getAddress());

    return myToken.getAddress();
  });
