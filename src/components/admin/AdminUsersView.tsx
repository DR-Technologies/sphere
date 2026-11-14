'use client';

import React from 'react';
import {
  Ban,
  Database,
  FileBarChart,
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  AccountStatus,
  AdminRole,
  AdminUserSummary,
  SubscriptionPlan
} from '@/lib/admin/types';

async function authenticatedAdminRequest(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers
    }
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
  return body;
}
function formatAdminDate(value: string | null) {
  if (!value) return 'Sin acceso';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function limitLabel(value: number | null) {
  return value === null ? 'Sin límite' : String(value);
}

export default function AdminUsersView() {
  const [users, setUsers] = React.useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | AdminRole>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'suspended' | 'invited'>('all');
  const [invite, setInvite] = React.useState({
    email: '',
    name: '',
    role: 'standard' as AdminRole,
    subscriptionPlan: 'free' as SubscriptionPlan
  });
  const [inviting, setInviting] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await authenticatedAdminRequest('/api/admin/users') as { users?: AdminUserSummary[] };
      setUsers(body.users || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const visibleUsers = users.filter((user) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query
      || user.name.toLocaleLowerCase().includes(query)
      || user.email.toLocaleLowerCase().includes(query);
    return matchesSearch
      && (roleFilter === 'all' || user.role === roleFilter)
      && (statusFilter === 'all' || user.status === statusFilter);
  });

  const updateAccess = async (user: AdminUserSummary, patch: Partial<{
    role: AdminRole;
    subscriptionPlan: SubscriptionPlan;
    status: AccountStatus;
  }>) => {
    setBusyUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      const body = await authenticatedAdminRequest(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: patch.role ?? user.role,
          subscriptionPlan: patch.subscriptionPlan ?? user.subscriptionPlan,
          status: patch.status ?? user.accessStatus
        })
      }) as { user?: AdminUserSummary };
      if (body.user) {
        setUsers((current) => current.map((item) => item.id === user.id ? body.user as AdminUserSummary : item));
      }
      setNotice('Acceso actualizado correctamente.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la cuenta.');
    } finally {
      setBusyUserId(null);
    }
  };

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const body = await authenticatedAdminRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(invite)
      }) as { user?: AdminUserSummary };
      if (body.user) setUsers((current) => [body.user as AdminUserSummary, ...current]);
      setInvite({ email: '', name: '', role: 'standard', subscriptionPlan: 'free' });
      setNotice('Invitación enviada.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'No se pudo enviar la invitación.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div>
          <div className="admin-eyebrow"><ShieldCheck size={15} /> SUPERADMIN</div>
          <h1>Administración de usuarios</h1>
          <p>Gestiona acceso, roles y planes sin mezclar permisos de seguridad con suscripciones.</p>
        </div>
        <button className="btn-secondary admin-refresh" onClick={() => void loadUsers()} disabled={loading}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      {error ? <div className="admin-message error" role="alert">{error}</div> : null}
      {notice ? <div className="admin-message success" role="status">{notice}</div> : null}

      <form className="glass-card invite-card" onSubmit={sendInvite}>
        <div className="section-heading">
          <div className="section-icon"><MailPlus size={20} /></div>
          <div>
            <h2>Invitar usuario</h2>
            <p>Supabase enviará un correo seguro para completar el acceso.</p>
          </div>
        </div>
        <div className="invite-fields">
          <label>
            <span>Nombre</span>
            <input value={invite.name} onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre opcional" />
          </label>
          <label>
            <span>Correo</span>
            <input type="email" required value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} placeholder="persona@empresa.com" />
          </label>
          <label>
            <span>Rol</span>
            <select value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value as AdminRole }))}>
              <option value="standard">Estándar</option>
              <option value="superadmin">SUPERADMIN</option>
            </select>
          </label>
          <label>
            <span>Plan</span>
            <select value={invite.subscriptionPlan} onChange={(event) => setInvite((current) => ({ ...current, subscriptionPlan: event.target.value as SubscriptionPlan }))}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <button className="btn-primary invite-button" type="submit" disabled={inviting}>
            {inviting ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </div>
      </form>

      <section className="users-section">
        <div className="users-toolbar">
          <div>
            <h2>Usuarios</h2>
            <p>{visibleUsers.length} de {users.length} cuentas</p>
          </div>
          <div className="filters">
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Buscar usuarios" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre o correo" />
            </label>
            <select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
              <option value="all">Todos los roles</option>
              <option value="standard">Estándar</option>
              <option value="superadmin">SUPERADMIN</option>
            </select>
            <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="invited">Invitado</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="glass-card users-empty">Cargando usuarios...</div>
        ) : visibleUsers.length === 0 ? (
          <div className="glass-card users-empty">No hay usuarios que coincidan con los filtros.</div>
        ) : (
          <div className="user-list">
            {visibleUsers.map((account) => (
              <article className="glass-card user-card" key={account.id} data-testid="admin-user-card">
                <div className="identity">
                  <div className="avatar">{account.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="identity-title">
                      <h3>{account.name}</h3>
                      {account.isCurrentUser ? <span className="you-badge">Tú</span> : null}
                      <span className={`status-badge ${account.status}`}>{account.status === 'active' ? 'Activo' : account.status === 'invited' ? 'Invitado' : 'Suspendido'}</span>
                    </div>
                    <p>{account.email}</p>
                    <small>Registro {formatAdminDate(account.createdAt)} · Último acceso {formatAdminDate(account.lastSignInAt)}</small>
                  </div>
                </div>

                <div className="usage-grid" aria-label={`Consumo de ${account.name}`}>
                  <div><Database size={15} /><strong>{account.datasets}</strong><span>Datasets</span></div>
                  <div><FileBarChart size={15} /><strong>{account.reports}</strong><span>Reportes</span></div>
                  <div><Sparkles size={15} /><strong>{account.stories}</strong><span>Stories</span></div>
                </div>

                <div className="access-controls">
                  <label>
                    <span>Rol de seguridad</span>
                    <select
                      aria-label={`Rol de ${account.email}`}
                      value={account.role}
                      disabled={busyUserId === account.id || account.isCurrentUser}
                      onChange={(event) => void updateAccess(account, { role: event.target.value as AdminRole })}
                    >
                      <option value="standard">Estándar</option>
                      <option value="superadmin">SUPERADMIN</option>
                    </select>
                  </label>
                  <label>
                    <span>Plan administrativo</span>
                    <select
                      aria-label={`Plan de ${account.email}`}
                      value={account.subscriptionPlan}
                      disabled={busyUserId === account.id}
                      onChange={(event) => void updateAccess(account, { subscriptionPlan: event.target.value as SubscriptionPlan })}
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>
                  <div className="limits-summary">
                    <span>Límites efectivos</span>
                    <strong>{limitLabel(account.limits.maxDatasets)} datasets · {limitLabel(account.limits.maxReportsPerDataset)} reportes/dataset · 9 widgets</strong>
                  </div>
                  <button
                    className={account.accessStatus === 'active' ? 'account-action suspend' : 'account-action reactivate'}
                    disabled={busyUserId === account.id || account.isCurrentUser}
                    onClick={() => void updateAccess(account, { status: account.accessStatus === 'active' ? 'suspended' : 'active' })}
                  >
                    {account.accessStatus === 'active' ? <><Ban size={16} /> Suspender</> : <><UserRoundCheck size={16} /> Reactivar</>}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .admin-view { padding: 40px; max-width: 1440px; margin: 0 auto; }
        .admin-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
        .admin-header h1 { margin: 8px 0 8px; font-size: clamp(2rem, 4vw, 2.75rem); letter-spacing: -0.04em; }
        .admin-header p, .section-heading p, .users-toolbar p { margin: 0; color: var(--text-muted); }
        .admin-eyebrow { display: inline-flex; align-items: center; gap: 7px; color: var(--primary); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.13em; }
        .admin-refresh { display: inline-flex; align-items: center; gap: 8px; }
        .admin-message { margin-bottom: 18px; padding: 12px 16px; border: 1px solid; border-radius: 8px; }
        .admin-message.error { color: #b42318; background: color-mix(in srgb, #ef4444 9%, var(--surface)); border-color: color-mix(in srgb, #ef4444 28%, var(--border)); }
        .admin-message.success { color: #087443; background: color-mix(in srgb, #22c55e 9%, var(--surface)); border-color: color-mix(in srgb, #22c55e 28%, var(--border)); }
        .invite-card { padding: 24px; margin-bottom: 32px; }
        .section-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .section-heading h2, .users-toolbar h2 { margin: 0 0 3px; font-size: 1.15rem; }
        .section-heading p, .users-toolbar p { font-size: 0.82rem; }
        .section-icon { width: 38px; height: 38px; display: grid; place-items: center; color: var(--primary); background: var(--surface-light); border: 1px solid var(--border); border-radius: 8px; }
        .invite-fields { display: grid; grid-template-columns: minmax(150px, .9fr) minmax(220px, 1.3fr) minmax(130px, .7fr) minmax(130px, .7fr) auto; align-items: end; gap: 12px; }
        label { min-width: 0; }
        label > span, .limits-summary > span { display: block; margin-bottom: 6px; color: var(--text-muted); font-size: 0.72rem; font-weight: 650; }
        input, select { width: 100%; height: 42px; padding: 0 12px; color: var(--foreground); background: var(--surface-light); border: 1px solid var(--border); border-radius: 8px; font: inherit; }
        input:focus, select:focus { outline: 2px solid color-mix(in srgb, var(--primary) 26%, transparent); border-color: var(--primary); }
        select:disabled, button:disabled { cursor: not-allowed; opacity: .56; }
        .invite-button { height: 42px; padding-inline: 18px; white-space: nowrap; }
        .users-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
        .filters { display: flex; gap: 10px; }
        .filters > select { width: auto; min-width: 150px; }
        .search-field { position: relative; display: flex; align-items: center; min-width: 260px; color: var(--text-muted); }
        .search-field :global(svg) { position: absolute; left: 12px; pointer-events: none; }
        .search-field input { padding-left: 38px; }
        .user-list { display: grid; gap: 12px; }
        .user-card { display: grid; grid-template-columns: minmax(260px, 1.15fr) minmax(230px, .8fr) minmax(500px, 1.7fr); gap: 24px; align-items: center; padding: 20px; }
        .identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .avatar { width: 42px; height: 42px; flex: none; display: grid; place-items: center; border-radius: 50%; color: var(--shell-inverse-text); background: var(--primary); font-weight: 750; }
        .identity > div:last-child { min-width: 0; }
        .identity-title { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .identity h3 { margin: 0; font-size: .96rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .identity p { margin: 3px 0; color: var(--text-muted); font-size: .82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .identity small { color: var(--text-muted); font-size: .68rem; }
        .you-badge, .status-badge { padding: 2px 7px; border-radius: 4px; font-size: .62rem; font-weight: 750; letter-spacing: .04em; }
        .you-badge { color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
        .status-badge.active { color: #087443; background: color-mix(in srgb, #22c55e 13%, transparent); }
        .status-badge.invited { color: #8a5a00; background: color-mix(in srgb, #f59e0b 14%, transparent); }
        .status-badge.suspended { color: #b42318; background: color-mix(in srgb, #ef4444 12%, transparent); }
        .usage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .usage-grid > div { display: grid; grid-template-columns: auto auto; align-items: center; justify-content: start; gap: 5px; padding: 9px; background: var(--surface-light); border: 1px solid var(--border); border-radius: 7px; color: var(--text-muted); }
        .usage-grid strong { color: var(--foreground); }
        .usage-grid span { grid-column: 1 / -1; font-size: .65rem; }
        .access-controls { display: grid; grid-template-columns: minmax(130px, .8fr) minmax(130px, .8fr) minmax(200px, 1.2fr) auto; align-items: end; gap: 10px; }
        .limits-summary { align-self: center; min-width: 0; }
        .limits-summary strong { display: block; font-size: .72rem; line-height: 1.4; }
        .account-action { height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; border: 1px solid; border-radius: 8px; background: transparent; font-weight: 650; cursor: pointer; }
        .account-action.suspend { color: #b42318; border-color: color-mix(in srgb, #ef4444 32%, var(--border)); }
        .account-action.reactivate { color: #087443; border-color: color-mix(in srgb, #22c55e 32%, var(--border)); }
        .users-empty { padding: 48px; text-align: center; color: var(--text-muted); }
        @media (max-width: 1180px) {
          .invite-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .invite-button { width: fit-content; }
          .user-card { grid-template-columns: 1fr 1fr; }
          .access-controls { grid-column: 1 / -1; }
        }
        @media (max-width: 760px) {
          .admin-view { padding: 24px 16px; }
          .admin-header, .users-toolbar { align-items: stretch; flex-direction: column; }
          .admin-refresh { width: fit-content; }
          .invite-fields, .user-card, .access-controls { grid-template-columns: 1fr; }
          .filters { flex-direction: column; }
          .filters > select, .search-field { width: 100%; min-width: 0; }
          .usage-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .access-controls { grid-column: auto; }
        }
      `}</style>
    </div>
  );
}
