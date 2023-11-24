export const getAlchemyUrl = (prefix: string, alchemyKey: string): string =>
  `https://${prefix}.g.alchemy.com/v2/${alchemyKey}`;

export const getSepoliaAlchemyUrl = (alchemyKey: string) => getAlchemyUrl("eth-sepolia", alchemyKey);
