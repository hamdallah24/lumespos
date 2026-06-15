import { If as Web3Provider, _l as GenerateSignature } from "../../_chunks/index-Y6jcSkY1.js";
import { r as ModuleManager } from "../../_chunks/moduleManager-Duz7UJ-G.js";

//#region src/internal/clerk-js/web3.d.ts
type GetWeb3IdentifierParams = {
  provider: Web3Provider;
  walletName?: string;
};
type GenerateSignatureParams = {
  identifier: string;
  nonce: string;
};
type GenerateSolanaSignatureParams = GenerateSignatureParams & {
  walletName: string;
};
declare function createWeb3(moduleManager: ModuleManager): {
  getWeb3Identifier: (params: GetWeb3IdentifierParams) => Promise<string>;
  generateWeb3Signature: GenerateSignature;
  getMetamaskIdentifier: () => Promise<string>;
  getCoinbaseWalletIdentifier: () => Promise<string>;
  getOKXWalletIdentifier: () => Promise<string>;
  getBaseIdentifier: () => Promise<string>;
  getSolanaIdentifier: (walletName: string) => Promise<string>;
  generateSignatureWithMetamask: (params: GenerateSignatureParams) => Promise<string>;
  generateSignatureWithCoinbaseWallet: (params: GenerateSignatureParams) => Promise<string>;
  generateSignatureWithOKXWallet: (params: GenerateSignatureParams) => Promise<string>;
  generateSignatureWithBase: (params: GenerateSignatureParams) => Promise<string>;
  generateSignatureWithSolana: (params: GenerateSolanaSignatureParams) => Promise<string>;
};
//#endregion
export { createWeb3 };
//# sourceMappingURL=web3.d.ts.map