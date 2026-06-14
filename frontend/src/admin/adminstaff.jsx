import React, { useEffect, useState } from 'react';
import styles from './adminstaffstyle.module.css';
import { useAdminStaff } from './hooks/adminstaffhooks.jsx';


const StaffPage = () => {
  const {
    loading: hookLoading,
    fetchStaff,
    fetchStaffById,
    updateStaffApproval,
  } = useAdminStaff();

  const [staffData, setStaffData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ department: 'all' });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const pendingStaff = staffData.filter((staff) => (staff.approvalStatus || 'approved') === 'pending');

  /* =========================
     FETCH STAFF (WITH DEBOUNCE)
  ========================= */
  useEffect(() => {
    setPageLoading(true);
    const timeoutId = setTimeout(async () => {
      console.log('👔 Fetching staff...');
      const result = await fetchStaff({
        department: filters.department,
        search: searchTerm,
        limit: 100,
      });
      
      if (result.staff) {
        console.log('✅ Staff received:', result.staff);
        setStaffData(result.staff);
      }
      setPageLoading(false);
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [filters, searchTerm]);

  /* =========================
     FILTER HANDLERS
  ========================= */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /* =========================
     DETAIL MODAL
  ========================= */
  const handleViewDetails = async (staff) => {
    // Use the cached staff data from list (already has workload)
    setSelectedStaff(staff);
    setShowDetailModal(true);
    // Also fetch fresh data in background for recent complaints
    const freshStaff = await fetchStaffById(staff._id);
    if (freshStaff) {
      // Merge: keep workload from list, get recentComplaints from fresh fetch
      setSelectedStaff({ ...staff, recentComplaints: freshStaff.recentComplaints });
    }
  };

  const handleApproval = async (staff, status) => {
    setReviewingId(staff._id);
    setActionMessage('');
    const result = await updateStaffApproval(staff._id, status);

    if (result.success) {
      setStaffData((current) => current.map((member) => (
        member._id === staff._id
          ? { ...member, approvalStatus: status, approvalReviewedAt: result.staff.approvalReviewedAt }
          : member
      )));
    }

    setActionMessage(result.message || 'Unable to review this staff request.');
    setReviewingId(null);
  };

  /* =========================
     EXPORT CSV
  ========================= */
  const handleExportCSV = () => {
    if (staffData.length === 0) {
      alert('No staff members to export');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Email',
      'Department',
      'District',
      'State',
      'Total Assigned',
      'Active Cases',
      'Resolved'
    ];

    const csvRows = staffData.map(s => [
      s._id || '',
      s.name || '',
      s.email || '',
      s.department || '',
      s.district || '',
      s.state || '',
      s.workload?.total || 0,
      s.workload?.active || 0,
      s.workload?.resolved || 0
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  /* =========================
     UTILITY FUNCTIONS
  ========================= */
  const getSuccessRate = (resolved, assigned) => {
    if (!assigned || assigned === 0) return 'N/A';
    const rate = Math.round((resolved / assigned) * 100);
    return `${rate}%`;
  };

  /* =========================
     RENDER TABLE
  ========================= */
  const renderTableBody = () => {
    if (pageLoading || hookLoading) {
      return (
        <tr>
          <td colSpan="9" className={styles.loadingCell}>
            <div className={styles.spinner}></div>
            <p>Loading staff members...</p>
          </td>
        </tr>
      );
    }

    if (staffData.length === 0) {
      return (
        <tr>
          <td colSpan="9" className={styles.noDataCell}>
            No staff members found
          </td>
        </tr>
      );
    }

    return staffData.map((staff) => (
      <tr key={staff._id}>
        <td data-label="ID">
          <strong>{staff._id.slice(-6)}</strong>
        </td>
        <td data-label="Name" className={styles.truncatedText} title={staff.name}>
          {staff.name}
        </td>
        <td data-label="Department">
          {staff.department.charAt(0).toUpperCase() + staff.department.slice(1)}
        </td>
        <td data-label="Active Cases">
          {staff.workload?.active || 0}
        </td>
        <td data-label="Resolved">
          {staff.workload?.resolved || 0}
        </td>
        <td data-label="Status">
          <span className={`${styles.statusBadge} ${styles[staff.approvalStatus || 'approved']}`}>
            {staff.approvalStatus || 'approved'}
          </span>
        </td>
        <td data-label="Actions" className={styles.actionCell}>
          <button 
            className={`${styles.actionBtn} ${styles.view}`} 
            title="View Details" 
            onClick={() => handleViewDetails(staff)}
          >
            👁️
          </button>
        </td>
        <td data-label="Approval" className={styles.actionCell}>
          {staff.approvalStatus === 'pending' && (
            <>
              <button
                className={`${styles.reviewBtn} ${styles.approve}`}
                disabled={reviewingId === staff._id || !staff.isAccountVerified}
                onClick={() => handleApproval(staff, 'approved')}
              >
                Approve
              </button>
              <button
                className={`${styles.reviewBtn} ${styles.reject}`}
                disabled={reviewingId === staff._id || !staff.isAccountVerified}
                onClick={() => handleApproval(staff, 'rejected')}
              >
                Reject
              </button>
            </>
          )}
          {(staff.approvalStatus === 'approved' || !staff.approvalStatus) && (
            <span style={{ color: '#34d399', fontSize: '13px', fontWeight: 700 }}>✓ Approved</span>
          )}
          {staff.approvalStatus === 'rejected' && (
            <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>✗ Rejected</span>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className={styles.contentArea}>
      <div className={styles.pageHeader}>
        <h2>All Staff</h2>
        <div className={styles.pageActions}>
          <button 
            className={styles.btnSecondary} 
            onClick={async () => {
              setPageLoading(true);
              const result = await fetchStaff({
                department: 'all',
                limit: 100,
              });
              setStaffData(result.staff);
              setFilters({ department: 'all' });
              setSearchTerm('');
              setPageLoading(false);
            }}
          >
            🔄 Refresh
          </button>
          <button className={styles.btnSecondary} onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>
      {actionMessage && <p className={styles.actionMessage}>{actionMessage}</p>}

      <section className={styles.pendingPanel}>
        <div className={styles.pendingHeader}>
          <div>
            <h3>Pending Staff Requests</h3>
            <p>Approve staff here before they can log in or receive complaint allocations.</p>
          </div>
          <span className={styles.pendingCount}>{pendingStaff.length}</span>
        </div>

        {pendingStaff.length === 0 ? (
          <p className={styles.emptyPending}>No pending staff requests in your district.</p>
        ) : (
          <div className={styles.requestGrid}>
            {pendingStaff.map((staff) => (
              <div className={styles.requestCard} key={staff._id}>
                <div>
                  <h4>{staff.name}</h4>
                  <p>{staff.email}</p>
                  <p>
                    <strong>{staff.department}</strong> department, {staff.district}
                  </p>
                </div>
                <div className={styles.requestActions}>
                  <button
                    className={`${styles.reviewBtn} ${styles.approve}`}
                    disabled={reviewingId === staff._id}
                    onClick={() => handleApproval(staff, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className={`${styles.reviewBtn} ${styles.reject}`}
                    disabled={reviewingId === staff._id}
                    onClick={() => handleApproval(staff, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label>Department:</label>
          <select 
            name="department" 
            className={styles.filterSelect} 
            value={filters.department} 
            onChange={handleFilterChange}
          >
            <option value="all">All Departments</option>
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="power">Power</option>
            <option value="sanitation">Sanitation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="🔍 Search staff..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Active Cases</th>
              <th>Resolved</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedStaff && (
        <div className={styles.modalBackdrop} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Staff Details</h3>
              <button className={styles.closeBtn} onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <strong>ID:</strong>
                  <span>{selectedStaff._id}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Name:</strong>
                  <span>{selectedStaff.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Email:</strong>
                  <span>{selectedStaff.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Department:</strong>
                  <span>{selectedStaff.department.charAt(0).toUpperCase() + selectedStaff.department.slice(1)}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Location:</strong>
                  <span>{selectedStaff.district}, {selectedStaff.state}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Approval Status:</strong>
                  <span className={`${styles.statusBadge} ${styles[selectedStaff.approvalStatus || 'approved']}`}>
                    {selectedStaff.approvalStatus || 'approved'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Total Assigned:</strong>
                  <span>{selectedStaff.workload?.total || 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Active Cases:</strong>
                  <span>{selectedStaff.workload?.active || 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Resolved Cases:</strong>
                  <span>{selectedStaff.workload?.resolved || 0}</span>
                </div>
                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                  <strong>Success Rate:</strong>
                  <span className={styles.successRateValue}>
                    {getSuccessRate(selectedStaff.workload?.resolved, selectedStaff.workload?.total)}
                  </span>
                </div>
                
                {selectedStaff.recentComplaints && selectedStaff.recentComplaints.length > 0 && (
                  <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                    <strong>Recent Complaints:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                      {selectedStaff.recentComplaints.slice(0, 5).map((complaint, idx) => (
                        <li key={idx}>
                          {complaint.title} - <em>{complaint.status}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;