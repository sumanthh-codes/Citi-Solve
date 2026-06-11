import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export const useAdminStaff = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH ALL STAFF
     (Staff in admin's district only)
  ========================= */
  const fetchStaff = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        department: filters.department || 'all',
        page: filters.page || 1,
        limit: filters.limit || 50,
        ...(filters.search && { search: filters.search })
      });

      const res = await fetch(
        `${API}/api/admin/staff?${queryParams}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load staff");
      }

      return {
        staff: data.staff || [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalStaff: 0,
        },
      };
    } catch (err) {
      setError(err.message);
      return {
        staff: [],
        pagination: { currentPage: 1, totalPages: 0, totalStaff: 0 },
      };
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH SINGLE STAFF MEMBER
  ========================= */
  const fetchStaffById = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API}/api/admin/staff/${id}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load staff");
      }

      return data.staff;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateStaffApproval = async (id, status) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/admin/staff/${id}/approval`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update staff request");
      }

      return data;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchStaff,
    fetchStaffById,
    updateStaffApproval,
  };
};