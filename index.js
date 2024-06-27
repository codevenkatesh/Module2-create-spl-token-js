import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';

async function main() {
    try {
        // Step 1: Connect to Solana Devnet and generate new keypairs
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const fromWallet = Keypair.generate();
        const toWallet = Keypair.generate();

        // Step 2: Airdrop SOL into fromWallet
        console.log(`Requesting airdrop for ${fromWallet.publicKey.toBase58()}`);
        await requestAirdrop(connection, fromWallet.publicKey);

        // Step 3: Create new token mint and get fromTokenAccount
        const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9);
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromWallet.publicKey);

        // Step 4: Mint tokens to fromTokenAccount
        const amountToMint = 1000000000; // Amount in smallest unit (lamports)
        let mintSignature = await mintTo(connection, fromWallet, mint, fromTokenAccount.address, fromWallet.publicKey, amountToMint);
        console.log('Mint transaction:', mintSignature);

        // Step 5: Get or create toTokenAccount
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet.publicKey);

        // Step 6: Transfer tokens from fromTokenAccount to toTokenAccount
        let transferSignature = await transfer(connection, fromWallet, fromTokenAccount.address, toTokenAccount.address, fromWallet.publicKey, amountToMint);
        console.log('Transfer transaction:', transferSignature);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function requestAirdrop(connection, publicKey) {
    const lamports = LAMPORTS_PER_SOL; // Request 1 SOL (in lamports)
    let retries = 5;
    while (retries > 0) {
        try {
            const signature = await connection.requestAirdrop(publicKey, lamports);
            await connection.confirmTransaction(signature, { commitment: 'confirmed' });
            console.log('Airdrop successful:', signature);
            return;
        } catch (error) {
            console.error('Error requesting airdrop:', error.message);
            if (error.message.includes('429')) {
                console.log('Rate limit exceeded. Waiting before retrying...');
                await sleep(retries * 4000); // Exponential backoff with longer delay
                retries--;
            } else {
                throw new Error('Airdrop request failed.');
            }
        }
    }
    throw new Error('Max retries reached. Airdrop request failed.');
}

// Utility function for delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute main function
main();
