import { expect, test } from '@playwright/test';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

test.describe('SUPERADMIN administration', () => {
  test('anonymous and standard users cannot access administrative operations', async ({ page, context, request }) => {
    const anonymousResponse = await request.get('/api/admin/users');
    expect(anonymousResponse.status()).toBe(401);

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Administration|Administración/ })).toHaveCount(0);
    const directStatus = await page.evaluate(async () => {
      const session = JSON.parse(localStorage.getItem('sphere-auth-session') || '{}') as { access_token?: string };
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${session.access_token || ''}` }
      });
      return response.status;
    });
    expect(directStatus).toBe(403);
  });

  test('superadmin can list, filter, invite and manage account access', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    state.accountRole = 'superadmin';
    state.adminUsers[0].role = 'superadmin';
    state.adminUsers[0].limits = { maxDatasets: null, maxReportsPerDataset: null, maxWidgetsPerReport: 9 };
    await installMockSupabase(context, page, state);
    await page.goto('/');

    await page.getByRole('button', { name: /Administration|Administración/ }).click();
    await expect(page.getByRole('heading', { name: 'Administración de usuarios' })).toBeVisible();
    await expect(page.getByTestId('admin-user-card')).toHaveCount(2);

    await page.getByLabel('Buscar usuarios').fill('analista');
    await expect(page.getByTestId('admin-user-card')).toHaveCount(1);
    await page.getByLabel('Buscar usuarios').fill('');

    await page.getByPlaceholder('persona@empresa.com').fill('invitada@sphere.test');
    await page.getByPlaceholder('Nombre opcional').fill('Invitada QA');
    await page.getByRole('button', { name: 'Enviar invitación' }).click();
    await expect(page.getByText('Invitación enviada.')).toBeVisible();
    expect(state.adminUsers.some((user) => user.email === 'invitada@sphere.test' && user.status === 'invited')).toBe(true);

    await page.getByLabel('Plan de analista@sphere.test').selectOption('enterprise');
    await expect(page.getByText('Acceso actualizado correctamente.')).toBeVisible();
    expect(state.adminUsers.find((user) => user.email === 'analista@sphere.test')?.subscriptionPlan).toBe('enterprise');

    await page.getByLabel('Rol de analista@sphere.test').selectOption('superadmin');
    await expect.poll(() => state.adminUsers.find((user) => user.email === 'analista@sphere.test')?.limits).toEqual({
      maxDatasets: null,
      maxReportsPerDataset: null,
      maxWidgetsPerReport: 9
    });

    const analyst = state.adminUsers.find((user) => user.email === 'analista@sphere.test')!;
    const analystCard = page.getByTestId('admin-user-card').filter({ hasText: 'analista@sphere.test' });
    await analystCard.getByRole('button', { name: 'Suspender' }).click();
    await expect(analystCard.getByText('Suspendido')).toBeVisible();
    expect(analyst.accessStatus).toBe('suspended');
    await analystCard.getByRole('button', { name: 'Reactivar' }).click();
    await expect(analystCard.getByText('Activo')).toBeVisible();
    expect(analyst.accessStatus).toBe('active');

    await expect(page.getByLabel('Rol de qa@sphere.test')).toBeDisabled();
    await expect(page.getByTestId('admin-user-card').filter({ hasText: 'qa@sphere.test' }).getByRole('button', { name: 'Suspender' })).toBeDisabled();

    const selfMutationStatus = await page.evaluate(async () => {
      const session = JSON.parse(localStorage.getItem('sphere-auth-session') || '{}') as { access_token?: string };
      const response = await fetch('/api/admin/users/user_qa_001', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token || ''}`
        },
        body: JSON.stringify({ role: 'standard', subscriptionPlan: 'free', status: 'active' })
      });
      return response.status;
    });
    expect(selfMutationStatus).toBe(409);
  });
});
