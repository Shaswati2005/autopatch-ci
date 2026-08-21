import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DashboardPage from '../app/page';

describe('DashboardPage Integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/api/runs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ runs: ['1001', '1002'] }),
          });
        }
        if (url.includes('/api/traces/1002')) {
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
                    detail: 'Gemini 3.5 Flash generated patch for calculator.py',
                    payload: {
                      diff: '--- a/calc.py\n+++ b/calc.py\n@@ -1 +1 @@\n-x\n+y',
                      target_file: 'src/calc.py',
                      explanation: 'Resolved edge case',
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
        if (url.endsWith('/api/trigger-demo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'queued', run_id: '1003' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard title and loads workflow runs', async () => {
    render(<DashboardPage />);

    expect(screen.getByText('⚡ Interactive Trigger')).toBeInTheDocument();
    expect(screen.getByText('🧠 Agent Reasoning & Pipeline Trace')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('run-item-1002')).toBeInTheDocument();
    });
  });

  it('renders trace steps and PR card for selected run', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Code Fix & Regression Test Generated')).toBeInTheDocument();
      expect(screen.getByText('src/calc.py')).toBeInTheDocument();
      expect(screen.getByTestId('pr-card')).toBeInTheDocument();
      expect(screen.getByText('#12')).toBeInTheDocument();
    });
  });

  it('triggers demo build failure when button clicked', async () => {
    render(<DashboardPage />);

    const triggerBtn = screen.getByTestId('trigger-btn');
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trigger-demo'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
