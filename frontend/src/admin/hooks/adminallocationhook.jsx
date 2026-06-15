import { useState } from "react";
import { apiFetch } from "../../utils/apiFetch.js";

export const useAdminAllocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     FETCH PENDING COMPLAINTS
     (Only pending complaints in admin's district)
  ========================= */
  const fetchPendingComplaints = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/complaints?status=pending&limit=100");

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
     FETCH AVAILABLE STAFF FOR COMPLAINT
     (Staff in same district & department)
  ========================= */
  const fetchAvailableStaff = async (complaintId) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/complaints/${complaintId}/available-staff`);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load staff");
      }

      return data.staff || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ASSIGN COMPLAINT TO STAFF
     (Manual assignment)
  ========================= */
  const assignComplaint = async (complaintId, staffId) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/complaints/${complaintId}/assign`, {
        method: "POST",
        body: JSON.stringify({ staffId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to assign complaint");
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
     AUTO-ALLOCATE ALL PENDING COMPLAINTS
     (Smart allocation based on workload)
  ========================= */
  const autoAllocateAll = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get all pending complaints
      const complaints = await fetchPendingComplaints();
      if (complaints.length === 0) {
        return {
          success: true,
          allocated: 0,
          failed: 0,
          message: "No pending complaints to allocate",
        };
      }

      const results = {
        allocated: 0,
        failed: 0,
        errors: [],
      };

      // 2. Process each complaint
      for (const complaint of complaints) {
        try {
          // Get available staff for this complaint
          const availableStaff = await fetchAvailableStaff(complaint._id);
          
          if (availableStaff.length === 0) {
            results.failed++;
            results.errors.push({
              complaintId: complaint._id,
              error: `No staff available for ${complaint.category} in ${complaint.district}`,
            });
            continue;
          }

          // Sort by active workload (ascending) to distribute evenly
          const sortedStaff = availableStaff.sort((a, b) => 
            (a.workload?.active || 0) - (b.workload?.active || 0)
          );

          // Assign to staff with least workload
          const selectedStaff = sortedStaff[0];
          const result = await assignComplaint(complaint._id, selectedStaff._id);

          if (result.success) {
            results.allocated++;
          } else {
            results.failed++;
            results.errors.push({
              complaintId: complaint._id,
              error: result.error,
            });
          }
        } catch (err) {
          results.failed++;
          results.errors.push({
            complaintId: complaint._id,
            error: err.message,
          });
        }
      }

      return {
        success: true,
        ...results,
        message: `Allocated ${results.allocated} complaints, ${results.failed} failed`,
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
    fetchPendingComplaints,
    fetchAvailableStaff,
    assignComplaint,
    autoAllocateAll,
  };
};