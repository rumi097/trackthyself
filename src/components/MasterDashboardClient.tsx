"use client";

import dynamic from "next/dynamic";

const MasterDashboard = dynamic(() => import("@/components/MasterDashboard"), {
  ssr: false,
});

export default function MasterDashboardClient() {
  return <MasterDashboard />;
}