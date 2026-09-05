import AuthenticatedLayout from "../(authenticated)/layout";
import DashboardPage from "./dashboard-page";

export default function PlatformHomePage() {
  return (
    <AuthenticatedLayout>
      <DashboardPage />
    </AuthenticatedLayout>
  );
}
