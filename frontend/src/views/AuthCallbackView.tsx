import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, Check, AlertTriangle, ArrowRight } from 'lucide-react';

interface AuthCallbackViewProps {
  onAuthSuccess: () => void;
  onAuthError: () => void;
}

export const AuthCallbackView: React.FC<AuthCallbackViewProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const { setAuthToken } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'missing_client_id'
          ? 'GitHub OAuth Client ID is not configured in backend/.env'
          : `OAuth authorization failed: ${error}`
      );
      return;
    }

    if (token) {
      setAuthToken(token).then(() => {
        setStatus('success');
        // Clean URL query parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          onAuthSuccess();
        }, 1200);
      });
    } else {
      setStatus('error');
      setErrorMessage('No authentication token received from GitHub OAuth redirect.');
    }
  }, [setAuthToken, onAuthSuccess]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="warp-card max-w-md w-full p-6 text-center space-y-5 border border-[#232838] bg-[#161a25]">
        <div className="w-12 h-12 rounded-xl bg-[#1e2331] border border-[#2e3447] flex items-center justify-center mx-auto text-[#7553f6]">
          <Terminal className="w-6 h-6" />
        </div>

        {status === 'processing' && (
          <div className="space-y-2">
            <h2 className="font-mono text-sm font-bold text-[#f1f1f4]">
              Authenticating with GitHub...
            </h2>
            <p className="text-xs text-[#9aa1b3]">
              Exchanging OAuth credentials and verifying repository access.
            </p>
            <div className="w-6 h-6 border-2 border-[#7553f6] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#5ee78a]/20 text-[#5ee78a] flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <h2 className="font-mono text-sm font-bold text-[#f1f1f4]">
              GitHub Authentication Complete
            </h2>
            <p className="text-xs text-[#9aa1b3]">
              Redirecting to AutoPatch-CI Developer Dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-full bg-[#f6827d]/20 text-[#f6827d] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="font-mono text-sm font-bold text-[#f6827d]">
              Authentication Notice
            </h2>
            <p className="text-xs text-[#9aa1b3] font-mono leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2">
              <button
                onClick={onAuthError}
                className="btn-warp-secondary px-4 py-2 text-xs font-mono w-full"
              >
                Return to Dashboard Overview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
