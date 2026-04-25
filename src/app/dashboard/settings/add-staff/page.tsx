import AddStaff from '@/components/dashboard/settings/add-staff';

export default function AddStaffPage() {
  return <AddStaff />;
}

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';
const selectCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
  branch_type: string;
  address: string | null;
}
