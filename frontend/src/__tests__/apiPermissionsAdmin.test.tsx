import React from 'react';
import { afterAll, beforeEach, expect, it, jest } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApiTab from '@/app/admin/components/ApiTab';
import { AdminApi } from '@/lib/adminApi';

// Spy on the actual shared object instead of depending on module-mock
// hoisting through Next's transform of imported Jest globals.
const api = {
  listApiKeys: jest.spyOn(AdminApi, 'listApiKeys'),
  listApiKeyRequests: jest.spyOn(AdminApi, 'listApiKeyRequests'),
  createApiKey: jest.spyOn(AdminApi, 'createApiKey'),
  updateApiKey: jest.spyOn(AdminApi, 'updateApiKey'),
  revokeApiKey: jest.spyOn(AdminApi, 'revokeApiKey'),
};
afterAll(() => jest.restoreAllMocks());
const permissions = { scopes: ['deed:read', 'deed:handoff'], operations: {}, reserved_unavailable: [] };

beforeEach(() => {
  jest.clearAllMocks();
  api.listApiKeys.mockResolvedValue({ api_keys: [], total: 0, page: 1, pages: 0, permissions });
  api.listApiKeyRequests.mockResolvedValue({ items: [], total: 0 });
});

it('loads the server vocabulary without selecting any permission automatically', async () => {
  render(<ApiTab />);
  await screen.findByText('Partner API keys');
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  const read = screen.getByRole('checkbox', { name: 'deed:read' });
  const handoff = screen.getByRole('checkbox', { name: 'deed:handoff' });
  expect(read).not.toBeChecked();
  expect(handoff).not.toBeChecked();
  expect(api.listApiKeys).toHaveBeenCalledTimes(1);
});

it('submits only explicitly selected permissions', async () => {
  api.createApiKey.mockResolvedValue({ success: true, warning: 'Once', api_key: {
    id: 'synthetic', key: 'synthetic-not-a-service-key', key_prefix: 'synthetic',
    name: 'Synthetic', is_active: true, is_test: false, rate_limit_hour: 100, rate_limit_day: 1000,
  } });
  render(<ApiTab />);
  await screen.findByText('Partner API keys');
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  fireEvent.change(screen.getByPlaceholderText(/Who is this key for/), { target: { value: 'Synthetic' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'deed:read' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  await waitFor(() => expect(api.createApiKey).toHaveBeenCalledWith({ name: 'Synthetic', is_test: false, scopes: ['deed:read'] }));
});

it('does not offer resume or revocation again for a terminally revoked key', async () => {
  api.listApiKeys.mockResolvedValue({ total: 1, page: 1, pages: 1, permissions, api_keys: [{
    id: 'synthetic', key_prefix: 'synthetic', name: 'Retired', is_active: false, is_test: true,
    scopes: ['deed:read'], revoked_at: '2026-11-10T00:00:00Z', rate_limit_hour: 100, rate_limit_day: 1000,
  }] });
  render(<ApiTab />);
  await screen.findByText('Retired');
  expect(screen.getByText('Revoked')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revoke permanently' })).not.toBeInTheDocument();
});

it('refuses to present a successful issuance form if permission loading fails', async () => {
  api.listApiKeys.mockRejectedValue(new Error('Permission catalog unavailable'));
  render(<ApiTab />);
  await screen.findByText('Permission catalog unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  expect(screen.queryByRole('checkbox', { name: 'deed:read' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create key' })).toBeDisabled();
  expect(api.createApiKey).not.toHaveBeenCalled();
});

it('fails closed when an older backend omits the permission catalog', async () => {
  const legacy = { api_keys: [{ id: 'legacy', name: 'Legacy key' }], total: 1, page: 1, pages: 1 };
  api.listApiKeys.mockResolvedValue(legacy as unknown as Awaited<ReturnType<typeof AdminApi.listApiKeys>>);
  render(<ApiTab />);
  await screen.findByText('Permission catalog unavailable; key issuance is disabled.');
  expect(screen.getByText('API key data is unavailable; no permissions changed.')).toBeInTheDocument();
  expect(screen.queryByText('Legacy key')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  expect(screen.getByRole('button', { name: 'Create key' })).toBeDisabled();
  expect(api.createApiKey).not.toHaveBeenCalled();
});
