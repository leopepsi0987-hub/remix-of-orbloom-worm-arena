import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { walletAction } from '@/lib/gold.functions';
import type { Wallet } from '@/lib/gold';

export function useWallet() {
  const call = useServerFn(walletAction);
  const token = useRef('');
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, owned: ['emerald'], equipped: 'emerald', reward: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const perform = async (action: 'load' | 'skin' | 'start' | 'finish', skin?: string, match?: string) => {
    if (!token.current) return null;
    try {
      setError('');
      const result = await call({ data: { token: token.current, action, skin, match } });
      setWallet(result); setReady(true); return result;
    } catch { setError('Gold save unavailable. Retry'); return null; }
  };
  useEffect(() => {
    let secret = localStorage.getItem('wormz.wallet');
    if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
      secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('wormz.wallet', secret);
    }
    token.current = secret;
    void perform('load');
  }, []);
  const buy = async (skin: string) => { if (busy) return; setBusy(true); const result = await perform('skin', skin); setBusy(false); return result; };
  return { wallet, ready, busy, error, buy, retry: () => perform('load'), start: (match: string) => perform('start', undefined, match), finish: (match: string) => perform('finish', undefined, match) };
}