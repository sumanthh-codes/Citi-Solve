import { useState } from "react";
import { apiFetch, clearToken } from "../../utils/apiFetch.js";

export const useStaffSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH STAFF PROFILE
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

      return data.profile;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH ALL ASSIGNED COMPLAINTS
     (For initial load)
  ========================= */
  const fetchAllComplaints = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/staff/complaints?status=all&limit=100&sortBy=newest");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaints");
      }

      return data.complaints || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ADVANCED SEARCH
     (Uses POST /api/staff/complaints/search/advanced)
  ========================= */
  const advancedSearch = async (searchParams) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/staff/complaints/search/advanced", {
        method: "POST",
        body: JSON.stringify({
          dateFrom: searchParams.dateFrom || null,
          dateTo: searchParams.dateTo || null,
          status: searchParams.status || 'all',
          keyword: searchParams.keyword || '',
          page: searchParams.page || 1,
          limit: searchParams.limit || 100,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Search failed");
      }

      return {
        complaints: data.complaints || [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalComplaints: 0,
        },
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
     FETCH SINGLE COMPLAINT BY ID
  ========================= */
  const fetchComplaintById = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/staff/complaints/${id}`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaint");
      }

      return data.complaint;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UPDATE COMPLAINT STATUS
  ========================= */
  const updateComplaintStatus = async (id, statusData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/staff/complaints/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(statusData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to update status");
      }

      return {
        success: true,
        complaint: data.complaint,
        message: data.message,
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
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
    fetchAllComplaints,
    advancedSearch,
    fetchComplaintById,
    updateComplaintStatus,
    logoutStaff,
  };
};