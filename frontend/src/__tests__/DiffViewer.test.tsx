import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffViewer } from '../components/DiffViewer';

describe('DiffViewer Component', () => {
  const sampleDiff = `--- a/src/calculator.py
+++ b/src/calculator.py
@@ -10,3 +10,3 @@
-def divide(a, b): return a / b
+def divide(a, b): return a / b if b != 0 else 0`;

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders diff lines and file name correctly', () => {
    render(
      <DiffViewer
        diff={sampleDiff}
        targetFile="src/calculator.py"
        explanation="Fixed ZeroDivisionError check"
      />
    );

    expect(screen.getByText('src/calculator.py')).toBeInTheDocument();
    expect(screen.getByText('💡 Fixed ZeroDivisionError check')).toBeInTheDocument();
    expect(screen.getByText(/def divide\(a, b\): return a \/ b if b != 0 else 0/)).toBeInTheDocument();
  });

  it('copies diff content to clipboard on button click', async () => {
    render(<DiffViewer diff={sampleDiff} targetFile="src/calculator.py" />);
    const copyBtn = screen.getByTestId('copy-diff-btn');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleDiff);
    expect(await screen.findByText('✓ Copied')).toBeInTheDocument();
  });
});
