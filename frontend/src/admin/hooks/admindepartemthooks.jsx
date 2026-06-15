import { useState } from "react";
import { apiFetch } from "../../utils/apiFetch.js";

export const useAdminDepartments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH ALL DEPARTMENTS
     (Department stats for admin's district)
  ========================= */
  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/departments");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load departments");
      }

      return data.departments || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchDepartments,
  };
};