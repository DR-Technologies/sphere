'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RetryState { requestId: string; retryToken: string }

export default function AccountDeletionRecoveryPage() {
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [status, setStatus] = useState('Cargando solicitud...');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const value = localStorage.getItem('sphere-account-deletion-retry');
      const parsed = value ? JSON.parse(value) as RetryState : null;
      setRetry(parsed);
      setStatus(parsed ? 'La limpieza quedó incompleta. Puedes reintentarla de forma segura.' : 'No hay una eliminación pendiente en este navegador.');
    } catch { setStatus('No se pudo leer la solicitud pendiente.'); }
  }, []);

  const retryDeletion = async () => {
    if (!retry) return;
    setBusy(true); setStatus('Reintentando limpieza...');
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(retry)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'El reintento no terminó.');
      localStorage.removeItem('sphere-account-deletion-retry');
      setRetry(null); setStatus('La cuenta y sus recursos fueron eliminados.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'El reintento falló.'); }
    finally { setBusy(false); }
  };

  return <main className="recovery"><section className="glass-card"><h1>Eliminación de cuenta</h1><p>{status}</p>{retry && <button onClick={retryDeletion} disabled={busy}>{busy ? 'Reintentando...' : 'Reintentar eliminación'}</button>}<Link href="/">Volver a Sphere</Link></section><style jsx>{`.recovery{min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--background);color:var(--text-primary)}section{width:min(520px,100%);padding:32px}h1{margin:0 0 12px}p{color:var(--text-muted);line-height:1.6}button,a{display:inline-flex;margin:18px 12px 0 0;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--primary);color:var(--shell-inverse-text);font-weight:650;text-decoration:none;cursor:pointer}a{background:var(--surface-light);color:var(--text-primary)}`}</style></main>;
}
