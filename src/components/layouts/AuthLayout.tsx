import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../config/api';

const PRODUCT_IMG =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl-e2zS5iPvDMHvbCfA9aCvYYlSuBukcqElS0ewrn-wKVY9b53';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    // Use grid with a slimmer left panel to cut empty space
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 lg:grid lg:grid-cols-[44%_56%]">
      {/* Left side - Compact grey banner */}
      <aside
        aria-label="Brand"
        className="relative overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-200"
      >
        {/* Subtle lighting */}
        <div
          className="absolute inset-0 opacity-50 [background:radial-gradient(900px_480px_at_-20%_-20%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(800px_480px_at_120%_120%,rgba(255,255,255,0.6),transparent_60%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex h-full flex-col px-8 py-10">
          {/* Logo row */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              {APP_CONFIG.LOGO_URL ? (
                <img
                  src={APP_CONFIG.LOGO_URL}
                  alt={`${APP_CONFIG.COMPANY_NAME} logo`}
                  className="h-10 w-auto rounded-md bg-white shadow-sm ring-1 ring-neutral-200 p-1"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <span className="text-lg font-bold">D</span>
                </div>
              )}
              <div>
                <p className="text-xl font-semibold text-neutral-900">{APP_CONFIG.COMPANY_NAME}</p>
                <p className="text-sm text-neutral-600">Point of Sale</p>
              </div>
            </div>
          </div>

          {/* Hero row: text + circular image side‑by‑side to remove dead space */}
          <div className="flex items-center gap-8">
            <div className="min-w-0">
              <h2 className="text-[28px] md:text-[32px] font-semibold leading-tight text-neutral-900">
                Smart POS for daily ops
              </h2>
              <p className="mt-2 text-neutral-700">
                Fast billing, live stock, and clear insights to keep work moving.
              </p>

              {/* Compact chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['Quick billing', 'Live stock', 'Secure access'].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white/80 px-3 py-1 text-xs text-neutral-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* In‑flow circular product image (no absolute gaps) */}
            <div className="shrink-0 size-44 md:size-52 rounded-full overflow-hidden bg-white shadow-md ring-1 ring-neutral-300">
              <img
                src={PRODUCT_IMG}
                alt="Product pack"
                className="h-full w-full object-cover object-center"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Bottom line */}
          <div className="mt-auto pt-8">
            <p className="text-neutral-600 text-sm">
              © {new Date().getFullYear()} {APP_CONFIG.COMPANY_NAME}
            </p>
          </div>
        </div>
      </aside>

      {/* Right side - Auth card */}
      <main aria-label="Authentication" className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center gap-3">
              {APP_CONFIG.LOGO_URL ? (
                <img
                  src={APP_CONFIG.LOGO_URL}
                  alt={`${APP_CONFIG.COMPANY_NAME} logo`}
                  className="h-9 w-auto rounded-md bg-white shadow-sm ring-1 ring-neutral-200 p-1"
                />
              ) : (
                <div className="h-9 w-9 bg-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-base font-bold text-white">D</span>
                </div>
              )}
              <div className="text-left">
                <p className="text-base font-semibold text-gray-900">{APP_CONFIG.COMPANY_NAME}</p>
                <p className="text-sm text-gray-600">POS System</p>
              </div>
            </div>
          </div>

          {/* Tidy card for the form */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-7">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
