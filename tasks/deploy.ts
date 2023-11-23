import { task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

task("deploy", "Deploys MyToken contract to Sepolia")
  .addParam("initialSupply", "The initial supply of tokens")
  .addParam("votingPeriod", "The voting period in blocks")
  .setAction(async (taskArgs, hre) => {
    const MyToken = await hre.ethers.getContractFactory("MyToken");
    console.log("Deploying MyToken to Sepolia...");

    const initialSupply = taskArgs.initialSupply;
    const votingPeriod = taskArgs.votingPeriod;

    // Deploy using a proxy for upgradeability
    const myToken = await hre.upgrades.deployProxy(MyToken, [initialSupply, votingPeriod], {
      initializer: "initialize",
    });
    await myToken.deployed();

    console.log("MyToken deployed to:", myToken.getAddress());

    return myToken.getAddress();
  });
