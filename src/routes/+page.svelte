<script lang="ts">
	import { onMount } from 'svelte';
	import Web3 from 'web3';

	// import { mineGasForTransaction } from '@skaleproject/skale.js';

	let web3;
	let userAccount;

	let nonce;
	let gasPrice;

	let tx;

	let contractAddress = '0x02891b34B7911A9C68e82C193cd7A6fBf0c3b30A';

	onMount(async () => {
		web3 = new Web3(window.ethereum);
		userAccount = (await window.ethereum.request({ method: 'eth_accounts' }))[0];
		let sessionKeyCredentials = await web3.eth.accounts.create();
		window.sessionKey = sessionKeyCredentials.privateKey;
		window.sessionKeyAddress = sessionKeyCredentials.address;
		console.log('New sessionKey generated: ' + sessionKeyCredentials.address);
		nonce = await web3.eth.getTransactionCount(window.sessionKeyAddress);
		gasPrice = await web3.eth.getGasPrice();
		tx = {
			from: window.sessionKeyAddress,
			to: contractAddress,
			data: '0x0c11dedd000000000000000000000000' + userAccount.replace(/^0x/, ''),
			value: web3.utils.toWei('100', 'ether'),
			gas: web3.utils.toHex('23000'),
			nonce: nonce,
			gasPrice
		};
		console.log('onMount ~ userAccount:', userAccount);
		console.log('onMount ~ window.sessionKey:', window.sessionKey);
		console.log('onMount ~ window.sessionKeyAddress:', window.sessionKeyAddress);
		console.log('onMount ~ nonce:', nonce);
		console.log('onMount ~ tx:', tx);
	});

	const getSFuel = async () => {
		// await mineGasForTransaction(web3, tx);

		let signed = await web3.eth.accounts.signTransaction(tx, window.sessionKey);
		web3.eth.sendSignedTransaction(signed.rawTransaction);
	};
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<button on:click={getSFuel}>Send</button>
