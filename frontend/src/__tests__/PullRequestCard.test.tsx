import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PullRequestCard } from '../components/PullRequestCard';

describe('PullRequestCard Component', () => {
  it('renders PR delivery details, PR number, branch, and link', () => {
    render(
      <PullRequestCard
        prUrl="https://github.com/acme/demo-repo/pull/42"
        prNumber={42}
        branch="autopatch/fix-run-101"
        repo="acme/demo-repo"
      />
    );

    expect(screen.getByText('Autonomous Pull Request Delivered')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('autopatch/fix-run-101')).toBeInTheDocument();
    expect(screen.getByText('acme/demo-repo')).toBeInTheDocument();

    const link = screen.getByTestId('view-pr-btn');
    expect(link).toHaveAttribute('href', 'https://github.com/acme/demo-repo/pull/42');
  });
});
