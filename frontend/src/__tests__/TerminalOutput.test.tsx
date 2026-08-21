import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminalOutput } from '../components/TerminalOutput';

describe('TerminalOutput Component', () => {
  const sampleLog = 'pytest backend/tests/test_calculator.py\n... 5 passed in 0.42s';

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders test execution logs and passed badge', () => {
    render(<TerminalOutput output={sampleLog} passed={true} durationSeconds={0.42} />);
    expect(screen.getByText('✓ PASSED')).toBeInTheDocument();
    expect(screen.getByText('0.42s')).toBeInTheDocument();
    expect(screen.getByText(/5 passed in 0.42s/)).toBeInTheDocument();
  });

  it('renders failed badge when passed is false', () => {
    render(<TerminalOutput output="AssertionError: Expected 4 got 5" passed={false} />);
    expect(screen.getByText('✕ FAILED')).toBeInTheDocument();
  });

  it('copies log content to clipboard', async () => {
    render(<TerminalOutput output={sampleLog} />);
    const copyBtn = screen.getByTestId('copy-logs-btn');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleLog);
    expect(await screen.findByText('✓ Copied')).toBeInTheDocument();
  });
});
