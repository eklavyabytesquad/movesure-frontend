'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { getUser, type AuthUser } from '@/lib/auth';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  label,
  value,
  description,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace('/auth/login');
    else setUser(u);
  }, [router]);

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <DashboardShell>
      <main>
        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {getGreeting()}, {user.full_name.split(' ')[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{today}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System online
          </span>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Bookings"
            value="—"
            description="No data yet"
            iconBg="bg-blue-50"
            icon={
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Active Shipments"
            value="—"
            description="No data yet"
            iconBg="bg-emerald-50"
            icon={
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-3h1a1 1 0 001-1v-3l-3-3h-3z" />
              </svg>
            }
          />
          <StatCard
            label="Pending Invoices"
            value="—"
            description="No data yet"
            iconBg="bg-amber-50"
            icon={
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
          />
        </div>

        {/* ── Two-column bottom section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Account details */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-800">Account Details</h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md capitalize">
                {user.post_in_office.replace(/_/g, ' ')}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {[
                { label: 'Full Name', value: user.full_name },
                { label: 'Email', value: user.email },
                { label: 'User ID', value: user.id },
                { label: 'Company ID', value: user.company_id },
                { label: 'Branch ID', value: user.branch_id },
                { label: 'Session ID', value: user.session_id },
              ].map((item) => (
                <div key={item.label} className="py-3 border-b border-slate-50">
                  <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 truncate">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div className="space-y-1">
              {[
                { label: 'Staff Members', href: '/dashboard/settings/staff', desc: 'Add & manage staff' },
                { label: 'States', href: '/dashboard/settings/states', desc: 'Manage states' },
                { label: 'Cities', href: '/dashboard/settings/cities', desc: 'Manage cities' },
                { label: 'Transports', href: '/dashboard/settings/transports', desc: 'Manage transport companies' },
                { label: 'City Transports', href: '/dashboard/settings/city-transports', desc: 'Link cities & transports' },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

        </div>
      </main>
    </DashboardShell>
  );
}
