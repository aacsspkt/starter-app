import './App.css';

import { useState } from 'react';

import BigNumber from 'bignumber.js';

import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
} from '@solana/web3.js';

const parseTokenAmount = async (connection, mintAddress, amount) => {
  if (!(connection instanceof Connection) || !(mintAddress instanceof PublicKey) || typeof amount !== "number") {
    throw new Error("Invalid argument type");
  }
  const mint = await getMint(connection, mintAddress, "confirmed");
  console.log("mint", mint);

  const unitsPerToken = new BigNumber(10).pow(new BigNumber(mint.decimals));
  console.log("unitsPerToken", unitsPerToken);

  const parseAmount = new BigNumber(amount).multipliedBy(unitsPerToken);
  return BigInt(parseAmount.toFixed());
}


function App() {
  const provider = window.phantom?.solana;
  const [fromAddress, setFromAddress] = useState(PublicKey.default);

  (async () => {
    if (!provider.publicKey) {
      await provider.connect();
      setFromAddress(provider.publicKey);
    }
  })()

  const mintAddress = new PublicKey("BEcGFQK1T1tSu3kvHC17cyCkQ5dvXqAJ7ExB2bb5Do7a");
  const toAddress = new PublicKey("CSbNAhedp9JBjchyoPdBH4QWgmrncuhx6SwQxv4gdqhP");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const amount = 10;

  const handleTransfer = async (e) => {
    let transaction = new Transaction();
    try {
      const fromTokenWallet = await getAssociatedTokenAddress(
        mintAddress,
        fromAddress,
      );
      console.log("fromTokenWallet", fromTokenWallet.toString());

      const toTokenWallet = await getAssociatedTokenAddress(
        mintAddress,
        toAddress,
        true
      );
      console.log("toTokenWallet", toTokenWallet.toString());

      const tokenAccountInfo = await connection.getAccountInfo(toTokenWallet);
      if (!tokenAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromAddress, // fee payer
            toTokenWallet,
            toAddress,
            mintAddress
          )
        );
      }

      const tokenAmount = await parseTokenAmount(connection, mintAddress, amount);
      console.log("tokenAmount", tokenAmount);

      transaction.add(
        createTransferInstruction(
          fromTokenWallet,
          toTokenWallet,
          fromAddress,
          tokenAmount
        )
      );

      transaction.feePayer = fromAddress;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      console.log(transaction);

      const signedTxn = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTxn.serialize()
      );
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed"
      );
      console.log(signature);
    } catch (error) {
      console.log((error instanceof SendTransactionError) ? error.logs : error);
    }
  }

  return (
    <div className="App">
      <button onClick={handleTransfer}>Transfer</button>
    </div>
  );

}

export default App;
