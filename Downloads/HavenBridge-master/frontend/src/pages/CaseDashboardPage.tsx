import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import type { Resident, AlertsData, Safehouse } from '../types/models';
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type Tab = 'sessions' | 'health' | 'education' | 'visits' | 'caseplan' | 'demographics';

const RESIDENTS_PER_PAGE = 15;

// Badge for active vulnerability sub-categories
function VulnBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
      {label}
    </span>
  );
}

// Badge for family profile flags
function FamilyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
      {label}
    </span>
  );
}

export default function CaseDashboardPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [selected, setSelected] = useState<Resident | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [safehouseFilter, setSafehouseFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    sessionType: 'Individual',
    sessionDurationMinutes: 60,
    emotionalStateObserved: '',
    emotionalStateEnd: '',
    sessionNarrative: '',
    interventionsApplied: '',
    followUpActions: '',
  });
  const [visitForm, setVisitForm] = useState({
    visitType: 'Routine Follow-Up',
    locationVisited: '',
    purpose: '',
    observations: '',
    familyCooperationLevel: 'Cooperative',
  });
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.residents.list(), api.residents.alerts(), api.safehouses.list()])
      .then(([r, a, sh]) => {
        setResidents(r);
        setAlerts(a);
        setSafehouses(sh);
      })
      .catch(() => setError('Failed to load case data. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddSession = async () => {
    if (!selected) return;
    setFormError('');
    if (!sessionForm.sessionNarrative.trim()) {
      setFormError('Session narrative is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.sessions.create({
        residentId: selected.residentId,
        sessionDate: new Date().toISOString().split('T')[0],
        ...sessionForm,
        progressNoted: false,
        concernsFlagged: false,
        referralMade: false,
      });
      const detail = await api.residents.get(selected.residentId);
      setSelected(detail);
      setShowSessionForm(false);
      setSessionForm({ sessionType: 'Individual', sessionDurationMinutes: 60, emotionalStateObserved: '', emotionalStateEnd: '', sessionNarrative: '', interventionsApplied: '', followUpActions: '' });
    } catch {
      setFormError('Failed to save session. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddVisit = async () => {
    if (!selected) return;
    setFormError('');
    if (!visitForm.locationVisited.trim()) {
      setFormError('Location visited is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.visits.create({
        residentId: selected.residentId,
        visitDate: new Date().toISOString().split('T')[0],
        socialWorker: selected.assignedSocialWorker,
        ...visitForm,
        safetyConcernsNoted: false,
        followUpNeeded: false,
        visitOutcome: 'Favorable',
      });
      const detail = await api.residents.get(selected.residentId);
      setSelected(detail);
      setShowVisitForm(false);
      setVisitForm({ visitType: 'Routine Follow-Up', locationVisited: '', purpose: '', observations: '', familyCooperationLevel: 'Cooperative' });
    } catch {
      setFormError('Failed to save visit. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredResidents = useMemo(() => {
    let filtered = residents;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.internalCode?.toLowerCase().includes(q) ||
        r.caseControlNo?.toLowerCase().includes(q) ||
        r.assignedSocialWorker?.toLowerCase().includes(q) ||
        r.caseCategory?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) filtered = filtered.filter(r => r.caseStatus === statusFilter);
    if (riskFilter) filtered = filtered.filter(r => r.currentRiskLevel === riskFilter);
    if (safehouseFilter) filtered = filtered.filter(r => String(r.safehouseId) === safehouseFilter);
    if (categoryFilter) filtered = filtered.filter(r => r.caseCategory === categoryFilter);
    return filtered;
  }, [residents, searchTerm, statusFilter, riskFilter, safehouseFilter, categoryFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, riskFilter, safehouseFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredResidents.length / RESIDENTS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice(
    (currentPage - 1) * RESIDENTS_PER_PAGE,
    currentPage * RESIDENTS_PER_PAGE
  );

  const selectResident = async (id: number) => {
    const detail = await api.residents.get(id);
    setSelected(detail);
    setActiveTab('sessions');
  };

  if (loading) return <LoadingSpinner />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sessions', label: 'Sessions' },
    { key: 'health', label: 'Health' },
    { key: 'education', label: 'Education' },
    { key: 'visits', label: 'Home Visits' },
    { key: 'caseplan', label: 'Case Plan' },
    { key: 'demographics', label: 'Demographics' },
  ];

  const riskDot = (level?: string | null) => {
    if (level === 'High' || level === 'Critical') return 'bg-red-500';
    if (level === 'Medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const totalAlerts = alerts
    ? alerts.highRisk.length + alerts.flaggedSessions.length + alerts.unresolvedIncidents.length
    : 0;

  // Collect active vulnerability sub-categories for a resident
  const vulnBadges = (r: Resident) => {
    const flags: string[] = [];
    if (r.subCatOrphaned) flags.push('Orphaned');
    if (r.subCatTrafficked) flags.push('Trafficked');
    if (r.subCatChildLabor) flags.push('Child Labor');
    if (r.subCatPhysicalAbuse) flags.push('Physical Abuse');
    if (r.subCatSexualAbuse) flags.push('Sexual Abuse');
    if (r.subCatOsaec) flags.push('OSAEC');
    if (r.subCatCicl) flags.push('CICL');
    if (r.subCatAtRisk) flags.push('At-Risk');
    if (r.subCatStreetChild) flags.push('Street Child');
    if (r.subCatChildWithHiv) flags.push('Child w/ HIV');
    return flags;
  };

  const familyBadges = (r: Resident) => {
    const flags: string[] = [];
    if (r.familyIs4Ps) flags.push('4Ps Beneficiary');
    if (r.familySoloParent) flags.push('Solo Parent');
    if (r.familyIndigenous) flags.push('Indigenous People');
    if (r.familyParentPwd) flags.push('Parent w/ Disability');
    if (r.familyInformalSettler) flags.push('Informal Settler');
    return flags;
  };

  const uniqueCategories = [...new Set(residents.map(r => r.caseCategory).filter(Boolean))];

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Resident Cases</h1>
          <p className="text-gray-500 mt-2 text-base">View and manage all resident cases, sessions, and records.</p>
        </div>
        <Link
          to="/cases/intake"
          className="flex items-center gap-2 px-4 py-2.5 bg-haven-600 text-white text-sm font-semibold rounded-xl hover:bg-haven-700 transition-all shadow-sm hover:shadow-md"
        >
          <UserPlusIcon className="h-5 w-5" aria-hidden />
          New Resident Intake
        </Link>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Sidebar — Resident List */}
        <aside className="w-full xl:w-80 shrink-0" aria-label="Resident list">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3.5 bg-gray-50/80 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-semibold text-gray-700">
                  Residents ({filteredResidents.length})
                </h2>
                <FunnelIcon className="h-4 w-4 text-gray-400" aria-hidden />
              </div>

              {/* Search */}
              <div className="relative mb-2" role="search">
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" aria-hidden />
                <label htmlFor="resident-search" className="sr-only">Search residents</label>
                <input
                  id="resident-search"
                  type="search"
                  placeholder="Search code, worker, category..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all"
                />
              </div>

              {/* Filters row 1 */}
              <div className="flex gap-2 mb-2">
                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Transferred">Transferred</option>
                </select>
                <label htmlFor="risk-filter" className="sr-only">Filter by risk level</label>
                <select
                  id="risk-filter"
                  value={riskFilter}
                  onChange={e => setRiskFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none"
                >
                  <option value="">All Risk</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Filters row 2 */}
              <div className="flex gap-2">
                <label htmlFor="safehouse-filter" className="sr-only">Filter by safehouse</label>
                <select
                  id="safehouse-filter"
                  value={safehouseFilter}
                  onChange={e => setSafehouseFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none"
                >
                  <option value="">All Safehouses</option>
                  {safehouses.map(sh => (
                    <option key={sh.safehouseId} value={String(sh.safehouseId)}>{sh.name}</option>
                  ))}
                </select>
                <label htmlFor="category-filter" className="sr-only">Filter by category</label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c!}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <ul className="divide-y divide-gray-50 max-h-[50vh] xl:max-h-[calc(100vh-340px)] overflow-y-auto" role="listbox" aria-label="Select a resident">
              {paginatedResidents.length === 0 && (
                <li className="px-4 py-8 text-sm text-gray-400 text-center">No residents match the current filters.</li>
              )}
              {paginatedResidents.map(r => (
                <li key={r.residentId} role="option" aria-selected={selected?.residentId === r.residentId}>
                  <button
                    onClick={() => selectResident(r.residentId)}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all ${
                      selected?.residentId === r.residentId ? 'bg-haven-50' : 'hover:bg-gray-50/80'
                    }`}
                    aria-label={`Select resident ${r.internalCode}`}
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${riskDot(r.currentRiskLevel)}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.internalCode}</p>
                      <p className="text-xs text-gray-500">{r.caseCategory} &middot; {r.caseStatus}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {(currentPage - 1) * RESIDENTS_PER_PAGE + 1}–{Math.min(currentPage * RESIDENTS_PER_PAGE, filteredResidents.length)} of {filteredResidents.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="text-xs text-gray-600 px-1">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <UserPlusIcon className="h-12 w-12 text-gray-200" aria-hidden />
              <p>Select a resident to view their case.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Header */}
              <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {/* Top row */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h2 className="text-xl font-bold text-gray-900">{selected.internalCode}</h2>
                      <StatusBadge level={selected.currentRiskLevel} size="md" />
                      <StatusBadge level={selected.caseStatus} size="md" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Case {selected.caseControlNo}
                      {selected.safehouse && ` · ${selected.safehouse.name}`}
                      {selected.caseCategory && ` · ${selected.caseCategory}`}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500 space-y-0.5 shrink-0">
                    <p>Age: <span className="font-medium text-gray-900">{selected.presentAge ?? '—'}</span></p>
                    <p>Sex: <span className="font-medium text-gray-900">{selected.sex ?? '—'}</span></p>
                    <p>Admitted: <span className="font-medium text-gray-900">{selected.dateOfAdmission ?? '—'}</span></p>
                  </div>
                </div>

                {/* Demographics strip */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm mb-4 p-3 bg-gray-50/60 rounded-xl">
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Social Worker</dt>
                    <dd className="font-medium text-gray-800 truncate">{selected.assignedSocialWorker ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Referral Source</dt>
                    <dd className="font-medium text-gray-800">{selected.referralSource ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Initial Risk</dt>
                    <dd className="font-medium text-gray-800">{selected.initialRiskLevel ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Length of Stay</dt>
                    <dd className="font-medium text-gray-800">{selected.lengthOfStay ?? '—'}</dd>
                  </div>
                </dl>

                {/* Vulnerability sub-categories */}
                {vulnBadges(selected).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vulnerabilities</p>
                    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Vulnerability sub-categories">
                      {vulnBadges(selected).map(v => (
                        <VulnBadge key={v} label={v} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Disability */}
                {(selected.isPwd || selected.hasSpecialNeeds) && (
                  <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Disability / Special Needs</p>
                    <div className="flex flex-wrap gap-2 text-sm text-amber-900">
                      {selected.isPwd && (
                        <span>PWD{selected.pwdType ? `: ${selected.pwdType}` : ''}</span>
                      )}
                      {selected.hasSpecialNeeds && (
                        <span>Special Needs{selected.specialNeedsDiagnosis ? `: ${selected.specialNeedsDiagnosis}` : ''}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Family profile */}
                {familyBadges(selected).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Family Profile</p>
                    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Family profile indicators">
                      {familyBadges(selected).map(f => (
                        <FamilyBadge key={f} label={f} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reintegration */}
                {(selected.reintegrationType || selected.reintegrationStatus) && (
                  <div className="flex items-center gap-3 text-sm p-3 bg-haven-50 rounded-xl border border-haven-100">
                    <span className="text-xs font-semibold text-haven-700 uppercase tracking-wide">Reintegration</span>
                    {selected.reintegrationType && <span className="text-haven-900">{selected.reintegrationType}</span>}
                    {selected.reintegrationStatus && (
                      <span className="ml-auto text-xs font-medium bg-haven-100 text-haven-800 px-2.5 py-0.5 rounded-lg">
                        {selected.reintegrationStatus}
                      </span>
                    )}
                  </div>
                )}
              </article>

              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 px-4 sm:px-6 overflow-x-auto">
                  <nav className="flex gap-4 sm:gap-6 -mb-px" role="tablist" aria-label="Case information tabs">
                    {tabs.map(t => (
                      <button
                        key={t.key}
                        role="tab"
                        aria-selected={activeTab === t.key}
                        aria-controls={`panel-${t.key}`}
                        onClick={() => setActiveTab(t.key)}
                        className={`shrink-0 py-3.5 text-sm font-medium border-b-2 transition-all ${
                          activeTab === t.key
                            ? 'border-haven-600 text-haven-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div id={`panel-${activeTab}`} role="tabpanel" className="p-4 sm:p-6">

                  {/* ── Sessions ── */}
                  {activeTab === 'sessions' && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setFormError(''); setShowSessionForm(true); }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-haven-600 text-white text-xs font-medium rounded-xl hover:bg-haven-700 transition-all shadow-sm"
                          aria-label="Add new counseling session"
                        >
                          <PlusIcon className="h-4 w-4" aria-hidden /> Add Session
                        </button>
                      </div>
                      {(selected.processRecordings?.length ?? 0) === 0 && (
                        <p className="text-gray-400 text-sm">No sessions recorded yet.</p>
                      )}
                      {selected.processRecordings?.map(s => (
                        <article key={s.recordingId} className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{s.sessionType}</span>
                              {s.concernsFlagged && <span className="text-xs bg-red-50 text-red-700 px-2.5 py-0.5 rounded-lg font-medium">Concern</span>}
                              {s.progressNoted && <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg font-medium">Progress</span>}
                            </div>
                            <span className="text-xs text-gray-500">{s.sessionDate} &middot; {s.sessionDurationMinutes} min</span>
                          </div>
                          {s.emotionalStateObserved && (
                            <p className="text-xs text-gray-500 mb-1">
                              Emotional state: {s.emotionalStateObserved}{s.emotionalStateEnd ? ` → ${s.emotionalStateEnd}` : ''}
                            </p>
                          )}
                          <p className="text-sm text-gray-700 leading-relaxed">{s.sessionNarrative}</p>
                          {s.interventionsApplied && <p className="text-xs text-gray-500 mt-1">Interventions: {s.interventionsApplied}</p>}
                          {s.followUpActions && <p className="text-xs text-gray-500 mt-1">Follow-up: {s.followUpActions}</p>}
                        </article>
                      ))}
                    </div>
                  )}

                  {/* ── Health ── */}
                  {activeTab === 'health' && (
                    <div className="space-y-4">
                      {(selected.healthRecords?.length ?? 0) === 0 && <p className="text-gray-400 text-sm">No health records yet.</p>}
                      {selected.healthRecords?.map(h => (
                        <article key={h.healthRecordId} className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50/50 transition-colors">
                          <p className="text-xs text-gray-500 mb-3"><time dateTime={h.recordDate}>{h.recordDate}</time></p>
                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                            <div><dt className="text-gray-500">Health Score</dt><dd className="font-semibold">{h.generalHealthScore}/10</dd></div>
                            <div><dt className="text-gray-500">Nutrition</dt><dd className="font-semibold">{h.nutritionScore}/10</dd></div>
                            <div><dt className="text-gray-500">Sleep</dt><dd className="font-semibold">{h.sleepQualityScore}/10</dd></div>
                            <div><dt className="text-gray-500">Energy</dt><dd className="font-semibold">{h.energyLevelScore}/10</dd></div>
                          </dl>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>Height: {h.heightCm} cm</span>
                            <span>Weight: {h.weightKg} kg</span>
                            <span>BMI: {h.bmi}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs">
                            {h.medicalCheckupDone && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Medical ✓</span>}
                            {h.dentalCheckupDone && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Dental ✓</span>}
                            {h.psychologicalCheckupDone && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Psychological ✓</span>}
                          </div>
                          {h.notes && <p className="text-sm text-gray-600 mt-2">{h.notes}</p>}
                        </article>
                      ))}
                    </div>
                  )}

                  {/* ── Education ── */}
                  {activeTab === 'education' && (
                    <div className="space-y-4">
                      {(selected.educationRecords?.length ?? 0) === 0 && <p className="text-gray-400 text-sm">No education records yet.</p>}
                      {selected.educationRecords?.map(e => (
                        <article key={e.educationRecordId} className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{e.educationLevel} — {e.schoolName}</span>
                            <StatusBadge level={e.completionStatus} />
                          </div>
                          <dl className="grid grid-cols-3 gap-4 text-sm">
                            <div><dt className="text-gray-500">Enrollment</dt><dd className="font-semibold">{e.enrollmentStatus}</dd></div>
                            <div><dt className="text-gray-500">Attendance</dt><dd className="font-semibold tabular-nums">{e.attendanceRate}%</dd></div>
                            <div>
                              <dt className="text-gray-500">Progress</dt>
                              <dd className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-haven-500 rounded-full" style={{ width: `${e.progressPercent}%` }} />
                                </div>
                                <span className="font-semibold text-xs tabular-nums">{e.progressPercent}%</span>
                              </dd>
                            </div>
                          </dl>
                          {e.notes && <p className="text-sm text-gray-500 mt-2">{e.notes}</p>}
                        </article>
                      ))}
                    </div>
                  )}

                  {/* ── Home Visits ── */}
                  {activeTab === 'visits' && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setFormError(''); setShowVisitForm(true); }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-haven-600 text-white text-xs font-medium rounded-xl hover:bg-haven-700 transition-all shadow-sm"
                          aria-label="Add new home visit"
                        >
                          <PlusIcon className="h-4 w-4" aria-hidden /> Add Visit
                        </button>
                      </div>
                      {(selected.homeVisitations?.length ?? 0) === 0 && <p className="text-gray-400 text-sm">No home visits recorded yet.</p>}
                      {selected.homeVisitations?.map(v => (
                        <article key={v.visitationId} className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{v.visitType}</span>
                            <time className="text-xs text-gray-500" dateTime={v.visitDate}>{v.visitDate}</time>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-1">{v.observations}</p>
                          <dl className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                            <div><dt className="inline">Location: </dt><dd className="inline">{v.locationVisited}</dd></div>
                            <div><dt className="inline">Cooperation: </dt><dd className="inline">{v.familyCooperationLevel}</dd></div>
                            {v.visitOutcome && <div><dt className="inline">Outcome: </dt><dd className="inline">{v.visitOutcome}</dd></div>}
                          </dl>
                          {v.safetyConcernsNoted && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium" role="alert">⚠ Safety concerns noted</p>
                          )}
                          {v.followUpNotes && <p className="text-xs text-gray-500 mt-1">Follow-up: {v.followUpNotes}</p>}
                        </article>
                      ))}
                    </div>
                  )}

                  {/* ── Case Plan ── */}
                  {activeTab === 'caseplan' && (
                    <div className="space-y-4">
                      {(selected.interventionPlans?.length ?? 0) === 0 && (
                        <p className="text-gray-400 text-sm">No intervention plans yet.</p>
                      )}
                      {selected.interventionPlans?.map(p => (
                        <article key={p.planId} className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{p.planCategory}</span>
                            <StatusBadge level={p.status} />
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{p.planDescription}</p>
                          <dl className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                            {p.servicesProvided && <div><dt className="inline">Services: </dt><dd className="inline">{p.servicesProvided}</dd></div>}
                            {p.targetDate && <div><dt className="inline">Target: </dt><dd className="inline">{p.targetDate}</dd></div>}
                            {p.caseConferenceDate && (
                              <div className="text-haven-700 font-medium">
                                <dt className="inline">Conference: </dt>
                                <dd className="inline"><time dateTime={p.caseConferenceDate}>{p.caseConferenceDate}</time></dd>
                              </div>
                            )}
                          </dl>
                        </article>
                      ))}

                      {(selected.incidentReports?.length ?? 0) > 0 && (
                        <>
                          <h3 className="font-semibold text-sm text-gray-700 mt-6 mb-2">Incident Reports</h3>
                          {selected.incidentReports?.map(ir => (
                            <article key={ir.incidentId} className="border border-red-100 rounded-2xl p-5 bg-red-50/30">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-medium text-sm">{ir.incidentType}</span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge level={ir.severity} />
                                  {!ir.resolved && (
                                    <span className="text-xs text-red-600 font-medium" role="alert">Unresolved</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{ir.description}</p>
                              {ir.responseTaken && <p className="text-xs text-gray-500 mt-1">Response: {ir.responseTaken}</p>}
                            </article>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Demographics ── */}
                  {activeTab === 'demographics' && (
                    <div className="space-y-6">
                      {/* Core demographics */}
                      <section aria-labelledby="demo-core">
                        <h3 id="demo-core" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Personal Information</h3>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                          {[
                            { label: 'Internal Code', value: selected.internalCode },
                            { label: 'Case Control No.', value: selected.caseControlNo },
                            { label: 'Sex', value: selected.sex },
                            { label: 'Date of Birth', value: selected.dateOfBirth },
                            { label: 'Present Age', value: selected.presentAge },
                            { label: 'Age on Admission', value: selected.ageUponAdmission },
                            { label: 'Religion', value: selected.religion },
                            { label: 'Place of Birth', value: selected.placeOfBirth },
                            { label: 'Birth Status', value: selected.birthStatus },
                          ].map(f => f.value ? (
                            <div key={f.label}>
                              <dt className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</dt>
                              <dd className="font-medium text-gray-800">{f.value}</dd>
                            </div>
                          ) : null)}
                        </dl>
                      </section>

                      {/* Admission details */}
                      <section aria-labelledby="demo-admission">
                        <h3 id="demo-admission" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Admission Details</h3>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                          {[
                            { label: 'Date of Admission', value: selected.dateOfAdmission },
                            { label: 'Date Enrolled', value: selected.dateEnrolled },
                            { label: 'Date Closed', value: selected.dateClosed },
                            { label: 'Length of Stay', value: selected.lengthOfStay },
                            { label: 'Safehouse', value: selected.safehouse?.name },
                            { label: 'Case Category', value: selected.caseCategory },
                          ].map(f => f.value ? (
                            <div key={f.label}>
                              <dt className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</dt>
                              <dd className="font-medium text-gray-800">{f.value}</dd>
                            </div>
                          ) : null)}
                        </dl>
                      </section>

                      {/* Referral */}
                      <section aria-labelledby="demo-referral">
                        <h3 id="demo-referral" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Referral & Social Worker</h3>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                          {[
                            { label: 'Referral Source', value: selected.referralSource },
                            { label: 'Referring Agency / Person', value: selected.referringAgencyPerson },
                            { label: 'Assigned Social Worker', value: selected.assignedSocialWorker },
                            { label: 'Initial Risk Level', value: selected.initialRiskLevel },
                            { label: 'Current Risk Level', value: selected.currentRiskLevel },
                          ].map(f => f.value ? (
                            <div key={f.label}>
                              <dt className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</dt>
                              <dd className="font-medium text-gray-800">{f.value}</dd>
                            </div>
                          ) : null)}
                        </dl>
                        {selected.initialCaseAssessment && (
                          <div className="mt-4">
                            <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Initial Case Assessment</dt>
                            <dd className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{selected.initialCaseAssessment}</dd>
                          </div>
                        )}
                      </section>

                      {/* Vulnerability sub-categories */}
                      <section aria-labelledby="demo-vuln">
                        <h3 id="demo-vuln" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vulnerability Sub-Categories</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: 'Orphaned', value: selected.subCatOrphaned },
                            { label: 'Trafficked', value: selected.subCatTrafficked },
                            { label: 'Child Labor', value: selected.subCatChildLabor },
                            { label: 'Physical Abuse', value: selected.subCatPhysicalAbuse },
                            { label: 'Sexual Abuse', value: selected.subCatSexualAbuse },
                            { label: 'OSAEC', value: selected.subCatOsaec },
                            { label: 'CICL', value: selected.subCatCicl },
                            { label: 'At-Risk', value: selected.subCatAtRisk },
                            { label: 'Street Child', value: selected.subCatStreetChild },
                            { label: 'Child w/ HIV', value: selected.subCatChildWithHiv },
                          ].map(item => (
                            <label key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className={`h-4 w-4 rounded flex items-center justify-center text-xs ${item.value ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`} aria-hidden>
                                {item.value ? '✓' : '—'}
                              </span>
                              <span className={item.value ? 'font-medium text-gray-900' : 'text-gray-400'}>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </section>

                      {/* Disability */}
                      <section aria-labelledby="demo-disability">
                        <h3 id="demo-disability" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Disability & Special Needs</h3>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-xs text-gray-400 uppercase tracking-wide">Person w/ Disability (PWD)</dt>
                            <dd className="font-medium text-gray-800">{selected.isPwd ? `Yes${selected.pwdType ? `: ${selected.pwdType}` : ''}` : 'No'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-400 uppercase tracking-wide">Special Needs</dt>
                            <dd className="font-medium text-gray-800">{selected.hasSpecialNeeds ? `Yes${selected.specialNeedsDiagnosis ? `: ${selected.specialNeedsDiagnosis}` : ''}` : 'No'}</dd>
                          </div>
                        </dl>
                      </section>

                      {/* Family profile */}
                      <section aria-labelledby="demo-family">
                        <h3 id="demo-family" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Family Profile</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: '4Ps Beneficiary', value: selected.familyIs4Ps },
                            { label: 'Solo Parent', value: selected.familySoloParent },
                            { label: 'Indigenous People', value: selected.familyIndigenous },
                            { label: 'Parent w/ Disability', value: selected.familyParentPwd },
                            { label: 'Informal Settler', value: selected.familyInformalSettler },
                          ].map(item => (
                            <label key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className={`h-4 w-4 rounded flex items-center justify-center text-xs ${item.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`} aria-hidden>
                                {item.value ? '✓' : '—'}
                              </span>
                              <span className={item.value ? 'font-medium text-gray-900' : 'text-gray-400'}>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </section>

                      {/* Reintegration */}
                      <section aria-labelledby="demo-reintegration">
                        <h3 id="demo-reintegration" className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Reintegration Tracking</h3>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-xs text-gray-400 uppercase tracking-wide">Reintegration Type</dt>
                            <dd className="font-medium text-gray-800">{selected.reintegrationType ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-400 uppercase tracking-wide">Reintegration Status</dt>
                            <dd className="font-medium text-gray-800">{selected.reintegrationStatus ?? '—'}</dd>
                          </div>
                        </dl>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — Alerts */}
        <aside className="w-full xl:w-64 shrink-0" aria-label="Alerts panel">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3.5 bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-100 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden />
              <h2 className="text-sm font-semibold text-red-800">Alerts ({totalAlerts})</h2>
            </div>
            <div className="max-h-[50vh] xl:max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-gray-50">
              {alerts?.highRisk.map(a => (
                <button
                  key={`hr-${a.residentId}`}
                  onClick={() => selectResident(a.residentId)}
                  className="w-full text-left px-4 py-3.5 hover:bg-red-50/50 transition-colors"
                  aria-label={`High risk resident: ${a.internalCode}`}
                >
                  <p className="text-xs font-medium text-red-700">High Risk</p>
                  <p className="text-sm text-gray-900 font-medium">{a.internalCode}</p>
                  <p className="text-xs text-gray-500">{a.assignedSocialWorker}</p>
                </button>
              ))}
              {alerts?.flaggedSessions.map(a => (
                <button
                  key={`fs-${a.recordingId}`}
                  onClick={() => selectResident(a.residentId)}
                  className="w-full text-left px-4 py-3.5 hover:bg-amber-50/50 transition-colors"
                  aria-label={`Flagged session: ${a.sessionType} on ${a.sessionDate}`}
                >
                  <p className="text-xs font-medium text-amber-700">Concern Flagged</p>
                  <p className="text-sm text-gray-900 font-medium">{a.sessionType}</p>
                  <p className="text-xs text-gray-500">{a.sessionDate}</p>
                </button>
              ))}
              {alerts?.unresolvedIncidents.map(a => (
                <button
                  key={`ui-${a.incidentId}`}
                  onClick={() => selectResident(a.residentId)}
                  className="w-full text-left px-4 py-3.5 hover:bg-orange-50/50 transition-colors"
                  aria-label={`Unresolved incident: ${a.incidentType}, severity ${a.severity}`}
                >
                  <p className="text-xs font-medium text-orange-700">Unresolved: {a.incidentType}</p>
                  <p className="text-sm text-gray-900 font-medium">Severity: {a.severity}</p>
                  <p className="text-xs text-gray-500">{a.incidentDate}</p>
                </button>
              ))}
              {totalAlerts === 0 && (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No active alerts</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Add Session Modal */}
      <Modal open={showSessionForm} onClose={() => setShowSessionForm(false)} title="Add Counseling Session">
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm px-4 py-3">{formError}</div>
          )}
          <div>
            <label htmlFor="sess-type" className="block text-sm font-medium text-gray-700 mb-1.5">Session Type</label>
            <select id="sess-type" value={sessionForm.sessionType} onChange={e => setSessionForm(f => ({ ...f, sessionType: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all">
              <option>Individual</option><option>Group</option><option>Family</option>
            </select>
          </div>
          <div>
            <label htmlFor="sess-duration" className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
            <input id="sess-duration" type="number" min="1" value={sessionForm.sessionDurationMinutes} onChange={e => setSessionForm(f => ({ ...f, sessionDurationMinutes: +e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sess-emo-start" className="block text-sm font-medium text-gray-700 mb-1.5">Emotional State (start)</label>
              <select id="sess-emo-start" value={sessionForm.emotionalStateObserved} onChange={e => setSessionForm(f => ({ ...f, emotionalStateObserved: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all">
                <option value="">Select...</option><option>Calm</option><option>Anxious</option><option>Sad</option><option>Angry</option><option>Hopeful</option><option>Distressed</option><option>Withdrawn</option><option>Happy</option>
              </select>
            </div>
            <div>
              <label htmlFor="sess-emo-end" className="block text-sm font-medium text-gray-700 mb-1.5">Emotional State (end)</label>
              <select id="sess-emo-end" value={sessionForm.emotionalStateEnd} onChange={e => setSessionForm(f => ({ ...f, emotionalStateEnd: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all">
                <option value="">Select...</option><option>Calm</option><option>Anxious</option><option>Sad</option><option>Angry</option><option>Hopeful</option><option>Distressed</option><option>Withdrawn</option><option>Happy</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sess-narrative" className="block text-sm font-medium text-gray-700 mb-1.5">Session Narrative <span className="text-red-500">*</span></label>
            <textarea id="sess-narrative" required rows={3} value={sessionForm.sessionNarrative} onChange={e => setSessionForm(f => ({ ...f, sessionNarrative: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" placeholder="Describe what occurred in this session..." />
          </div>
          <div>
            <label htmlFor="sess-interventions" className="block text-sm font-medium text-gray-700 mb-1.5">Interventions Applied</label>
            <input id="sess-interventions" value={sessionForm.interventionsApplied} onChange={e => setSessionForm(f => ({ ...f, interventionsApplied: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" placeholder="e.g. Healing, Teaching" />
          </div>
          <div>
            <label htmlFor="sess-followup" className="block text-sm font-medium text-gray-700 mb-1.5">Follow-Up Actions</label>
            <input id="sess-followup" value={sessionForm.followUpActions} onChange={e => setSessionForm(f => ({ ...f, followUpActions: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSessionForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={handleAddSession} disabled={submitLoading} className="px-4 py-2.5 text-sm font-medium text-white bg-haven-600 rounded-xl hover:bg-haven-700 transition-all shadow-sm disabled:opacity-60">
              {submitLoading ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Home Visit Modal */}
      <Modal open={showVisitForm} onClose={() => setShowVisitForm(false)} title="Add Home Visit">
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm px-4 py-3">{formError}</div>
          )}
          <div>
            <label htmlFor="visit-type" className="block text-sm font-medium text-gray-700 mb-1.5">Visit Type</label>
            <select id="visit-type" value={visitForm.visitType} onChange={e => setVisitForm(f => ({ ...f, visitType: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all">
              <option>Routine Follow-Up</option><option>Reintegration Assessment</option><option>Post-Placement Monitoring</option><option>Emergency</option>
            </select>
          </div>
          <div>
            <label htmlFor="visit-location" className="block text-sm font-medium text-gray-700 mb-1.5">Location Visited <span className="text-red-500">*</span></label>
            <input id="visit-location" required value={visitForm.locationVisited} onChange={e => setVisitForm(f => ({ ...f, locationVisited: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" placeholder="e.g. Family Home, Barangay Hall" />
          </div>
          <div>
            <label htmlFor="visit-purpose" className="block text-sm font-medium text-gray-700 mb-1.5">Purpose</label>
            <input id="visit-purpose" value={visitForm.purpose} onChange={e => setVisitForm(f => ({ ...f, purpose: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" />
          </div>
          <div>
            <label htmlFor="visit-observations" className="block text-sm font-medium text-gray-700 mb-1.5">Observations</label>
            <textarea id="visit-observations" rows={3} value={visitForm.observations} onChange={e => setVisitForm(f => ({ ...f, observations: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all" />
          </div>
          <div>
            <label htmlFor="visit-coop" className="block text-sm font-medium text-gray-700 mb-1.5">Family Cooperation Level</label>
            <select id="visit-coop" value={visitForm.familyCooperationLevel} onChange={e => setVisitForm(f => ({ ...f, familyCooperationLevel: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-haven-500/20 focus:border-haven-500 outline-none transition-all">
              <option>Highly Cooperative</option><option>Cooperative</option><option>Neutral</option><option>Uncooperative</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowVisitForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={handleAddVisit} disabled={submitLoading} className="px-4 py-2.5 text-sm font-medium text-white bg-haven-600 rounded-xl hover:bg-haven-700 transition-all shadow-sm disabled:opacity-60">
              {submitLoading ? 'Saving...' : 'Save Visit'}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
