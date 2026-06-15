import { useState } from "react";
import { apiFetch, clearToken } from "../../utils/apiFetch.js";

export const useAdminPortal = () => {
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
     LOGOUT
  ========================= */
  const logoutAdmin = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      clearToken();
      return { success: true };
    } catch (err) {
      clearToken();
      return { success: false, error: err.message };
    }
  };

  return {
    loading,
    error,
    fetchProfile,
    logoutAdmin,
  };
};