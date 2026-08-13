/**
 * ROLE1 step 3, RENDERED — the box the admin console promised existed.
 *
 * ═══ WHY THIS IS A RENDER TEST AND NOT A SOURCE PIN ═══
 *
 * The admin console refuses a job title with "a job title belongs to the
 * person it describes and is edited in their profile, not here." That
 * sentence shipped one ticket before the field did, which made it a
 * promise pointing at a screen with no such box.
 *
 * A source pin proving `job_title` appears in `account-settings/page.tsx`
 * would have passed against the version where the input sits behind
 * `{false && (` — the sixth sighting of that defect is what produced this
 * file's pattern. For a page the fix is RENDERING.
 *
 * ═══ AND THE SAVE HAS TO CARRY IT ═══
 *
 * Rendering the input is half. The PATCH body is the other half: an
 * input wired to state that never reaches the request is a field that
 * accepts what she types and forgets it, reporting success — §4 with a
 * text box.
 *
 * NOTE on `jest`: used from the GLOBAL, not imported from
 * `@jest/globals`. Babel only hoists `jest.mock` above the imports when
 * it sees the global.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from '@jest/globals';
import type { jest as JestObject } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

/** File-local so it cannot collide with the ambient `jest` namespace. */
declare const jest: typeof JestObject;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/account-settings',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/Sidebar', () => ({
  __esModule: true,
  default: () => null,
}));

import AccountSettings from '@/app/account-settings/page';

const PROFILE = {
  id: 1,
  email: 'officer@pacificcoast.test',
  full_name: 'Jamie Rivera',
  job_title: 'Escrow Officer',
  company_name: 'Pacific Coast Escrow',
  phone: '+15551234567',
  state: 'CA',
  plan: 'free',
  business_address: '400 Ocean Ave',
  total_deeds: 0,
  onboarding_completed: true,
};

/** Every request answers with the profile; the PATCH is recorded. */
const calls: Array<{ url: string; init?: any }> = [];

beforeEach(() => {
  calls.length = 0;
  window.localStorage.setItem('access_token', 'tok');
  (global as any).fetch = jest.fn(async (url: string, init?: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => PROFILE };
  }) as any;
});

const openProfile = async () => {
  render(<AccountSettings />);
  return screen.findByDisplayValue('Escrow Officer');
};

describe('the job title has somewhere to live', () => {
  it('renders the field, filled in from the server', async () => {
    /** THE PIN THIS FILE EXISTS FOR. The admin console's refusal names
     *  this screen; before step 3 the screen had no such input. */
    const input = await openProfile();
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/Job title/)).toBeInTheDocument();
  });

  it('says the title does not decide what she can do', async () => {
    /**
     * The two facts shared a column, so "role" was a word that meant
     * access on Tuesday and a career on Wednesday. Saying so on the
     * screen is cheap, and the alternative is somebody wondering whether
     * typing "Administrator" here does something.
     */
    await openProfile();
    expect(screen.getByText(/does not affect what you can see or do/))
      .toBeInTheDocument();
  });

  it('sends what she typed to the server', async () => {
    /**
     * An input bound to state that never reaches the request accepts her
     * edit, reports success, and forgets it.
     */
    const input = await openProfile();
    fireEvent.change(input, { target: { value: 'Title Agent' } });
    fireEvent.click(screen.getByText(/Save Changes/));

    await waitFor(() => {
      const patch = calls.find((c) => c.init?.method === 'PATCH');
      expect(patch).toBeDefined();
      expect(JSON.parse(patch!.init.body).job_title).toBe('Title Agent');
    });
  });

  it('offers no way to change her own access', async () => {
    /**
     * No self-service authorization. `role` is absent from this screen
     * and from `ProfilePatch` — absent, not filtered, because a filter
     * is a thing somebody later edits.
     */
    await openProfile();
    fireEvent.click(screen.getByText(/Save Changes/));
    await waitFor(() => {
      const patch = calls.find((c) => c.init?.method === 'PATCH');
      expect(patch).toBeDefined();
      expect(Object.keys(JSON.parse(patch!.init.body))).not.toContain('role');
    });
  });
});
