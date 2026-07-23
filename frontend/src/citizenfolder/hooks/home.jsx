import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL || '';

export const useCitizenPortal = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH LOGGED-IN USER
     (for CitizenPortal.jsx)
  ========================= */
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Not authenticated");
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
     FETCH DASHBOARD ANALYTICS
     (Charts + stats)
  ========================= */
  const fetchComplaintAnalytics = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(
      `${API}/api/complaints/analytics/all`,
      { credentials: "include" }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load analytics");
    }

    const { summary, categoryBreakdown } = data.analytics;

    // Convert array → numbers
    const categoryMap = {};
    categoryBreakdown.forEach(c => {
      categoryMap[c.category] = c.count;
    });

    return {
      totalcomplaints: summary.total || 0,
      resolved: summary.resolved || 0,
      pending: summary.pending || 0,
      inprogress: summary.inProgress || 0,
      roads: categoryMap.roads || 0,
      water: categoryMap.water || 0,
      power: categoryMap.power || 0,
      assigned: summary.assigned || 0,
      rejected: summary.rejected || 0,
      sanitation: categoryMap.sanitation || 0,
      other: categoryMap.other || 0,
    };

  } catch (err) {
    setError(err.message);
    return {
      totalcomplaints: 0,
      resolved: 0,
      pending: 0,
      inprogress: 0,
      roads: 0,
      water: 0,
      power: 0,
      sanitation: 0,
      other: 0,
    };
  } finally {
    setLoading(false);
  }
};


  /* =========================
     LOGOUT
  ========================= */
  const logoutCitizen = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // silent fail (cookies cleared anyway)
    }
  };

  return {
    loading,
    error,
    fetchProfile,
    fetchComplaintAnalytics,
    logoutCitizen,
  };
};
