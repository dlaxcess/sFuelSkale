<script lang="ts">
	import { onMount } from 'svelte';

	import 'viem/window';
	import { skaleCalypso, skaleCalypsoTestnet } from 'viem/chains';
	import type { WalletClient, PublicClient } from 'viem';
	import { createPublicClient, createWalletClient, custom } from 'viem';
	import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

	import mineGasForTransaction from '$lib/skale-miner';
	import Web3 from 'web3';

	let client: PublicClient;
	let walletClient: WalletClient;

	let account: string;
	let chainId: number;

	let payerAbi = JSON.parse(
		'[ { "inputs": [], "stateMutability": "payable", "type": "constructor" }, { "stateMutability": "payable", "type": "fallback" }, { "inputs": [], "name": "getBalance", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address payable", "name": "receiver", "type": "address" } ], "name": "pay", "outputs": [], "stateMutability": "payable", "type": "function" }, { "stateMutability": "payable", "type": "receive" } ]'
	);

	// Mainnet
	let mainnetContractAddress = '0x02891b34B7911A9C68e82C193cd7A6fBf0c3b30A';
	// Testnet
	let contractAddress = '0x62Fe932FF26e0087Ae383f6080bd2Ed481bA5A8A';

	let sessionPrivateKey;
	let sessionAccount;

	$: console.log('account switch', account);
	$: console.log('chainId switch', chainId);
	$: console.log('sessionPrivateKey:', sessionPrivateKey);
	$: console.log('sessionAccount:', sessionAccount);

	onMount(async () => {
		if (typeof window.ethereum !== 'undefined') {
			if (!account) {
				await window.ethereum.enable(); // <<< ask for permission
			}

			client = createPublicClient({
				chain: skaleCalypsoTestnet,
				transport: custom(window.ethereum)
			});

			walletClient = createWalletClient({
				chain: skaleCalypsoTestnet,
				transport: custom(window.ethereum)
			});

			account = await getAddress();
			chainId = await client.getChainId();

			window.ethereum.on('accountsChanged', (_accounts: string[]) => {
				console.log('🚀 ~ file: +page.svelte:29 ~ window.ethereum.on ~ _accounts:', _accounts);
				account = _accounts[0];
			});

			window.ethereum.on('chainChanged', (_chainId: string) => {
				console.log('🚀 ~ file: +page.svelte:33 ~ window.ethereum.on ~ _chainId:', _chainId);
				chainId = parseInt(_chainId, 16);
				console.log(
					'🚀 ~ file: +page.svelte:34 ~ window.ethereum.on ~ _chainId.toString():',
					parseInt(_chainId, 16)
				);
			});
		}
	});

	// VIEM
	const getAddress = async () => {
		const addresses = await walletClient.getAddresses();
		console.log('addresses:', addresses);
		console.log('address current:', addresses[0]);
		return addresses[0];
	};

	const getAddresses = async () => {
		const addresses = await walletClient.getAddresses();
		console.log('addresses:', addresses);
		console.log('address current:', addresses[0]);
		return addresses;
	};

	const getBalance = async () => {
		const balance = await client.getBalance({
			address: await getAddress()
		});
		console.log('🚀 ~ file: +page.svelte:75 ~ getBalance ~ balance:', balance);
		return balance;
	};

	const getBlockNumber = async () => {
		const blockNumber = await client.getBlockNumber();
		console.log('🚀 ~ file: +page.svelte:81 ~ getBlockNumber ~ blockNumber:', blockNumber);
		return blockNumber;
	};

	// const readContract = async () => {
	// 	const result = await client.readContract({
	// 		...{ abi, address: address as `0x${string}` },
	// 		functionName: 'hi'
	// 	});
	// 	console.log('readContract ~ result:', result);
	// };
	const rmBytesSymbol = (address: string) => address.replace(/^0x/, '');

	const getFuel = async () => {
		if (!account) {
			await window.ethereum.enable(); // <<< ask for permission
		}

		if (!sessionPrivateKey) {
			sessionPrivateKey = generatePrivateKey();
		}

		const res = await testReceive(sessionPrivateKey, contractAddress, rmBytesSymbol(account));

		// const result = await client.readContract({
		// 	abi: payerAbi,
		// 	address: '0x02891b34B7911A9C68e82C193cd7A6fBf0c3b30A',
		// 	functionName: 'pay',
		// 	args: ['0xd3cEB1eA2AbC16F480b9228E905dc4252EC1Beb4']
		// });
		console.log('getFuel ~ result:', res);
	};

	const testReceive = async (sessionPrivateKey, contractAddress, receiverAddress) => {
		sessionAccount = privateKeyToAccount(sessionPrivateKey).address;
		console.log('New sessionKey generated: ' + sessionAccount);
		let nonce = await client.getTransactionCount({ address: sessionAccount });
		console.log('testReceive ~ nonce:', nonce);

		let tx = {
			from: sessionAccount,
			to: contractAddress,
			data: '0x0c11dedd000000000000000000000000' + receiverAddress,
			nonce: nonce
		};
		const gas = await client.estimateGas(tx);
		console.log('testReceive ~ gas:', gas);

		tx = { ...tx, gas: gas };
		console.log('testReceive ~ tx:', tx);

		tx = { ...tx, ...(await mineGasForTransaction(nonce, Number(gas), sessionAccount)) };
		console.log('testReceive ~ tx:', tx);

		const signerAccount = privateKeyToAccount(sessionPrivateKey);
		const signedTx = await signerAccount.signTransaction(tx);

		// const signedTx = await walletClient.signTransaction({
		// 	account: sessionAccount,
		// 	...tx
		// });
		console.log('testReceive ~ signedTx:', signedTx);

		// const signature = await walletClient.sendRawTransaction({
		// 	serializedTransaction: signedTx
		// });
		// console.log('testReceive ~ signature:', signature);

		return await walletClient.sendRawTransaction({
			serializedTransaction: signedTx
		});
		// return await walletClient.sendRawTransaction({
		// 	serializedTransaction: signedTx.rawTransaction
		// });

		// let signed = await web3.eth.accounts.signTransaction(tx, sessionPrivateKey);
		// return web3.eth.sendSignedTransaction(signed.rawTransaction);
	};

	const connectMetamask = async () => {
		if (typeof window.ethereum !== 'undefined') {
			[account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
		}
	};
</script>

<div class="user-config">
	{#if !account}
		<button class="btn-connect" on:click={connectMetamask}>
			Connect your Metamask and choose your files
		</button>
	{/if}

	<div class="provisory">
		<button on:click={getAddress}>get address</button>
		<button on:click={getBalance}>get balance</button>
		<button on:click={getBlockNumber}>get block number</button>
		<button on:click={getFuel}>Get sFuel</button>
	</div>

	{#if account}
		<p class="field-account">{account}</p>
		<p class="field-account">Chain ID : {chainId}</p>
	{/if}
</div>
