import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

const DashboardPage = App;

describe('App Integration', () => {
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
        if (typeof url === 'string' && url.endsWith('/api/runs')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ runs: ['1001', '1002'] }),
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
                    detail: 'Gemini 3.5 Flash generated patch for calculator.py',
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
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard agent trace panel and connection status', async () => {
    render(<DashboardPage />);
    expect(screen.getByText('Agent Reasoning Trace')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('renders run items and trace steps for selected run', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('run-item-1002')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Code Fix & Regression Test Generated')).toBeInTheDocument();
      expect(screen.getByTestId('pr-card')).toBeInTheDocument();
    });
  });

  it('triggers demo build failure when trigger button is clicked', async () => {
    render(<DashboardPage />);

    // find the desktop sidebar trigger button (non-mobile)
    const buttons = screen.getAllByTestId('trigger-btn');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trigger-demo'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
