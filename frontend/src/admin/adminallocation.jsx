import React, { useEffect, useState } from 'react';
import styles from './admincomplaintsstyles.module.css';
import { useAdminAllocation } from './hooks/adminallocationhook.jsx';

const AllocationPage = () => {
  const {
    loading: hookLoading,
    fetchPendingComplaints,
    fetchAvailableStaff,
    assignComplaint,
    autoAllocateAll,
  } = useAdminAllocation();

  const [complaints, setComplaints] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  /* =========================
     INITIAL DATA FETCH
  ========================= */
  useEffect(() => {
    const initData = async () => {
      console.log('📋 Fetching pending complaints...');
      const complaintsData = await fetchPendingComplaints();
      
      if (complaintsData) {
        console.log('✅ Complaints received:', complaintsData);
        setComplaints(complaintsData);
      }
    };

    initData();
  }, []);

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

  const getFilteredComplaints = () => {
    return complaints.filter((c) => {
      const categoryMatch = filters.category === 'all' || c.category === filters.category;
      const priorityMatch = filters.priority === 'all' || c.priority === filters.priority;

      if (searchTerm === '') {
        return categoryMatch && priorityMatch;
      }

      const searchLower = searchTerm.toLowerCase();
      
      const searchableFields = [
        c._id?.toString(),
        c.citizen?.name?.toString(),
        c.citizen?.email?.toString(),
        c.title?.toString(),
        c.description?.toString(),
        c.category?.toString(),
        c.landmark?.toString(),
        c.priority?.toString(),
        c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      ];

      const searchMatch = searchableFields.some(field => 
        field && field.toLowerCase().includes(searchLower)
      );

      return categoryMatch && priorityMatch && searchMatch;
    });
  };

  /* =========================
     EXPORT CSV
  ========================= */
  const handleExportCSV = () => {
    const filteredComplaints = getFilteredComplaints();
    
    if (filteredComplaints.length === 0) {
      alert('No complaints to export');
      return;
    }

    const headers = [
      'ID',
      'Citizen Name',
      'Citizen Email',
      'Title',
      'Description',
      'Category',
      'Location',
      'Priority',
      'State',
      'District',
      'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredComplaints.map(c => {
        const formattedCreatedAt = c.createdAt ? `"${new Date(c.createdAt).toLocaleString().replace(/"/g, '""')}"` : '""';

        const row = [
          `"${c._id || ''}"`,
          `"${c.citizen?.name || ''}"`,
          `"${c.citizen?.email || ''}"`,
          `"${(c.title || '').replace(/"/g, '""')}"`,
          `"${(c.description || '').replace(/"/g, '""')}"`,
          `"${c.category || ''}"`,
          `"${(c.landmark || '').replace(/"/g, '""')}"`,
          `"${c.priority || 'medium'}"`,
          `"${c.state || ''}"`,
          `"${c.district || ''}"`,
          formattedCreatedAt
        ];
        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_complaints_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  /* =========================
     COMPLAINT DETAIL HANDLERS
  ========================= */
  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const handleAllocateClick = async (complaint) => {
    console.log('🔍 Fetching available staff for complaint:', complaint._id);
    
    // Fetch available staff for this complaint
    const staff = await fetchAvailableStaff(complaint._id);
    
    if (!staff || staff.length === 0) {
      alert(`No approved staff members are available for ${complaint.category} in ${complaint.district}. Approve a matching staff member first in Staff Management.`);
      return;
    }

    setSelectedComplaint(complaint);
    setAvailableStaff(staff);
    setSelectedStaffId('');
    setShowAllocationModal(true);
  };

  const handleRandomAllocation = () => {
    if (availableStaff.length === 0) {
      alert('No staff members available for this department');
      return;
    }
    
    // Sort by workload and pick the one with least workload
    const sortedStaff = [...availableStaff].sort((a, b) => 
      (a.workload?.active || 0) - (b.workload?.active || 0)
    );
    
    const randomStaff = sortedStaff[Math.floor(Math.random() * Math.min(3, sortedStaff.length))];
    setSelectedStaffId(randomStaff._id);
  };

  const handleAllocationSubmit = async () => {
    if (!selectedStaffId) {
      alert('Please select a staff member');
      return;
    }

    setIsAllocating(true);
    const result = await assignComplaint(selectedComplaint._id, selectedStaffId);

    if (result.success) {
      // Remove allocated complaint from list
      setComplaints(complaints.filter((c) => c._id !== selectedComplaint._id));
      setShowAllocationModal(false);
      alert('Complaint allocated successfully');
    } else {
      alert('Failed to allocate complaint: ' + (result.error || 'Unknown error'));
    }
    setIsAllocating(false);
  };

  /* =========================
     AUTO ALLOCATE ALL
  ========================= */
  const handleAutoAllocateAll = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to auto-allocate all ${complaints.length} pending complaints? ` +
      'This will assign complaints to staff with the least workload in matching departments.'
    );

    if (!confirmed) return;

    setIsAllocating(true);
    const result = await autoAllocateAll();

    if (result.success) {
      // Refresh complaints list
      const freshComplaints = await fetchPendingComplaints();
      setComplaints(freshComplaints);
      
      alert(
        `Auto-allocation complete!\n\n` +
        `✅ Allocated: ${result.allocated}\n` +
        `❌ Failed: ${result.failed}\n\n` +
        (result.errors?.length > 0 ? `Errors:\n${result.errors.map(e => `- ${e.error}`).join('\n')}` : '')
      );
    } else {
      alert('Auto-allocation failed: ' + (result.error || 'Unknown error'));
    }
    setIsAllocating(false);
  };

  const handleImageClick = () => {
    setShowImageViewer(true);
  };

  /* =========================
     UTILITY FUNCTIONS
  ========================= */
  const getPriorityBadge = (priority) => {
    const p = priority || 'medium';
    let badgeClass = '';
    if (p === 'high') badgeClass = 'badgeHigh';
    else if (p === 'medium') badgeClass = 'badgeMedium';
    else if (p === 'low') badgeClass = 'badgeLow';
    return <span className={`${styles.badge} ${styles[badgeClass]}`}>{p.toUpperCase()}</span>;
  };

  /* =========================
     RENDER TABLE
  ========================= */
  const renderTableBody = () => {
    if (hookLoading) {
      return (
        <tr>
          <td colSpan="9" className={styles.loadingCell}>
            <div className={styles.spinner}></div>
            <p>Loading complaints...</p>
          </td>
        </tr>
      );
    }

    const filteredComplaints = getFilteredComplaints();
    if (filteredComplaints.length === 0) {
      return (
        <tr>
          <td colSpan="9" className={styles.noDataCell}>
            No pending complaints found
          </td>
        </tr>
      );
    }

    return filteredComplaints.map((c) => (
      <tr key={c._id}>
        <td data-label="ID">
          <strong>{c._id.slice(-6)}</strong>
        </td>
        <td data-label="Citizen" className={styles.truncatedText} title={c.citizen?.name}>
          {c.citizen?.name || 'N/A'}
        </td>
        <td data-label="Email" className={styles.truncatedText} title={c.citizen?.email}>
          {c.citizen?.email || 'N/A'}
        </td>
        <td data-label="Title" className={styles.truncatedText} title={c.title}>
          {c.title}
        </td>
        <td data-label="Category">
          {c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : 'N/A'}
        </td>
        <td data-label="Location" className={styles.truncatedText} title={c.landmark}>
          {c.landmark || c.district}
        </td>
        <td data-label="Priority">{getPriorityBadge(c.priority)}</td>
        <td data-label="District">{c.district}</td>
        <td data-label="Actions" className={styles.actionCell}>
          <button 
            className={`${styles.actionBtn} ${styles.view}`} 
            title="View Details" 
            onClick={() => handleViewDetails(c)}
          >
            👁️
          </button>
          <button
            className={styles.allocateBtn}
            title="Allocate"
            onClick={() => handleAllocateClick(c)}
          >
            Allocate
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className={styles.contentArea}>
      <div className={styles.pageHeader}>
        <h2>Complaint Allocation</h2>
        <div className={styles.pageActions}>
          <button 
            className={styles.btnPrimary} 
            onClick={handleAutoAllocateAll}
            disabled={isAllocating || complaints.length === 0}
          >
            🤖 Auto-Allocate All ({complaints.length})
          </button>
          <button className={styles.btnSecondary} onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button
            className={styles.btnSecondary}
            onClick={async () => {
              const fresh = await fetchPendingComplaints();
              setComplaints(fresh);
              setFilters({ category: 'all', priority: 'all' });
              setSearchTerm('');
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label>Category:</label>
          <select 
            name="category" 
            className={styles.filterSelect} 
            value={filters.category} 
            onChange={handleFilterChange}
          >
            <option value="all">All Categories</option>
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="power">Power</option>
            <option value="sanitation">Sanitation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Priority:</label>
          <select 
            name="priority" 
            className={styles.filterSelect} 
            value={filters.priority} 
            onChange={handleFilterChange}
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="🔍 Search across all fields..."
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
              <th>Citizen</th>
              <th>Email</th>
              <th>Title</th>
              <th>Category</th>
              <th>Location</th>
              <th>Priority</th>
              <th>District</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedComplaint && (
        <div className={styles.modalBackdrop} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Complaint Details</h3>
              <button className={styles.closeBtn} onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <strong>ID:</strong>
                  <span>{selectedComplaint._id}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Citizen:</strong>
                  <span>{selectedComplaint.citizen?.name || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Email:</strong>
                  <span>{selectedComplaint.citizen?.email || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Category:</strong>
                  <span>{selectedComplaint.category?.charAt(0).toUpperCase() + selectedComplaint.category?.slice(1)}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Priority:</strong>
                  <span>{getPriorityBadge(selectedComplaint.priority)}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>District:</strong>
                  <span>{selectedComplaint.district}, {selectedComplaint.state}</span>
                </div>
                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                  <strong>Title:</strong>
                  <span>{selectedComplaint.title}</span>
                </div>
                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                  <strong>Location:</strong>
                  <span>{selectedComplaint.landmark}</span>
                </div>
                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                  <strong>Created At:</strong>
                  <span>{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                </div>
                <div className={`${styles.detailItem} ${styles.fullWidth} ${styles.description}`}>
                  <strong>Description:</strong>
                  <p>{selectedComplaint.description || 'N/A'}</p>
                </div>
                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div className={`${styles.detailItem} ${styles.fullWidth} ${styles.imageContainer}`}>
                    <strong>Images:</strong>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {selectedComplaint.images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={`Complaint ${idx + 1}`} 
                          onClick={() => {
                            setShowImageViewer(true);
                          }} 
                          style={{ cursor: 'pointer', maxWidth: '200px', maxHeight: '200px' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocationModal && selectedComplaint && (
        <div className={styles.modalBackdrop} onClick={() => !isAllocating && setShowAllocationModal(false)}>
          <div className={`${styles.modalContent} ${styles.editModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Allocate Complaint</h3>
              <button className={styles.closeBtn} onClick={() => !isAllocating && setShowAllocationModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '15px' }}>
                <strong>Complaint:</strong> {selectedComplaint.title}<br />
                <strong>Category:</strong> {selectedComplaint.category}<br />
                <strong>District:</strong> {selectedComplaint.district}
              </p>

              <div className={`${styles.formRow} ${styles.allocationFormRow}`}>
                <div className={styles.formGroup}>
                  <label htmlFor="staffSelect">
                    Select Staff Member ({availableStaff.length} available)
                  </label>
                  <select
                    id="staffSelect"
                    className={`${styles.filterSelect} ${styles.staffSelect}`}
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    disabled={isAllocating}
                  >
                    <option value="">-- Select Staff --</option>
                    {availableStaff.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} - Active: {s.workload?.active || 0} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>&nbsp;</label>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={handleRandomAllocation}
                    type="button"
                    disabled={isAllocating}
                  >
                    Assign to Least Busy 🔀
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.btnSecondary} 
                  onClick={() => setShowAllocationModal(false)}
                  disabled={isAllocating}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.btnPrimary} 
                  onClick={handleAllocationSubmit}
                  disabled={isAllocating}
                >
                  {isAllocating ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedComplaint && selectedComplaint.images && selectedComplaint.images.length > 0 && (
        <div className={styles.imageViewer} onClick={() => setShowImageViewer(false)}>
          <button className={styles.closeImageViewer} onClick={() => setShowImageViewer(false)}>
            ×
          </button>
          <img 
            src={selectedComplaint.images[0]} 
            alt="Complaint Full Screen" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};

export default AllocationPage;