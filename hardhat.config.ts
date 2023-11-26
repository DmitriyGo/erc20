import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

import { getSepoliaAlchemyUrl } from "./helpers/alchemy";
import "./tasks";

import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: getSepoliaAlchemyUrl(process.env.SEPOLIA_API_KEY || ""),
      accounts: process.env.PRIVATE_KEY !== undefined ? [`0x${process.env.PRIVATE_KEY}`] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
