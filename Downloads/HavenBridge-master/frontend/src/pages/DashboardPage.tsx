import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ImpactOverview, RecentActivity } from '../types/models';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface Conference {
  planId: number;
  residentId: number;
  caseConferenceDate: string;
  planCategory?: string;
  status: string;
  internalCode?: string;
  assignedSocialWorker?: string;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<ImpactOverview | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.impact.overview(),
      api.admin.recentActivity(),
      api.residents.upcomingConferences(),
    ])
      .then(([o, a, c]) => {
        setOverview(o);
        setActivity(a);
        setConferences(c);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-2 text-base">Overview of operations and impact across all safehouses.</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <SummaryCard title="Active Residents" value={overview.totalResidents} icon={<UserGroupIcon className="h-7 w-7" aria-hidden />} />
          <SummaryCard title="Counseling Sessions" value={overview.totalSessions.toLocaleString()} icon={<ChatBubbleLeftRightIcon className="h-7 w-7" aria-hidden />} accent="border-warm-500" />
          <SummaryCard title="Total Donations" value={`$${overview.totalDonations.toLocaleString()}`} icon={<CurrencyDollarIcon className="h-7 w-7" aria-hidden />} accent="border-emerald-500" />
          <SummaryCard title="Active Safehouses" value={overview.activeSafehouses} icon={<BuildingOfficeIcon className="h-7 w-7" aria-hidden />} accent="border-violet-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <section aria-labelledby="activity-heading" className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 id="activity-heading" className="font-semibold text-gray-900 text-lg">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50" role="list">
            {activity.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No recent activity.</p>
            )}
            {activity.map((item, i) => (
              <div key={i} role="listitem" className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
                <span aria-hidden className={`shrink-0 h-2.5 w-2.5 rounded-full ring-4 ring-opacity-20 ${
                  item.type === 'Session' ? 'bg-haven-500 ring-haven-500' :
                  item.type === 'Home Visit' ? 'bg-warm-500 ring-warm-500' : 'bg-emerald-500 ring-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.type} &middot; {item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {/* Quick Actions */}
          <section aria-labelledby="actions-heading" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 id="actions-heading" className="font-semibold text-gray-900 text-lg mb-5">Quick Actions</h2>
            <nav className="space-y-3">
              {[
                { to: '/cases', label: 'View Resident Cases', bg: 'bg-haven-50 hover:bg-haven-100', text: 'text-haven-700' },
                { to: '/cases/intake', label: 'New Resident Intake', bg: 'bg-haven-600 hover:bg-haven-700', text: 'text-white' },
                { to: '/donors', label: 'Manage Donors', bg: 'bg-warm-50 hover:bg-warm-100', text: 'text-warm-700' },
                { to: '/reports', label: 'Reports & Analytics', bg: 'bg-gray-50 hover:bg-gray-100', text: 'text-gray-700' },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center justify-between w-full px-4 py-3.5 rounded-xl ${link.bg} ${link.text} font-medium text-sm transition-all`}
                >
                  {link.label}
                  <ArrowRightIcon className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden />
                </Link>
              ))}
            </nav>
          </section>

          {/* Upcoming Case Conferences */}
          <section aria-labelledby="conferences-heading" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-haven-600" aria-hidden />
              <h2 id="conferences-heading" className="font-semibold text-gray-900 text-base">Upcoming Conferences <span className="text-sm font-normal text-gray-500">(next 30 days)</span></h2>
            </div>
            <div className="divide-y divide-gray-50">
              {conferences.length === 0 ? (
                <p className="px-6 py-6 text-sm text-gray-400 text-center">No upcoming case conferences.</p>
              ) : conferences.map(c => (
                <div key={c.planId} className="px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <p className="text-sm font-medium text-gray-900">{c.internalCode}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <time dateTime={c.caseConferenceDate}>{c.caseConferenceDate}</time>
                    {c.planCategory && ` · ${c.planCategory}`}
                  </p>
                  {c.assignedSocialWorker && (
                    <p className="text-xs text-gray-400">{c.assignedSocialWorker}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
