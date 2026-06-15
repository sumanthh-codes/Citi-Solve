import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { apiFetch } from "./utils/apiFetch.js";
// Remove the import of ScrollRestoration
import CitiSolveLanding from "./guest/guest.jsx";
import CitizenPortal from "./citizenfolder/citizenportal.jsx";
import Complaint from "./citizenfolder/complaint.jsx";
import SubmitComplaint from "./citizenfolder/submitcomplaint.jsx";
import FAQ from "./citizenfolder/faq.jsx";
import UserGuide from "./citizenfolder/userguide.jsx";
import StaffPortal from "./staffolder/staffportal.jsx";
import DepartmentComplaints from "./staffolder/departmentcomplaints.jsx";
import SupportStaff from "./staffolder/supportstaff.jsx";
import UserGuideStaff from "./staffolder/staffuserguide.jsx";
import FaqStaff from "./staffolder/stafffaq.jsx";
import SearchStaff from "./staffolder/staffsearch.jsx";
import { useEffect, useState } from "react";
import AdminLayout from "./admin/adminportal.jsx";


const ProtectedStaffRoute = ({ children }) => {
  const [access, setAccess] = useState('checking');

  useEffect(() => {
    const verifyStaffAccess = async () => {
      try {
        const response = await apiFetch('/api/auth/is-authenticated');
        const data = await response.json();

        if (response.ok && data.success && data.user?.role === 'staff') {
          setAccess('allowed');
        } else {
          setAccess('denied');
        }
      } catch {
        setAccess('denied');
      }
    };

    verifyStaffAccess();
  }, []);

  if (access === 'checking') {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;
  }

  return access === 'allowed' ? children : <Navigate to="/" replace />;
};


function App() {
  // Add this hook to listen for location changes
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
    {/* Remove or keep this line commented out: <ScrollRestoration /> */}
    <Routes>
        <Route path="/" element={<CitiSolveLanding />} />
        <Route path="/citizen/home" element={<CitizenPortal />} />
        <Route path="/citizen/complaints" element={<Complaint />} />
        <Route path="/citizen/submit" element = {<SubmitComplaint/>} />
        <Route path="/citizen/faq" element = {<FAQ/>} />
        <Route path="/citizen/userguide" element = {<UserGuide/>} />
        <Route path="/staff/home" element={<ProtectedStaffRoute><StaffPortal /></ProtectedStaffRoute>} />
        <Route path="/staff/departmentcomplaints" element={<ProtectedStaffRoute><DepartmentComplaints /></ProtectedStaffRoute>} />
        <Route path="/staff/support" element={<ProtectedStaffRoute><SupportStaff /></ProtectedStaffRoute>} />
        <Route path="/staff/userguide" element={<ProtectedStaffRoute><UserGuideStaff /></ProtectedStaffRoute>} />
        <Route path="/staff/faq" element={<ProtectedStaffRoute><FaqStaff /></ProtectedStaffRoute>} />
        <Route path="/staff/search" element={<ProtectedStaffRoute><SearchStaff /></ProtectedStaffRoute>} />
        <Route path="/admin/*" element={<AdminLayout />} />
    </Routes>
    </>
  )
}

export default App;