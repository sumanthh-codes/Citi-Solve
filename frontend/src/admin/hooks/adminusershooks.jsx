import { useState } from "react";
import { apiFetch } from "../../utils/apiFetch.js";

export const useAdminUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH ALL USERS (CITIZENS)
     (All citizens - not district restricted)
  ========================= */
  const fetchUsers = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 50,
        ...(filters.search && { search: filters.search })
      });

      const res = await apiFetch(`/api/admin/users?${queryParams}`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load users");
      }

      return {
        users: data.users || [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalUsers: 0,
        },
      };
    } catch (err) {
      setError(err.message);
      return {
        users: [],
        pagination: { currentPage: 1, totalPages: 0, totalUsers: 0 },
      };
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH SINGLE USER
  ========================= */
  const fetchUserById = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${id}`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load user");
      }

      return data.user;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DELETE USER (CITIZEN)
  ========================= */
  const deleteUser = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete user");
      }

      return {
        success: true,
        message: data.message,
        deletedComplaints: data.deletedComplaints,
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

  return {
    loading,
    error,
    fetchUsers,
    fetchUserById,
    deleteUser,
  };
};