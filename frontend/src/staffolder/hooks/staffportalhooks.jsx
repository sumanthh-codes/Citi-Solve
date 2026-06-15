import { useState } from "react";
import { apiFetch, clearToken } from "../../utils/apiFetch.js";

export const useStaffPortal = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH STAFF PROFILE
     (for StaffPortal.jsx)
  ========================= */
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/staff/profile");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Not authenticated");
      }

      // Return profile with stats
      return data.profile;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH STAFF DASHBOARD STATS
     (Dashboard stats only)
  ========================= */
  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/staff/dashboard");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load dashboard stats");
      }

      const { dashboard } = data;

      return {
        total: dashboard.total || 0,
        assigned: dashboard.assigned || 0,
        inProgress: dashboard.inProgress || 0,
        resolved: dashboard.resolved || 0,
        rejected: dashboard.rejected || 0,
        active: dashboard.active || 0,
      };
    } catch (err) {
      setError(err.message);
      return {
        total: 0,
        assigned: 0,
        inProgress: 0,
        resolved: 0,
        rejected: 0,
        active: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH ASSIGNED COMPLAINTS LIST
     (Optional - for future use)
  ========================= */
  const fetchAssignedComplaints = async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        status: params.status || 'all',
        page: params.page || 1,
        limit: params.limit || 10,
        sortBy: params.sortBy || 'newest',
        ...(params.search && { search: params.search })
      });

      const res = await apiFetch(`/api/staff/complaints?${queryParams}`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaints");
      }

      return {
        complaints: data.complaints,
        pagination: data.pagination,
      };
    } catch (err) {
      setError(err.message);
      return {
        complaints: [],
        pagination: { currentPage: 1, totalPages: 0, totalComplaints: 0 },
      };
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logoutStaff = async () => {
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
    fetchAssignedComplaints,
    logoutStaff,
  };
};