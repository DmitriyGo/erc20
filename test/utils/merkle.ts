import { ethers } from "ethers";

export function getRoot(data: string[]): string {
  const parity: boolean = !(data.length % 2);

  const length = parity ? data.length : data.length - 1;
  const result = [];
  for (let i = 0; i < length - 1; i += 2) {
    result.push(getPair(data[i], data[i + 1]));
  }

  if (!parity) {
    result.push(data[data.length - 1]);
  }

  return result.length === 1 ? result[0] : getRoot(result);
}

function getPair(hashOne: string, hashTwo: string): string {
  if (BigInt(hashOne) < BigInt(hashTwo)) {
    return ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [hashOne, hashTwo]);
  } else {
    return ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [hashTwo, hashOne]);
  }
}
