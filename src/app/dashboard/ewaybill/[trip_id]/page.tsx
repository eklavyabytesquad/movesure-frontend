import DashboardShell from '@/components/dashboard/DashboardShell';
import EwbTripDetail from '@/components/dashboard/ewaybill/EwbTripDetail';

interface Props {
  params: Promise<{ trip_id: string }>;
}

export default async function EwbTripPage({ params }: Props) {
  const { trip_id } = await params;
  return (
    <DashboardShell noPadding>
      <EwbTripDetail tripId={trip_id} />
    </DashboardShell>
  );
}
