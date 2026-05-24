import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from './lib/firebase';
import './index.css';

export default function App() {
  const [data, setData] = useState({ total: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Jalur data stats di Realtime Database
    const statsRef = ref(db, 'stats');
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData({
          total: val.total || 0,
          saldo: val.saldo || 0
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleIncrement = () => {
    const statsRef = ref(db, 'stats');
    update(statsRef, {
      total: data.total + 1
    });
  };

  return (
    <div className="theme-dark min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="glass p-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            smartgadget deploy
          </h1>
          <p className="text-xs text-muted uppercase tracking-[0.2em]">Realtime Sync Active</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-10 space-y-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted animate-pulse">Menghubungkan ke RTDB...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="group flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <span className="text-secondary text-sm">Total Progress</span>
              <span className="text-2xl font-mono text-accent">{data.total}</span>
            </div>

            <div className="group flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/20 transition-all">
              <span className="text-secondary text-sm">Saldo Terkunci</span>
              <span className="text-2xl font-mono text-emerald-400">
                Rp{data.saldo.toLocaleString()}
              </span>
            </div>

            <button 
              onClick={handleIncrement}
              className="btn-primary w-full py-4 shadow-lg shadow-white/5 active:scale-95"
            >
              Tambah Progress
            </button>
          </div>
        )}
      </div>
      <p className="mt-10 text-[10px] text-muted/30 uppercase tracking-widest">
        Handcrafted by Nurma Engine
      </p>
    </div>
  );
}