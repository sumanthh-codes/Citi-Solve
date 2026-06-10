import React, { useEffect, useState } from "react";
import exifr from "exifr";
import { useNavigate } from "react-router-dom";
import styles from "./submitcomplaintstyle.module.css";
import { useSubmitPortal } from "./hooks/submitcomplainthooks.jsx";

const SubmitComplaint = () => {
  const navigate = useNavigate();
  
  // =========================
  // HOOKS & STATE
  // =========================
  const { fetchProfile, submitComplaint, apiLoading, apiError } = useSubmitPortal();
  
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  
  // Location States
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [sidebarActive, setSidebarActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [imageError, setImageError] = useState("");
  const [locationWarning, setLocationWarning] = useState("");
  const [liveGPS, setLiveGPS] = useState(null); // { lat, lng }

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    state: "",
    district: "",
    pincode: "",
    landmark: "", 
  });

  const [formErrors, setFormErrors] = useState({
    title: false,
    category: false,
    description: false,
    landmark: false,
  });

  // =========================
  // INITIALIZATION
  // =========================
  useEffect(() => {
    const initData = async () => {
      const userData = await fetchProfile();
      if (!userData) {
        navigate("/");
        return;
      }
      setUser(userData);
      setPageLoading(false);
    };

    initData();
  }, [navigate]);

  // =========================
  // LOCATION LOGIC
  // =========================
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    
    // Reset location fields before fetching
    setFormData(prev => ({...prev, state: "", district: "", pincode: ""}));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Store live GPS for EXIF comparison later
        setLiveGPS({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/geocode/reverse?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          if (data.address) {
            setFormData(prev => ({
              ...prev,
              state: data.address.state || data.address.region || "Unknown State",
              district: data.address.county || data.address.state_district || data.address.city || "Unknown District",
              pincode: data.address.postcode || "000000"
            }));
          } else {
            setLocationError("Could not retrieve address details.");
          }
        } catch (err) {
          setLocationError("Failed to fetch address from coordinates.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationError("Please enable location services and try again.");
        setLocationLoading(false);
      }
    );
  };

  // =========================
  // HANDLERS
  // =========================
  // Haversine distance in km between two GPS coords
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleFileChange = async (e) => {
    const el = document.getElementById("file-upload");
    setLocationWarning("");

    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setImage(file);
      setFileName(file.name);
      if (el) el.style.backgroundColor = "#81b183ff";
      setImageError("");

      // ---- EXIF GPS Check (soft warning only) ----
      try {
        const gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude && liveGPS) {
          const dist = getDistanceKm(liveGPS.lat, liveGPS.lng, gps.latitude, gps.longitude);
          if (dist > 5) {
            setLocationWarning(
              `⚠️ This image was taken ~${Math.round(dist)} km away from your detected location. Please make sure the image is from the actual complaint site.`
            );
          }
        }
        // If no EXIF GPS found → no check, proceed normally
      } catch (err) {
        // EXIF read failed silently — no block
      }
    } else {
      setImage("");
      setFileName("");
      if (el) el.style.backgroundColor = "#fefae0";
      setImageError("Please upload an image");
    }
  };

  const getCharCount = (fieldName) => {
    const limits = { title: 50, description: 500, landmark: 60 };
    return formData[fieldName] ? `${formData[fieldName].length} / ${limits[fieldName]}` : "0";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const limits = { title: 50, category: 30, description: 500, landmark: 60 };

    if (limits[name] && value.length > limits[name]) return;
    
    setFormData({ ...formData, [name]: value });
    setFormErrors({ ...formErrors, [name]: false });
  };

  const validateForm = () => {
    const errors = {
      title: !formData.title.trim(),
      category: !formData.category,
      description: !formData.description.trim(),
      landmark: !formData.landmark.trim(),
    };
    
    setFormErrors(errors);

    // Strict location check
    if (!formData.state || !formData.district || !formData.pincode) {
      showAlertPopup("Please click the 'Detect Location' button to fill location details.", "error");
      return false;
    }

    return !Object.values(errors).some(error => error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      setImageError("Please upload an image");
      return;
    }

    if (!validateForm()) return;

    const result = await submitComplaint({
      formData,
      image
    });

    if (!result.success) {
      showAlertPopup(result.error || "Submission failed");
      return;
    }

    setShowSuccess(true);
    setSuccessMessage("Complaint submitted successfully!");
    clearForm();

    setTimeout(() => {
      navigate("/citizen/complaints");
    }, 1500);
  };

  const clearForm = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      landmark: "",
      state: "",
      district: "",
      pincode: "",
    });
    setImage("");
    setFileName("");
    const el = document.getElementById("file-upload");
    if (el) el.style.backgroundColor = "#fefae0";
    
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
    
    setFormErrors({ title: false, category: false, description: false, landmark: false });
    setImageError("");
    setLocationError("");
    setLocationWarning("");
    setLiveGPS(null);
  };

  // UI Helpers
  const toggleSidebar = () => setSidebarActive(!sidebarActive);
  const closeSidebar = () => setSidebarActive(false);
  const showAlertPopup = (message, type = "error") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };
  const closeAlert = () => setShowAlert(false);
  const handleCancel = () => showAlertPopup('Are you sure you want to cancel? All form data will be lost.', 'confirm');
  const handleConfirmCancel = () => { closeAlert(); navigate("/citizen/home"); };
  
  const handleLogout = async () => {
    try {
      await fetch(import.meta.env.VITE_BACKEND_URL+'/api/auth/logout', { method: 'POST', credentials: 'include' });
      navigate('/');
    } catch (err) {
      navigate('/');
    }
  };

  if (pageLoading) return <div className={styles.pageLoading}>Loading...</div>;
  if (!user) return null;

  return (
    <div className={styles.main}>
      {showSuccess && (
        <div className={styles.deletionmessage} style={{ backgroundColor: '#4caf50' }}>
          {successMessage}
        </div>
      )}

      {/* Alert Popup */}
      {showAlert && (
        <div className={styles.popupoverlay} onClick={alertType !== 'confirm' ? closeAlert : null}>
          <div className={styles.alertpopup} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closebtn} onClick={closeAlert}>&times;</button>
            <div className={styles.alertcontent}>
              <div className={styles.alerticon}>
                {alertType === 'error' ? '⚠️' : alertType === 'success' ? '✅' : '❓'}
              </div>
              <div className={styles.alertmessage}>{alertMessage}</div>
              <div className={styles.alertactions}>
                {alertType === 'confirm' ? (
                  <>
                    <button className={styles.alertbtn} onClick={closeAlert}>No, Keep Editing</button>
                    <button className={`${styles.alertbtn} ${styles.alertbtnprimary}`} onClick={handleConfirmCancel}>Yes, Cancel</button>
                  </>
                ) : (
                  <button className={styles.alertbtn} onClick={closeAlert}>Close</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar & Nav */}
      <div className={`${styles.overlay} ${sidebarActive ? styles.active : ''}`} onClick={toggleSidebar}></div>
      <div className={`${styles.sidebar} ${sidebarActive ? styles.active : ''}`}>
        <h2>CitiSolve</h2>
        <a className={styles.navlink} onClick={() => { navigate("/citizen/home"); closeSidebar(); }}>🏠 Home</a>
        <a className={`${styles.navlink} ${styles.active}`}>📝 Submit</a>
        <a className={styles.navlink} onClick={() => { navigate("/citizen/complaints"); closeSidebar(); }}>📋 My Complaints</a>
        <a className={styles.navlink} onClick={() => navigate("/citizen/faq")}>❓ FAQ</a>
        <a className={styles.navlink} onClick={() => navigate("/citizen/userguide")}>📖 User Guide</a>
      </div>

      <div className={styles.topnav}>
        <div className={styles.menuicon} onClick={toggleSidebar}>☰</div>
        <div className={styles.breadcrumb}>Submit Complaint</div>
        <div className={styles.profilesymbol} onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div className={`${styles.profiledropdown} ${profileDropdownOpen ? styles.show : ''}`}>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Ward:</strong> {user.ward}</p>
          <div className={styles.logout} onClick={handleLogout}>Logout</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.welcomesection}>
          <h1>📝 Submit a Complaint</h1>
          <p>Help us serve you better by reporting issues in your area</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "40px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "clamp(24px, 4vw, 32px)", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: "600", color: "#283618", marginBottom: "8px" }}>
              New Complaint Form
            </h2>
            <p style={{ fontSize: "14px", color: "#606c38", marginBottom: "24px" }}>
              Please fill in all the required fields
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Title */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#283618" }}>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Brief description of the issue"
                  style={{
                    padding: "12px 16px",
                    border: `2px solid ${formErrors.title ? '#ef5350' : '#e0d5b7'}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif"
                  }}
                  required
                />
                <div style={{ fontSize: "12px", color: "#606c38", textAlign: "right" }}>{getCharCount("title")}</div>
                {formErrors.title && <span style={{ fontSize: "12px", color: "#ef5350" }}>Please enter a complaint title</span>}
              </div>

              {/* Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#283618" }}>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  style={{
                    padding: "12px 16px",
                    border: `2px solid ${formErrors.category ? '#ef5350' : '#e0d5b7'}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    background: "white",
                    cursor: "pointer"
                  }}
                  required
                >
                  <option value="">Select a category</option>
                  <option value="roads">🛣️ Roads & Infrastructure</option>
                  <option value="water">💧 Water Supply</option>
                  <option value="power">💡 Power & Electricity</option>
                  <option value="sanitation">🗑️ Sanitation & Garbage</option>
                  <option value="other">📋 Other</option>
                </select>
                {formErrors.category && <span style={{ fontSize: "12px", color: "#ef5350" }}>Please select a category</span>}
              </div>

              {/* ======================================================== */}
              {/* NEW LOCATION SECTION: Button + 3 Read-only Fields       */}
              {/* ======================================================== */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#283618", marginBottom: "0" }}>
                    Location Details *
                  </label>
                  
                  {/* Fetch Button */}
                  <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={locationLoading}
                    style={{
                      padding: "8px 16px",
                      background: "#606c38",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: locationLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "background 0.2s"
                    }}
                  >
                    {locationLoading ? (
                      <>
                        <div className={styles.pageLoadingnow} style={{ width: "12px", height: "12px", borderWidth: "2px", borderColor: "white white transparent transparent" }}></div>
                        Fetching...
                      </>
                    ) : (
                      <>
                        📍 Detect Location
                      </>
                    )}
                  </button>
                </div>

                {/* 3 Read-Only Fields Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                   <input
                     type="text"
                     name="state"
                     value={formData.state}
                     placeholder="State"
                     readOnly
                     style={{
                       padding: "10px",
                       borderRadius: "10px",
                       border: "1px solid #e0e0e0",
                       background: "#f5f5f5", 
                       color: "#666",
                       fontSize: "13px",
                       fontFamily: "'Poppins', sans-serif"
                     }}
                   />
                   <input
                     type="text"
                     name="district"
                     value={formData.district}
                     placeholder="District"
                     readOnly
                     style={{
                       padding: "10px",
                       borderRadius: "10px",
                       border: "1px solid #e0e0e0",
                       background: "#f5f5f5",
                       color: "#666",
                       fontSize: "13px",
                       fontFamily: "'Poppins', sans-serif"
                     }}
                   />
                   <input
                     type="text"
                     name="pincode"
                     value={formData.pincode}
                     placeholder="Pincode"
                     readOnly
                     style={{
                       padding: "10px",
                       borderRadius: "10px",
                       border: "1px solid #e0e0e0",
                       background: "#f5f5f5",
                       color: "#666",
                       fontSize: "13px",
                       fontFamily: "'Poppins', sans-serif"
                     }}
                   />
                </div>
                
                {/* Location Error Message */}
                {locationError && (
                  <span style={{ fontSize: "12px", color: "#ef5350", marginTop: "-4px" }}>
                    ⚠️ {locationError}
                  </span>
                )}
              </div>

              {/* Landmark (Mandatory) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#283618" }}>Nearest Landmark *</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="E.g., Near City Hospital Main Gate"
                  style={{
                    padding: "12px 16px",
                    border: `2px solid ${formErrors.landmark ? '#ef5350' : '#e0d5b7'}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif"
                  }}
                  required
                />
                <div style={{ fontSize: "12px", color: "#606c38", textAlign: "right" }}>{getCharCount("landmark")}</div>
                {formErrors.landmark && <span style={{ fontSize: "12px", color: "#ef5350" }}>Please enter a landmark</span>}
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#283618" }}>Detailed Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  placeholder="Provide detailed information about the issue..."
                  style={{
                    padding: "12px 16px",
                    border: `2px solid ${formErrors.description ? '#ef5350' : '#e0d5b7'}`,
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    resize: "vertical"
                  }}
                  required
                />
                <div style={{ fontSize: "12px", color: "#606c38", textAlign: "right" }}>{getCharCount("description")}</div>
                {formErrors.description && <span style={{ fontSize: "12px", color: "#ef5350" }}>Please provide a description</span>}
              </div>

              {/* Image Upload */}
              <div>
                <label id="file-upload" className={styles.customfileupload}>
                  📁 Upload Image *
                  <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*"/>
                </label>
                {fileName && <p style={{ marginTop: "8px", fontSize: "13px", color: "#606c38" }}>Selected file: {fileName}</p>}
              </div>
              {imageError && <span style={{ fontSize: "10px", color: "#ef5350" }}>{imageError}</span>}
              {locationWarning && (
                <div style={{
                  background: "#fff8e1",
                  border: "1px solid #ffcc02",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#7a5c00",
                  lineHeight: "1.5"
                }}>
                  {locationWarning}
                  <div style={{ fontSize: "11px", marginTop: "4px", color: "#9e7500" }}>
                    You can still submit if this image is correct.
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={apiLoading}
                  style={{
                    flex: "1",
                    minWidth: "140px",
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #e0e0e0, #bdbdbd)",
                    color: "#424242",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    fontFamily: "'Poppins', sans-serif",
                    cursor: apiLoading ? "not-allowed" : "pointer",
                    opacity: apiLoading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={apiLoading || locationLoading || !!locationError}
                  className={styles.submitbtn}
                  style={{
                    flex: "1",
                    minWidth: "140px",
                    padding: "12px 24px",
                    background: (apiLoading || locationLoading) ? "#a9b9c9" : "linear-gradient(135deg, #dda15e, #bc6c25)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    fontFamily: "'Poppins', sans-serif",
                    cursor: (apiLoading || locationLoading) ? "not-allowed" : "pointer",
                    boxShadow: (apiLoading || locationLoading) ? "none" : "0 4px 12px rgba(221, 161, 94, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {apiLoading ? (
                    <>
                      <div className={styles.pageLoadingnow} style={{ width: "16px", height: "16px", borderWidth: "3px" }}></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Complaint"
                  )}
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#283618", marginBottom: "12px" }}>
                📋 Submission Guidelines
              </h3>
              <ul style={{ listStyle: "none", padding: "0", margin: "0", color: "#606c38", fontSize: "14px", lineHeight: "1.8" }}>
                <li>✓ Allow location access</li>
                <li>✓ Verify detected location</li>
                <li>✓ Provide specific landmark</li>
                <li>✓ Upload clear image</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <footer className={styles.footer}>Powered by CitiSolve | <a href="#">How can we help you?</a></footer>
    </div>
  );
};

export default SubmitComplaint;