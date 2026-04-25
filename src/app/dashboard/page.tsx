'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/Navbar';
import { getUser, type AuthUser } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/auth/login');
    } else {
      setUser(u);
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.full_name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s an overview of your account.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Total Bookings', value: '—', colorText: 'text-blue-600', colorBg: 'bg-blue-50' },
            { label: 'Active Shipments', value: '—', colorText: 'text-green-600', colorBg: 'bg-green-50' },
            { label: 'Pending Invoices', value: '—', colorText: 'text-yellow-600', colorBg: 'bg-yellow-50' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`text-3xl font-bold mt-2 ${card.colorText}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Account Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Email', value: user.email },
              { label: 'Role', value: user.post_in_office.replace(/_/g, ' ') },
              { label: 'User ID', value: user.id },
              { label: 'Company ID', value: user.company_id },
              { label: 'Branch ID', value: user.branch_id },
              { label: 'Session ID', value: user.session_id },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="font-medium text-gray-800 capitalize mt-0.5 truncate">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  );
}
