import AuthenticatedLayout from "../(authenticated)/layout";
import DashboardPage from "../(authenticated)/page";

export default function PlatformHomePage() {
  return (
    <AuthenticatedLayout>
      <DashboardPage />
    </AuthenticatedLayout>
  );
}
