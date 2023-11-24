export type WithAlchemyKey<T extends object = {}> = {
  alchemykey: string;
} & T;

export type WithPrivateKey<T extends object = {}> = {
  privatekey: string;
} & T;
