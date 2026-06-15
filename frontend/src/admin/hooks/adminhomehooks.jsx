import { useState } from "react";
import { apiFetch, clearToken } from "../../utils/apiFetch.js";

export const useAdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH ADMIN PROFILE
  ========================= */
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/auth/profile");

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Not authenticated");
      }

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH ADMIN DASHBOARD STATS
     (Uses GET /api/admin/dashboard)
  ========================= */
  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/dashboard");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load dashboard stats");
      }

      const { dashboard } = data;

      // Transform to match the component's expected format
      return {
        totalcomplaints: dashboard.complaints.total || 0,
        pending: dashboard.complaints.pending || 0,
        inprogress: dashboard.complaints.inProgress || 0,
        resolved: dashboard.complaints.resolved || 0,
        assigned: dashboard.complaints.assigned || 0,
        rejected: dashboard.complaints.rejected || 0,
        totalusers: (dashboard.users.staff || 0),
        staff: dashboard.users.staff || 0,
        totaldepartments: dashboard.users.departments || 0,
      };
    } catch (err) {
      setError(err.message);
      return {
        totalcomplaints: 0,
        pending: 0,
        inprogress: 0,
        resolved: 0,
        assigned: 0,
        rejected: 0,
        totalusers: 0,
        staff: 0,
        totaldepartments: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH DEPARTMENT WORKLOAD
     (For the chart - Uses GET /api/admin/department-workload)
  ========================= */
  const fetchDepartmentWorkload = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/department-workload");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load department workload");
      }

      return data.workload || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logoutAdmin = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      clearToken();
    } catch {
      clearToken();
    }
  };

  return {
    loading,
    error,
    fetchProfile,
    fetchDashboardStats,
    fetchDepartmentWorkload,
    logoutAdmin,
  };
};