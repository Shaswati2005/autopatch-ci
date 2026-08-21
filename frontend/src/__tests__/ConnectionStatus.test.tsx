import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConnectionStatus } from '../components/ConnectionStatus';

describe('ConnectionStatus Component', () => {
  it('renders streaming state correctly with run ID', () => {
    render(<ConnectionStatus status="streaming" runId="123456" />);
    expect(screen.getByText('SSE LIVE STREAM')).toBeInTheDocument();
    expect(screen.getByText('#123456')).toBeInTheDocument();
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  it('renders polling mode state correctly', () => {
    render(<ConnectionStatus status="polling" />);
    expect(screen.getByText('POLLING MODE (2s)')).toBeInTheDocument();
    expect(screen.getByTestId('polling-indicator')).toBeInTheDocument();
  });

  it('renders idle state correctly', () => {
    render(<ConnectionStatus status="idle" />);
    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  it('renders disconnected state correctly', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('OFFLINE / RETRYING')).toBeInTheDocument();
  });
});
