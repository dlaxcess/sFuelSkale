import {
    type Chain,
    type EIP1193Provider,
    type Transport,
    type WalletClientConfig,
    type WalletClient,
    type PublicClient,
    custom,
    createWalletClient,
    createPublicClient,
    type EstimateGasParameters,
    type TransactionSerializable,
    type OneOf
} from 'viem';

import { skaleEuropa } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import mineGasForTransaction from '$lib/skale-miner';

import { scaleFaucets } from './skaleFaucets';

interface ExtendedTransaction {
    to: `0x${string}`;
    data: `0x${string}`;
    nonce: number;
    gas?: bigint;
    gasPrice?: bigint;
}

let _sessionPrivateKey: `0x${string}`;

const rmBytesSymbol = (address: string) => address.replace(/^0x/, '');

const faucetAddressGet = (chainId: number): `0x${string}` => scaleFaucets[chainId]

const functionSignatureGet = (chainId: number): `0x${string}` => {
    const functionSignature = chainId === skaleEuropa.id ? "0x6a627842" : "0x0c11dedd";
    return `${functionSignature}000000000000000000000000`;
}

////////////////////////////////////////////////
const _windowEthereum = (): EIP1193Provider => {
    if (!window?.ethereum) throw new Error("windowEthereum: Install Web3 extension like Rabby or Metamask");

    return window.ethereum;
};

const _transportEthereum = (): WalletClientConfig<Transport, Chain | undefined> => {
    return { transport: custom(_windowEthereum()) };
};

////////////////////////////////////////////////
const receiveFunds = async (account: string) => {
    if (!account) throw new Error('No account provided');

    if (!_sessionPrivateKey) {
        _sessionPrivateKey = generatePrivateKey();
    }

    const transactionReceipt = await testReceive(_sessionPrivateKey, rmBytesSymbol(account));
    console.info('receiveFunds ~ transactionReceipt:', transactionReceipt);

    return transactionReceipt;
};

const testReceive = async (sessionPrivateKey: `0x${string}`, receiverAddress: string) => {
    const signer = privateKeyToAccount(sessionPrivateKey);
    const sessionAccount = signer.address;
    console.info('New sessionAccount generated: ' + sessionAccount);

    const publicClient: PublicClient = createPublicClient({ account: sessionAccount, ..._transportEthereum() });
    const walletClient: WalletClient = createWalletClient({ account: sessionAccount, ..._transportEthereum() });
    const chainId = await publicClient.getChainId();
    console.log("testReceive ~ chainId:", chainId)

    const nonce = await publicClient.getTransactionCount({ address: sessionAccount });
    console.info('sessionAccount ~ nonce:', nonce);

    let tx: ExtendedTransaction = {
        to: faucetAddressGet(chainId),
        data: (functionSignatureGet(chainId) + receiverAddress) as `0x${string}`,
        nonce: nonce
    };

    const gas = await publicClient.estimateGas(tx as EstimateGasParameters);
    const { duration, gasPrice } = await mineGasForTransaction(nonce, Number(gas), sessionAccount);
    console.info('POW duration:', duration);

    tx = { ...tx, gas, gasPrice };
    console.info('Prepared ~ Tx:', tx);

    const signedTx = await signer.signTransaction(tx as OneOf<TransactionSerializable>);
    console.info('Signed ~ Tx:', signedTx);

    const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx
    });
    console.log("Tx ~ hash:", hash)

    return await publicClient.waitForTransactionReceipt({
        hash: hash,
    });
};

export { receiveFunds }