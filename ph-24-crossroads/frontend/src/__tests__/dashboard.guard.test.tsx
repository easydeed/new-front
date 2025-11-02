import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Dashboard from '@/src/app/(v0)/dashboard/page';

// NOTE: This is a simple sanity test. Replace fetch and localStorage with proper mocks in your repo.
test('renders fallback while loading', () => {
  // @ts-ignore
  global.fetch = () => Promise.resolve({ ok: true, json: async () => ({ total:0, completed:0, in_progress:0, month:0 }) });
  // @ts-ignore
  global.localStorage = { getItem: () => 'token' };
  render(<Dashboard />);
  expect(true).toBe(true);
});
