import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardContent from "@/components/DashboardContent";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthenticated || !user) return null;

  return <DashboardLayout><DashboardContent user={user} /></DashboardLayout>;
}
