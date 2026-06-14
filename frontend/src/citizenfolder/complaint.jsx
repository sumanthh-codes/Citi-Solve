import React, { useEffect, useState } from "react";
import styles from "./complaintstyle.module.css";
import { useNavigate } from "react-router-dom";
import { useMyComplaints } from "./hooks/mycomplaintshooks.jsx";

const Complaint = () => {
  const navigate = useNavigate();
  const { fetchProfile, fetchMyComplaints, fetchComplaintById, loading, error } = useMyComplaints();

  const [user, setUser] = useState(null);
  const [sidebarActive, setSidebarActive] = useState(false);
  const [complaints, setComplaints] = useState([]);
  
  // State for filters
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    search: "",
  });

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  // 1. Fetch User on Mount
  useEffect(() => {
    const initUser = async () => {
      try {
        const userData = await fetchProfile();
        setUser(userData);
      } catch (err) {
        navigate("/");
      }
    };
    initUser();
  }, [fetchProfile, navigate]);

  // 2. Fetch Complaints when filters change (Server-Side Filtering)
  useEffect(() => {
    if (!user) return;
    setPageLoading(true);
    // Debounce search slightly to prevent too many API calls
    const timer = setTimeout(async () => {
      const data = await fetchMyComplaints({
        status: filters.status,
        category: filters.category,
        search: filters.search,
        page: 1, // Reset to page 1 on filter change
        limit: 50,
      });
      // Assuming backend returns { complaints: [...] } or just [...]
      // Adjust based on exact response structure. 
      // Safely handling both array or object with complaints key.
      const list = Array.isArray(data) ? data : (data.complaints || []);
      setComplaints(list);
      setPageLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [user, filters, fetchMyComplaints]);

  const toggleSidebar = () => setSidebarActive(!sidebarActive);

  const handleView = async (id) => {
  const response = await fetchComplaintById(id);

  if (response?.success && response.complaint) {
    setSelectedComplaint(response.complaint);
  } else {
    console.error("Failed to load complaint details", response);
  }
  };


  const handleClosePopup = () => {
    setSelectedComplaint(null);
  };

  const handleImageClick = (imageUrl) => {
    setFullScreenImage(imageUrl);
  };

  const handleCloseFullScreenImage = () => {
    setFullScreenImage(null);
  };

  const handleLogout = async () => {
    // Ideally this should also be in a hook, but keeping scope minimal
    try {
      await fetch(import.meta.env.VITE_BACKEND_URL + "/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      navigate("/");
    } catch (err) {
      navigate("/");
    }
  };

  // Helper for Category Emojis
  const getCategoryEmoji = (category) => {
    if (!category) return "📋";
    switch (category.toLowerCase()) {
      case "roads": return "🛣️";
      case "water": return "💧";
      case "power": return "💡";
      case "sanitation": return "🗑️";
      default: return "📋";
    }
  };

  // Helper for Status Styles
  const getStatusClass = (status) => {
    if (!status) return styles.statusresolved;
    const s = status.toLowerCase();
    if (s.includes("pending")) return styles.statuspending;
    if (s.includes("progress")) return styles.statusprogress;
    return styles.statusresolved;
  };

  if (!user && loading) return <div className={styles.loading}>Loading...</div>;
  if (!user) return null;

  return (
    <div className={styles.main}>
      <div
        className={`${styles.overlay} ${sidebarActive ? styles.active : ""}`}
        onClick={toggleSidebar}
      ></div>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarActive ? styles.active : ""}`}>
        <h2>CitiSolve</h2>
        <a className={styles.navlink} onClick={() => { navigate("/citizen/home"); setSidebarActive(false); }}>🏠 Home</a>
        <a className={styles.navlink} onClick={() => { navigate("/citizen/submit"); setSidebarActive(false); }}>📝 Submit a complaint</a>
        <a className={`${styles.navlink} ${styles.active}`}>📋 My Complaints</a>
        <a className={styles.navlink} onClick={() => navigate("/citizen/faq")}>❓ FAQ</a>
        <a className={styles.navlink} onClick={() => navigate("/citizen/userguide")}>📖 User Guide</a>
      </div>

      {/* Top Nav */}
      <div className={styles.topnav}>
        <div className={styles.menuicon} onClick={toggleSidebar}>☰</div>
        <div className={styles.breadcrumb}>My Complaints</div>
        <div
          className={styles.profilesymbol}
          onClick={() => {
            document.querySelector(`.${styles.profiledropdown}`).classList.toggle(styles.show);
          }}
        >
          {user.fullname?.charAt(0).toUpperCase()}
        </div>
        <div className={styles.profiledropdown}>
          <p><strong>{user.fullname}</strong></p>
          <p><strong>Email: </strong>{user.email}</p>
          <p><strong>Ward: </strong>{user.ward}</p>
          <div className={styles.logout} onClick={handleLogout}>Logout</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.welcomesection}>
          <h1>📋 My Complaints</h1>
          <p>Track and manage all your submitted complaints</p>
        </div>

        {/* Filters */}
        <div className={styles.filtersbar}>
          <div className={styles.filtergroup}>
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={styles.filterselect}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className={styles.filtergroup}>
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className={styles.filterselect}
            >
              <option value="all">All</option>
              <option value="roads">🛣️ Roads</option>
              <option value="water">💧 Water</option>
              <option value="power">💡 Power</option>
              <option value="sanitation">🗑️ Sanitation</option>
              <option value="other">📋 Other</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="🔍 Search complaints..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={styles.filtersearch}
          />
        </div>

        {pageLoading && complaints.length === 0 ? (
          <div className={styles.loadingscreen}>
             <div className={styles.loadernow}>
              <div className={styles.loadingnow}></div>
              <div className={styles.loadertext}>Fetching complaints..</div>
            </div>
          </div>
        ) : (
          <div className={styles.complaintslist}>
            {complaints.length > 0 ? (
              complaints.map((c) => (
                <div className={styles.complaintcard} key={c._id}>
                  <div className={styles.complaintheader}>
                    <div className={styles.complaintid}>#{c._id.slice(-6)}</div>
                    <div className={`${styles.complaintstatus} ${getStatusClass(c.status)}`}>
                      {c.status}
                    </div>
                  </div>

                  <div className={styles.complaintbody}>
                    <div className={styles.complaintcategory}>
                      {getCategoryEmoji(c.category)} {c.category}
                    </div>
                    <div className={styles.complainttitle}>{c.title}</div>
                    
                    {/* Location display logic based on available address fields */}
                    <div className={styles.complaintlocation}>
                      📍 {c.landmark ? `${c.landmark}, ` : ''}{c.district}
                    </div>
                    
                    {/* Preview first image if available */}
                    {c.images && c.images.length > 0 ? (
                       <div className={styles.complaintlocation}>
                        🖼️ {c.images.length} image{c.images.length > 1 ? 's' : ''} attached
                       </div>
                    ) : (
                      <div className={styles.complaintlocation} style={{color: '#999'}}>
                        No images
                      </div>
                    )}
                  </div>

                  <div className={styles.complaintfooter}>
                    <div className={styles.complaintdate}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"}
                    </div>
                    <div className={styles.complaintactions}>
                      <button
                        className={`${styles.actionbtn} ${styles.btnview}`}
                        onClick={() => handleView(c._id)}
                      >
                        View Details
                      </button>
                      {/* Delete button removed: Not supported by backend constraints */}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptystate}>
                <div className={styles.emptystateicon}>📋</div>
                <h3>No Complaints Found</h3>
                <p>No complaints match your filters.</p>
                <button
                  className={styles.emptystatebtn}
                  onClick={() => navigate("/citizen/submit")}
                >
                  Submit Complaint
                </button>
              </div>
            )}
          </div>
        )}

        <footer className={styles.footer}>
          Powered by CitiSolve | <a href="#">How can we help you?</a>
        </footer>

        {/* Detailed View Modal */}
        {selectedComplaint && (
          <div className={styles.popupoverlay} onClick={handleClosePopup}>
            <div className={`${styles.complaintcard} ${styles.popup}`} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closebtn} onClick={handleClosePopup}>
                &times;
              </button>
              
              <div className={styles.complaintheader}>
                <div className={styles.complaintid}>#{selectedComplaint._id}</div>
                <div className={`${styles.complaintstatus} ${getStatusClass(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </div>
              </div>

              <div className={styles.complaintbody}>
                <div className={styles.complaintcategory}>
                  {getCategoryEmoji(selectedComplaint.category)} {selectedComplaint.category}
                </div>
                
                <h3 className={styles.complainttitle}>Title :{selectedComplaint.title}</h3>
                
                <p className={styles.complaintdescription}>
                  <strong>Description:</strong><br/>
                  {selectedComplaint.description}
                </p>
                
                <div className={styles.complaintlocation}>
                  <strong>Location Details:</strong>
                  <span>Landmark: {selectedComplaint.landmark}</span>
                  District: {selectedComplaint.district}<br/>
                  State: {selectedComplaint.state}<br/>
                  Pincode: {selectedComplaint.pincode}
                </div>

                {/* Image Gallery */}
                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <strong>Evidence:</strong>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '10px' }}>
                      {selectedComplaint.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Evidence ${idx + 1}`}
                          className={styles.complaintimage}
                          style={{ width: '100px', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => handleImageClick(img)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.complaintfooter}>
                <div className={styles.complaintdate}>
                  Submitted on: {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleDateString() : "N/A"}
                </div>
                <div className={styles.complaintdate}>
                  Assigned to: <strong>{selectedComplaint.assignedTo?.name || "Not yet assigned"}</strong>
                </div>
                {selectedComplaint.assignedTo && (
                  <>
                    <div className={styles.complaintdate}>
                      Assigned by: {selectedComplaint.assignedBy?.name || "Admin"}
                    </div>
                    <div className={styles.complaintdate}>
                      Assigned at: {selectedComplaint.assignedAt ? new Date(selectedComplaint.assignedAt).toLocaleDateString() : "N/A"}
                    </div>
                  </>
                )}
                {selectedComplaint.resolvedAt && (
                  <div className={styles.complaintdate}>
                    Resolved at: {new Date(selectedComplaint.resolvedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Image Viewer */}
        {fullScreenImage && (
          <div className={styles.fullscreenimageoverlay} onClick={handleCloseFullScreenImage}>
            <button className={styles.fullscreenclosebtn} onClick={handleCloseFullScreenImage}>
              &times;
            </button>
            <img
              src={fullScreenImage}
              alt="Full screen complaint"
              className={styles.fullscreenimage}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaint;