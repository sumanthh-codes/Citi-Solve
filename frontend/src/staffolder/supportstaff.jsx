import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './supportstaffstyle.module.css';
import { useStaffSupport } from './hooks/supportstaffhook.jsx';

const SupportStaff = () => {
  const navigate = useNavigate();
  
  // Destructure logic from the hook
  const {
    loading: hookLoading,
    fetchProfile,
    contactAdmin,
    logoutStaff,
  } = useStaffSupport();

  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [successmessage, setSuccessMessage] = useState(false);
  
  const sidebarRef = useRef(null);
  const menuIconRef = useRef(null);
  const mainRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = async () => {
    await logoutStaff();
    navigate('/');
  };

  /* =========================
     INITIAL DATA FETCH
  ========================= */
  useEffect(() => {
    const initData = async () => {
      // Fetch Staff Profile
      const userData = await fetchProfile();
      
      if (userData) {
        console.log('✅ Staff data fetched:', userData);
        setUser(userData);
      } else {
        console.log('❌ Staff not authenticated');
        navigate('/');
      }
    };

    initData();
  }, [navigate]);

  /* =========================
     HANDLE CLICKS OUTSIDE
  ========================= */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isProfileDropdownOpen && !event.target.closest(`.${styles.profileDropdown}`) && !event.target.closest(`.${styles.profileSymbol}`)) {
        setIsProfileDropdownOpen(false);
      }

      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target) && menuIconRef.current && !menuIconRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isProfileDropdownOpen, isSidebarOpen]);

  /* =========================
     FORM SUBMISSION HANDLER
  ========================= */
  const handlesubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const subject = form.subject.value;
    const category = form.category.value;
    const message = form.message.value;

    if (!subject || !category || !message) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate lengths
    if (subject.trim().length > 200) {
      alert('Subject cannot exceed 200 characters.');
      return;
    }

    if (message.trim().length > 2000) {
      alert('Message cannot exceed 2000 characters.');
      return;
    }

    // Use the hook to contact admin
    const result = await contactAdmin({
      subject: subject.trim(),
      category,
      message: message.trim(),
    });

    if (result.success) {
      setSuccessMessage(true);
      form.reset();
      setTimeout(() => setSuccessMessage(false), 3000);
    } else {
      alert('Error: ' + (result.error || 'Failed to send message.'));
    }
  };

  /* =========================
     RENDERING
  ========================= */

  // Full Screen Loader
  if (hookLoading && !user) {
    return <div className={styles.fullLoading}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.mainContainer}>
      {isSidebarOpen && <div className={styles.sidebarOverlay} onClick={toggleSidebar}></div>}

      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`} ref={sidebarRef}>
        <h2>CitiSolve Staff</h2>
        <a onClick={() => navigate("/staff/home")} className={styles.navLink}>
          🏠 Home
        </a>
        <a onClick={() => navigate("/staff/departmentcomplaints")} className={styles.navLink}>
          📋 Department Complaints
        </a>
        <a onClick={() => navigate("/staff/search")} className={styles.navLink}>
          🔍 Advanced Search
        </a>
        <a onClick={() => navigate("/staff/faq")} className={styles.navLink}>
          ❓ FAQ
        </a>
        <a className={`${styles.navLink} ${styles.active}`}>
          💬 Support
        </a>
        <a onClick={() => navigate("/staff/userguide")} className={styles.navLink}>
          📖 User Guide
        </a>
      </div>

      <div className={`${styles.main} ${isSidebarOpen ? styles.mainShifted : ''}`} ref={mainRef}>
        <div className={styles.topnav}>
          <div className={styles.menuIcon} onClick={toggleSidebar} ref={menuIconRef}>
            ☰
          </div>
          <div className={styles.breadcrumb}>
            <span>Support</span>
          </div>
          <div className={styles.profileSymbol} onClick={toggleProfileDropdown}>
            {user.name ? user.name[0].toUpperCase() : 'S'}
          </div>
          <div className={`${styles.profileDropdown} ${isProfileDropdownOpen ? styles.open : ''}`}>
            <p>
              <strong>Staff Member</strong>
            </p>
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <p>Department: {user.department}</p>
            <p>Location: {user.district}, {user.state}</p>
            <p style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
              <a href="#" style={{ color: '#4a90e2', textDecoration: 'none' }}>
                Settings
              </a>{' '}
              |{' '}
              <a onClick={handleLogout} style={{ color: '#4a90e2', textDecoration: 'none', cursor: 'pointer' }}>
                Logout
              </a>
            </p>
          </div>
        </div>
        
        {successmessage && (
          <div className={styles.successMessage} style={{ display: 'block' }}>
            Support Message sent successfully!
          </div>
        )}

        <div className={styles.content} id="support-page">
          <div className={styles.welcomeSection}>
            <h1>💬 Support & Contact</h1>
            <p>Get help or contact the administrator</p>
          </div>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className={styles.infoCard}>
              <h3>📞 Administrator Contact</h3>
              <p><strong>Name:</strong> System Administrator</p>
              <p><strong>Email:</strong> citisolveotp@gmail.com</p>
              <p><strong>Phone:</strong> +91 98765 4XXXX</p>
            </div>
            <div className={styles.formCard} style={{ marginTop: '24px' }}>
              <h2>Contact Administrator</h2>
              <form onSubmit={handlesubmit}>
                <div className={styles.formGroup}>
                  <label>Subject * <span style={{ fontSize: '0.85em', color: '#666' }}>(max 200 characters)</span></label>
                  <input 
                    type="text" 
                    name="subject" 
                    required 
                    maxLength={200}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select name="category" required>
                    <option value="">Select...</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account Problem">Account Problem</option>
                    <option value="Complaint Not Assigned">Complaint Not Assigned</option>
                    <option value="Complaint Status Query">Complaint Status Query</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Workload Concern">Workload Concern</option>
                    <option value="Escalation">Escalation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Message * <span style={{ fontSize: '0.85em', color: '#666' }}>(max 2000 characters)</span></label>
                  <textarea 
                    name="message" 
                    rows="6" 
                    required
                    maxLength={2000}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  className={styles.btnPrimary} 
                  style={{ width: '100%' }}
                  disabled={hookLoading}
                >
                  {hookLoading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <footer>
          Powered by CitiSolve Staff Portal |{' '}
          <a 
            onClick={() => navigate('/staff/support')}
            style={{ color: 'white', textDecoration: 'none', cursor: 'pointer' }}
          >
            Contact Administrator
          </a>
        </footer>
      </div>
    </div>
  );
};

export default SupportStaff