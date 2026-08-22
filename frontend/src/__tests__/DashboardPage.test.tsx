import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

describe('Warp x Sentry Dashboard & Landing Page Integration', () => {
  beforeEach(() => {
    class MockEventSource {
      addEventListener = vi.fn();
      onerror = null;
      close = vi.fn();
      readyState = 0;
    }
    vi.stubGlobal('EventSource', MockEventSource);

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (typeof url === 'string' && url.endsWith('/health')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'healthy' }),
          });
        }
        if (typeof url === 'string' && url.endsWith('/api/runs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ runs: ['1001', '1002'] }),
          });
        }
        if (typeof url === 'string' && url.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                authenticated: true,
                username: 'dasbidyendu',
                name: 'Bidyendu Das',
                avatar_url: '',
                org: 'AutoPatch-CI Team',
                public_repos: 5,
              }),
          });
        }
        if (typeof url === 'string' && url.includes('/api/github/repos')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                repositories: [
                  {
                    id: '1',
                    name: 'Shaswati2005/autopatch-ci',
                    url: 'https://github.com/Shaswati2005/autopatch-ci',
                    default_branch: 'main',
                    private: false,
                    description: 'Autonomous DevOps CI/CD Repair & Self-Healing Agent',
                  },
                ],
              }),
          });
        }
        if (typeof url === 'string' && url.includes('/api/traces/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                run_id: '1002',
                traces: [
                  {
                    step_id: 'step-1',
                    stage: 'PATCH_GENERATED',
                    timestamp: '2026-08-21T22:00:00Z',
                    title: 'Code Fix & Regression Test Generated',
                    detail: 'Gemini 2.5 Flash generated patch for calculator.py',
                    payload: {
                      diff: '--- a/calc.py\n+++ b/calc.py\n@@ -1 +1 @@\n-x\n+y',
                      target_file: 'src/calc.py',
                    },
                  },
                  {
                    step_id: 'step-2',
                    stage: 'PR_CREATED',
                    timestamp: '2026-08-21T22:01:00Z',
                    title: 'Pull Request Delivered',
                    detail: 'PR opened on GitHub',
                    payload: {
                      pr_url: 'https://github.com/acme/demo/pull/12',
                      pr_number: 12,
                      branch: 'autopatch/fix-1002',
                      repo: 'acme/demo',
                    },
                  },
                ],
              }),
          });
        }
        if (typeof url === 'string' && url.endsWith('/api/trigger-demo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'queued', run_id: '1003' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ stargazers_count: 12 }) });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Warp x Sentry landing page with Rubik headline and lilac CTA', async () => {
    render(<App />);
    expect(screen.getByText(/Self-Healing CI\/CD For High-Velocity Teams/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch Console/i })).toBeInTheDocument();
  });

  it('navigates from landing to console overview and sidebar tabs', async () => {
    render(<App />);

    // Click Launch Console
    const launchBtn = screen.getByRole('button', { name: /Launch Console/i });
    fireEvent.click(launchBtn);

    // Verify Overview stats
    expect(screen.getByText('Developer Health & CI Repairs')).toBeInTheDocument();
    expect(screen.getByText('Total Healed PRs')).toBeInTheDocument();

    // Click Repositories in sidebar
    const reposBtn = screen.getByRole('button', { name: /Repositories/i });
    fireEvent.click(reposBtn);

    await waitFor(() => {
      expect(screen.getByText('Connected Repositories')).toBeInTheDocument();
      expect(screen.getByText('Shaswati2005/autopatch-ci')).toBeInTheDocument();
    });
  });

  it('triggers CI workflow repair from overview', async () => {
    render(<App />);

    // Launch console
    const launchBtn = screen.getByRole('button', { name: /Launch Console/i });
    fireEvent.click(launchBtn);

    // Click trigger check
    const triggerBtn = screen.getByRole('button', { name: /Run CI Self-Healing Check/i });
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trigger-demo'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
