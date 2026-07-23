import { useState, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const useMyComplaints = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch User Profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }
      return await res.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Complaints with Server-Side Filtering
  const fetchMyComplaints = useCallback(
    async ({ status, category, search, page = 1, limit = 10 }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status && status !== "all") params.append("status", status);
        if (category && category !== "all") params.append("category", category);
        if (search) params.append("search", search);
        params.append("page", page);
        params.append("limit", limit);

        const res = await fetch(
          `${BASE_URL}/api/complaints/my-complaints?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch complaints");
        }

        // Returns { complaints: [], total, page, pages } usually, 
        // or just the array depending on strict backend return. 
        // Returning full json to let component handle structure.
        return await res.json();
      } catch (err) {
        setError(err.message);
        return { complaints: [] }; // Return empty structure on fail to prevent map errors
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch Single Complaint Detail
  const fetchComplaintById = useCallback(async (complaintId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch complaint details");
      }

      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchProfile,
    fetchMyComplaints,
    fetchComplaintById,
    loading,
    error,
  };
};