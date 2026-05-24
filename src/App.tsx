import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from './lib/firebase';
import './index.css';

export default function App() {
  const [data, setData] = useState({ total: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataRef = ref(db, 'stats/');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData({
          total: val.total || 0,
          saldo: val.saldo || 0 // Saldo tetap dipertahankan sesuai aslinya
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateTotal = (newTotal: number) => {
    set(ref(db, 'stats/total'), newTotal);
  };

  return (
    <div className="theme-dark min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="glass p-10 w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-center">Realtime Dashboard</h1>
        {loading ? (
          <p className="text-center text-muted animate-pulse">Menghubungkan ke RTDB...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-secondary">Total Progress</span>
              <span className="text-xl font-mono text-accent">{data.total}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-secondary">Saldo (Locked)</span>
              <span className="text-xl font-mono text-emerald-400">Rp{data.saldo.toLocaleString()}</span>
            </div>
            <button 
              onClick={() => handleUpdateTotal(data.total + 1)}
              className="btn-primary w-full"
            >
              Tambah Total
            </button>
          </div>
        )}
      </div>
    </div>
  );
}