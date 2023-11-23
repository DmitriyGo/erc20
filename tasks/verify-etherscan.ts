import { task, types } from "hardhat/config";

task("verify-etherscan", "Verify deployed contract on Etherscan asdasdasdasdasd")
  .addParam("contractAddress", "Contract address deployed", undefined, types.string)
  .setAction(async ({ contractAddress }: { contractAddress: string }, hre) => {
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        contract: "contracts/erc20.sol:MyToken",
      });
    } catch (e) {
      console.error(e);
    }
  });
