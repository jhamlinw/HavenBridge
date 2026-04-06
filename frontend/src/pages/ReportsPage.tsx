import { useEffect, useState } from 'react';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ImpactOverview, SupporterSummary, AlertsData } from '../types/models';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChartBarSquareIcon,
  HeartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/** Row shape for the safehouse comparison table (subset of API fields). */
type Safehouse = {
  safehouseId: number;
  name: string;
  city: string;
  capacityGirls: number;
  currentOccupancy: number;
  status: string;
};

function normalizeSafehouse(raw: Record<string, unknown>): Safehouse {
  return {
    safehouseId: Number(raw.safehouseId),
    name: String(raw.name ?? ''),
    city: String(raw.city ?? raw.region ?? '—'),
    capacityGirls: Number(raw.capacityGirls ?? 0),
    currentOccupancy: Number(raw.currentOccupancy ?? 0),
    status: String(raw.status ?? ''),
  };
}

function occupancyPercent(capacity: number, occupied: number): number {
  if (capacity <= 0) return occupied > 0 ? 100 : 0;
  return Math.min(100, Math.round((occupied / capacity) * 1000) / 10);
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<ImpactOverview | null>(null);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [supporterSummary, setSupporterSummary] = useState<SupporterSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.impact.overview(),
      api.safehouses.list(),
      api.supporters.summary(),
      api.residents.alerts(),
    ])
      .then(([ov, sh, sup, al]) => {
        setOverview(ov as ImpactOverview);
        setSafehouses((Array.isArray(sh) ? sh : []).map((row) => normalizeSafehouse(row as Record<string, unknown>)));
        setSupporterSummary(sup as SupporterSummary);
        setAlerts(al as AlertsData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <ChartBarSquareIcon className="h-9 w-9 text-haven-600 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-gray-500 mt-1 max-w-3xl">
              Aggregated operational insights, safehouse utilization, donor health, and risk signals for internal
              staff review.
            </p>
          </div>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <SummaryCard
            title="Active Residents"
            value={overview.totalResidents}
            icon={<UserGroupIcon className="h-7 w-7" />}
          />
          <SummaryCard
            title="Total Sessions"
            value={overview.totalSessions}
            icon={<ChatBubbleLeftRightIcon className="h-7 w-7" />}
            accent="border-warm-500"
          />
          <SummaryCard
            title="Active Safehouses"
            value={overview.activeSafehouses}
            icon={<BuildingOfficeIcon className="h-7 w-7" />}
            accent="border-violet-500"
          />
          <SummaryCard
            title="Total Donations"
            value={`$${Number(overview.totalDonations).toLocaleString()}`}
            icon={<CurrencyDollarIcon className="h-7 w-7" />}
            accent="border-emerald-500"
          />
        </div>
      )}

      {/* Safehouse Overview */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Safehouse Overview</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-haven-50/80 border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">City</th>
                  <th className="px-5 py-3 font-semibold text-gray-700 text-right">Capacity</th>
                  <th className="px-5 py-3 font-semibold text-gray-700 text-right">Current</th>
                  <th className="px-5 py-3 font-semibold text-gray-700 min-w-[200px]">Utilization</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {safehouses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                      No safehouse data available.
                    </td>
                  </tr>
                ) : (
                  safehouses.map((sh) => {
                    const pct = occupancyPercent(sh.capacityGirls, sh.currentOccupancy);
                    const barColor =
                      pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-warm-500' : 'bg-haven-500';
                    return (
                      <tr key={sh.safehouseId} className="hover:bg-gray-50/80">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{sh.name}</td>
                        <td className="px-5 py-3.5 text-gray-600">{sh.city}</td>
                        <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{sh.capacityGirls}</td>
                        <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">
                          {sh.currentOccupancy}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden min-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums w-12 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                              sh.status?.toLowerCase() === 'active'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {sh.status || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Donor Overview */}
      {supporterSummary && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HeartIcon className="h-5 w-5 text-warm-600" />
            Donor Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-t-4 border-t-haven-500">
              <p className="text-sm font-medium text-gray-500">Total donors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{supporterSummary.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-t-4 border-t-emerald-500">
              <p className="text-sm font-medium text-gray-500">Active donors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{supporterSummary.active}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-t-4 border-t-warm-500">
              <p className="text-sm font-medium text-gray-500">At-risk donors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{supporterSummary.atRisk}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-t-4 border-t-violet-500">
              <p className="text-sm font-medium text-gray-500">Avg gift size</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                ${Number(supporterSummary.avgGift).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Active Alerts Summary */}
      {alerts && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            Active Alerts Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-xl p-6 bg-red-100 border border-red-200 shadow-sm">
              <p className="text-sm font-semibold text-red-900">High-risk residents</p>
              <p className="text-3xl font-bold text-red-950 mt-2 tabular-nums">{alerts.highRisk?.length ?? 0}</p>
            </div>
            <div className="rounded-xl p-6 bg-amber-100 border border-amber-200 shadow-sm">
              <p className="text-sm font-semibold text-amber-900">Flagged sessions</p>
              <p className="text-3xl font-bold text-amber-950 mt-2 tabular-nums">
                {alerts.flaggedSessions?.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl p-6 bg-orange-100 border border-orange-200 shadow-sm">
              <p className="text-sm font-semibold text-orange-900">Unresolved incidents</p>
              <p className="text-3xl font-bold text-orange-950 mt-2 tabular-nums">
                {alerts.unresolvedIncidents?.length ?? 0}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
