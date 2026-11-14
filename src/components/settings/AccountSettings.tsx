'use client';

import { useEffect, useState } from 'react';
import { CreditCard, KeyRound, Mail, ShieldAlert, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AccountOverview } from '@/lib/account/types';

type Notice = { kind: 'success' | 'error' | 'info'; message: string } | null;

async function authenticatedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Debes iniciar sesión.');
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}`, ...init?.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la operación.');
  return payload;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value)) : 'No disponible';
}

function limitLabel(value: number | null) {
  return value === null ? 'Sin límite' : String(value);
}

export default function AccountSettings() {
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordNonce, setPasswordNonce] = useState('');
  const [deleteNonce, setDeleteNonce] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const next = await authenticatedFetch('/api/account') as AccountOverview;
      setOverview(next);
      setName(next.user.name);
      setEmail('');
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar la cuenta.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key); setNotice(null);
    try { await action(); setNotice({ kind: 'success', message: success }); }
    catch (error) { setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'La operación falló.' }); }
    finally { setBusy(''); }
  };

  const saveName = () => run('name', async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new Error('Ingresa un nombre válido.');
    const { data: current } = await supabase.auth.getUser();
    const { error } = await supabase.auth.updateUser({ data: { ...(current.user?.user_metadata || {}), full_name: trimmed, name: trimmed } });
    if (error) throw error;
    await load();
  }, 'Nombre actualizado.');

  const changeEmail = () => run('email', async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) throw new Error('Ingresa un correo válido.');
    const { error } = await supabase.auth.updateUser({ email: nextEmail }, { emailRedirectTo: `${window.location.origin}/auth/callback` });
    if (error) throw error;
    setEmail('');
    await load();
  }, 'Solicitud enviada. El correo cambiará cuando completes la verificación.');

  const requestReauthentication = (target: 'password' | 'delete') => run(`reauth-${target}`, async () => {
    if (target === 'delete') {
      await authenticatedFetch('/api/account/delete/reauthenticate', { method: 'POST', body: '{}' });
      return;
    }
    const { error } = await supabase.auth.reauthenticate();
    if (error) throw error;
  }, 'Enviamos un código de verificación a tu correo.');

  const changePassword = () => run('password', async () => {
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (!/^\d{6}$/.test(passwordNonce)) throw new Error('Ingresa el código de 6 dígitos.');
    const { error } = await supabase.auth.updateUser({ password, nonce: passwordNonce });
    if (error) throw error;
    setPassword(''); setPasswordNonce('');
  }, 'Contraseña actualizada.');

  const openBilling = (kind: 'portal' | 'checkout', plan?: 'pro' | 'enterprise') => run(`billing-${plan || kind}`, async () => {
    const payload = await authenticatedFetch(`/api/account/billing/${kind}`, { method: 'POST', body: JSON.stringify(plan ? { plan } : {}) });
    if (!payload.url) throw new Error('Stripe no devolvió una URL válida.');
    window.location.assign(payload.url);
  }, 'Abriendo Stripe Test Mode...');

  const deleteAccount = () => run('delete', async () => {
    if (deleteConfirmation !== 'ELIMINAR MI CUENTA') throw new Error('Escribe ELIMINAR MI CUENTA para confirmar.');
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) throw new Error('Debes iniciar sesión.');
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.session.access_token}` },
      body: JSON.stringify({ confirmation: deleteConfirmation, nonce: deleteNonce })
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.retry) {
      localStorage.setItem('sphere-account-deletion-retry', JSON.stringify(payload.retry));
    }
    if (!response.ok) {
      if (payload.retry) window.location.assign('/account/delete');
      throw new Error(payload.error || 'La eliminación no terminó. Puedes reintentarla.');
    }
    localStorage.removeItem('sphere-account-deletion-retry');
    await supabase.auth.signOut({ scope: 'local' });
    window.location.assign('/');
  }, 'Cuenta eliminada.');

  if (loading && !overview) return <div className="account-loading">Cargando tu cuenta...</div>;
  if (!overview) return <div className="account-loading">No fue posible cargar la información de tu cuenta.</div>;

  return (
    <div className="account-settings">
      {notice && <div className={`account-notice ${notice.kind}`} role="status">{notice.message}</div>}

      <section className="glass-card account-card">
        <div className="account-heading"><span className="account-icon"><UserRound size={22} /></span><div><h2>Mi perfil</h2><p>Tu identidad visible dentro de Sphere.</p></div></div>
        <div className="account-grid">
          <label><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Correo confirmado</span><input value={overview.user.email} readOnly /></label>
          <label><span>Fecha de registro</span><input value={formatDate(overview.user.createdAt)} readOnly /></label>
          <label><span>Último acceso</span><input value={formatDate(overview.user.lastSignInAt)} readOnly /></label>
        </div>
        <button className="account-primary" onClick={saveName} disabled={busy === 'name'}>{busy === 'name' ? 'Guardando...' : 'Guardar nombre'}</button>
      </section>

      <section className="glass-card account-card">
        <div className="account-heading"><span className="account-icon"><KeyRound size={22} /></span><div><h2>Seguridad</h2><p>Cambios protegidos por los mecanismos de verificación de Supabase.</p></div></div>
        <div className="security-block">
          <h3><Mail size={17} /> Cambiar correo</h3>
          {overview.user.pendingEmail && <p className="pending">Pendiente de confirmar: {overview.user.pendingEmail}</p>}
          <div className="account-row"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nuevo@correo.com" /><button className="account-secondary" onClick={changeEmail} disabled={busy === 'email'}>Solicitar cambio</button></div>
        </div>
        <div className="security-block">
          <h3><KeyRound size={17} /> Cambiar contraseña</h3>
          <div className="account-row"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña" /><input inputMode="numeric" maxLength={6} value={passwordNonce} onChange={(event) => setPasswordNonce(event.target.value.replace(/\D/g, ''))} placeholder="Código" /></div>
          <div className="account-actions"><button className="account-secondary" onClick={() => requestReauthentication('password')}>Enviar código</button><button className="account-primary" onClick={changePassword} disabled={busy === 'password'}>Actualizar contraseña</button></div>
        </div>
      </section>

      <section className="glass-card account-card">
        <div className="account-heading"><span className="account-icon"><CreditCard size={22} /></span><div><h2>Suscripción</h2><p>El rol de seguridad y el plan comercial permanecen separados.</p></div></div>
        <div className="plan-summary"><div><span>Plan actual</span><strong>{overview.subscription.plan.toUpperCase()}</strong><small>{overview.subscription.source === 'admin' ? 'Asignado por administración' : overview.subscription.status}</small></div><div><span>Uso</span><strong>{overview.usage.datasets} datasets · {overview.usage.reports} reportes · {overview.usage.stories} Stories</strong><small>Límites: {limitLabel(overview.limits.maxDatasets)} datasets, {limitLabel(overview.limits.maxReportsPerDataset)} reportes/dataset, {overview.limits.maxWidgetsPerReport} widgets</small></div></div>
        {!overview.billingConfigured && <p className="pending">Stripe Test Mode aún no está configurado en este entorno.</p>}
        <div className="account-actions">
          <button className="account-secondary" disabled={!overview.billingConfigured || Boolean(overview.subscription.adminOverride)} onClick={() => openBilling('checkout', 'pro')}>Elegir Pro</button>
          <button className="account-secondary" disabled={!overview.billingConfigured || Boolean(overview.subscription.adminOverride)} onClick={() => openBilling('checkout', 'enterprise')}>Elegir Enterprise</button>
          {overview.subscription.hasStripeCustomer && <button className="account-primary" onClick={() => openBilling('portal')}>Administrar renovación</button>}
        </div>
      </section>

      <section className="glass-card account-card danger-card">
        <div className="account-heading"><span className="account-icon danger"><ShieldAlert size={22} /></span><div><h2>Eliminar cuenta</h2><p>Elimina definitivamente tus recursos y acceso. Esta acción no se puede deshacer.</p></div></div>
        <p className="resource-summary">Se eliminarán {overview.deletion.datasets} datasets, {overview.deletion.reports} reportes, {overview.deletion.stories} Stories y {overview.deletion.exports} exportaciones asociadas.</p>
        <div className="account-row"><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="ELIMINAR MI CUENTA" /><input inputMode="numeric" maxLength={6} value={deleteNonce} onChange={(event) => setDeleteNonce(event.target.value.replace(/\D/g, ''))} placeholder="Código" /></div>
        <div className="account-actions"><button className="account-secondary" onClick={() => requestReauthentication('delete')}>Verificar identidad</button><button className="account-danger" disabled={busy === 'delete'} onClick={deleteAccount}>{busy === 'delete' ? 'Eliminando...' : 'Eliminar definitivamente'}</button></div>
      </section>

      <style jsx>{`
        .account-settings{display:grid;gap:20px;margin-top:20px}.account-card{padding:28px}.account-heading{display:flex;align-items:center;gap:14px;margin-bottom:22px}.account-heading h2{font-size:1.2rem;margin:0;color:var(--text-primary)}.account-heading p{margin:4px 0 0;color:var(--text-muted);font-size:.88rem}.account-icon{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--border);border-radius:10px;color:var(--primary);background:var(--surface-light)}.account-icon.danger{color:#dc5252}.account-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.account-grid label,.account-row{min-width:0}.account-grid label span{display:block;font-size:.78rem;color:var(--text-muted);margin-bottom:7px}.account-card input{width:100%;min-width:0;padding:11px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-light);color:var(--text-primary);outline:none}.account-card input:focus{border-color:var(--primary)}.account-card input[readonly]{color:var(--text-muted)}.account-primary,.account-secondary,.account-danger{padding:10px 15px;border-radius:8px;font-weight:650;cursor:pointer;border:1px solid var(--border);margin-top:16px}.account-primary{background:var(--primary);border-color:var(--primary);color:var(--shell-inverse-text)}.account-secondary{background:var(--surface-light);color:var(--text-primary)}.account-danger{background:#b93636;border-color:#b93636;color:white}.account-primary:disabled,.account-secondary:disabled,.account-danger:disabled{cursor:not-allowed;opacity:.55}.security-block{padding:18px 0;border-top:1px solid var(--border)}.security-block h3{display:flex;align-items:center;gap:8px;font-size:.95rem;margin:0 0 12px}.account-row{display:flex;gap:10px}.account-actions{display:flex;flex-wrap:wrap;gap:10px}.account-actions button{margin-top:12px}.pending{color:var(--text-muted);font-size:.86rem}.plan-summary{display:grid;grid-template-columns:1fr 2fr;gap:16px}.plan-summary>div{display:flex;flex-direction:column;gap:5px;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface-light)}.plan-summary span,.plan-summary small{color:var(--text-muted);font-size:.78rem}.resource-summary{color:var(--text-secondary)}.danger-card{border-color:color-mix(in srgb,#dc5252 42%,var(--border))}.account-notice{padding:12px 14px;border-radius:8px;border:1px solid var(--border)}.account-notice.success{color:#178454;background:rgba(23,132,84,.08)}.account-notice.error{color:#c34444;background:rgba(195,68,68,.08)}.account-notice.info{color:var(--text-primary);background:var(--surface-light)}.account-loading{padding:30px;color:var(--text-muted)}@media(max-width:720px){.account-card{padding:20px}.account-grid,.plan-summary{grid-template-columns:1fr}.account-row{flex-direction:column}}
      `}</style>
    </div>
  );
}
