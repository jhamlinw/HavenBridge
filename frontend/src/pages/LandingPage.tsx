import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ImpactOverview } from '../types/models';
import {
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const [overview, setOverview] = useState<ImpactOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    api.impact
      .overview()
      .then((data) => setOverview(data as ImpactOverview))
      .catch(() => setOverview(null))
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="relative overflow-hidden bg-gradient-to-br from-haven-600 via-haven-800 to-haven-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 45%), radial-gradient(circle at 80% 60%, rgba(124,196,250,0.2) 0%, transparent 40%)',
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-haven-200/90 mb-4">
            Lighthouse Sanctuary
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
            Protecting vulnerable children, together
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-haven-100 leading-relaxed">
            HavenBridge coordinates safe shelter, counseling, and transparent stewardship so every
            child in our care has a path to safety and hope.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/impact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-haven-800 shadow-lg hover:bg-haven-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-haven-800"
            >
              See Our Impact
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-haven-800"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" aria-labelledby="mission-heading">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 id="mission-heading" className="text-3xl font-bold text-gray-900">
            Our mission in action
          </h2>
          <p className="mt-3 text-gray-600">
            Tools and practices built for child welfare professionals, donors, and communities who
            demand accountability.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <article className="rounded-2xl border border-gray-100 bg-haven-50/50 p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-haven-100 text-haven-700">
              <ClipboardDocumentListIcon className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-gray-900">Case management</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Structured records and workflows help social workers stay focused on children—not
              paperwork—while meeting compliance and care standards.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-haven-50/50 p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-haven-100 text-haven-700">
              <ShieldCheckIcon className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-gray-900">Donor transparency</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Supporters see how resources flow to programs and safehouses, building lasting trust
              through clear, ethical reporting.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-haven-50/50 p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-haven-100 text-haven-700">
              <ChartBarIcon className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-gray-900">Measurable impact</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Outcomes and service metrics guide decisions so we can prove progress while protecting
              identities and dignity.
            </p>
          </article>
        </div>
      </section>

      <section
        className="border-y border-haven-100 bg-gradient-to-b from-haven-50/80 to-white py-16 sm:py-20"
        aria-labelledby="stats-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="stats-heading" className="text-center text-2xl font-bold text-gray-900 mb-10">
            Impact at a glance
          </h2>
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <div
                className="h-10 w-10 animate-spin rounded-full border-4 border-haven-200 border-t-haven-600"
                role="status"
                aria-label="Loading statistics"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="text-center rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <UserGroupIcon className="mx-auto h-8 w-8 text-haven-600 mb-3" aria-hidden />
                <p className="text-3xl sm:text-4xl font-bold text-haven-900 tabular-nums">
                  {overview?.totalResidents ?? '—'}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">Active residents</p>
              </div>
              <div className="text-center rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-haven-600 mb-3" aria-hidden />
                <p className="text-3xl sm:text-4xl font-bold text-haven-900 tabular-nums">
                  {overview?.totalSessions?.toLocaleString() ?? '—'}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">Counseling sessions</p>
              </div>
              <div className="text-center rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <BuildingOffice2Icon className="mx-auto h-8 w-8 text-haven-600 mb-3" aria-hidden />
                <p className="text-3xl sm:text-4xl font-bold text-haven-900 tabular-nums">
                  {overview?.activeSafehouses ?? '—'}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">Active safehouses</p>
              </div>
              <div className="text-center rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <CurrencyDollarIcon className="mx-auto h-8 w-8 text-haven-600 mb-3" aria-hidden />
                <p className="text-3xl sm:text-4xl font-bold text-haven-900 tabular-nums">
                  {overview != null
                    ? `$${Math.round(overview.totalDonations).toLocaleString()}`
                    : '—'}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">Total donations</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-auto bg-haven-900 text-haven-100 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="font-semibold text-white text-lg">HavenBridge</p>
          <p className="mt-1 text-sm text-haven-200">Lighthouse Sanctuary</p>
          <p className="mt-6 text-xs text-haven-300/80">
            © {new Date().getFullYear()} HavenBridge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
