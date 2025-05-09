import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const { publicKey } = useWallet();
  const [solAmount, setSolAmount] = useState(1);
  const [presaleData, setPresaleData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Load presale data
    fetch(import.meta.env.VITE_API_URL + '/presale-data')
      .then(res => res.json())
      .then(setPresaleData);

    // Real-time transactions
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data()));
    });

    return unsubscribe;
  }, []);

  const buyTokens = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toString(),
          solAmount: solAmount
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Success! TX: ${result.txSignature}`);
      }
    } catch (error) {
      alert('Transaction failed: ' + error.message);
    }
  };

  return (
    <div className="container">
      <WalletMultiButton />
      
      {presaleData && (
        <div className="stats">
          <h2>Presale Phase {presaleData.phase + 1}</h2>
          <p>Tokens Sold: {presaleData.sold.toLocaleString()}</p>
          <p>SOL Collected: {presaleData.collected}</p>
        </div>
      )}

      {publicKey && (
        <div className="buy-section">
          <input
            type="number"
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            min="0.1"
            step="0.1"
          />
          <button onClick={buyTokens}>
            Buy Tokens ({solAmount * (presaleData?.phase !== undefined ? 
              [1000000, 600000, 450000][presaleData.phase] : 0)} tokens)
          </button>
        </div>
      )}

      <div className="transactions">
        <h3>Recent Purchases</h3>
        {transactions.map((tx, i) => (
          <div key={i} className="tx">
            <span>{tx.user.slice(0, 4)}...{tx.user.slice(-4)}</span>
            <span>{tx.sol} SOL</span>
            <span>{(tx.tokens / 1e9).toLocaleString()} tokens</span>
          </div>
        ))}
      </div>

      <div className="disclaimer">
        <p>⚠️ Unsold tokens will be burned after presale</p>
        <p>10% airdrop to buyers • 33% liquidity pool</p>
      </div>
    </div>
  );
}
