import { useState } from "react";
import { apiFetch } from "../../utils/apiFetch.js";

export const useAdminComplaints = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH ALL COMPLAINTS
     (With filters - admin's district only)
  ========================= */
  const fetchComplaints = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        status: filters.status || 'all',
        category: filters.category || 'all',
        page: filters.page || 1,
        limit: filters.limit || 50,
        ...(filters.search && { search: filters.search })
      });

      const res = await apiFetch(`/api/admin/complaints?${queryParams}`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load complaints");
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
     FETCH SINGLE COMPLAINT
  ========================= */
  const fetchComplaintById = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/complaints/${id}`);

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

  return {
    loading,
    error,
    fetchComplaints,
    fetchComplaintById,
  };
};