import { expect, test } from '@playwright/test';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

test('account settings supports profile, security and separated subscription state', async ({ page, context }) => {
  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await page.goto('/');
  await page.getByRole('button', { name: /Settings|Configuración/ }).click();

  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  await expect(page.locator('input[value="qa@sphere.test"]')).toBeVisible();
  await page.getByLabel('Nombre').fill('Dayana QA');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Nombre actualizado.')).toBeVisible();
  expect(state.user.user_metadata.full_name).toBe('Dayana QA');

  await expect(page.getByRole('heading', { name: 'Seguridad' })).toBeVisible();
  await page.getByPlaceholder('nuevo@correo.com').fill('dayana.qa@sphere.test');
  await page.getByRole('button', { name: 'Solicitar cambio' }).click();
  await expect(page.getByText(/Solicitud enviada/)).toBeVisible();
  await page.getByPlaceholder('Nueva contraseña').fill('SphereTest2026!');
  await page.getByPlaceholder('Código').first().fill('123456');
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await expect(page.getByText('Contraseña actualizada.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suscripción' })).toBeVisible();
  await expect(page.getByText('3 reportes/dataset')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elegir Pro' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Eliminar cuenta' })).toBeVisible();
});
