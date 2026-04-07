import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'hb_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  const savePreference = (value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white rounded-t-xl shadow-lg px-4 py-4 sm:px-6 sm:py-5"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-200 leading-relaxed sm:pr-6">
          We use cookies to run this site, keep it secure, and improve your experience. By continuing, you agree to our
          use of cookies as described in our{' '}
          <Link to="/privacy" className="text-haven-300 hover:text-haven-200 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => savePreference('declined')}
            className="rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => savePreference('accepted')}
            className="rounded-lg bg-haven-600 px-4 py-2 text-sm font-semibold text-white hover:bg-haven-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
