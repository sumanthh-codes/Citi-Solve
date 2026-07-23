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


// Client-side route guard. Confirms the user is authenticated and — when a
// `role` is given — that their role matches, before rendering the page.
// This is UX only; the backend middleware is the real authorization boundary.
const ProtectedRoute = ({ role, children }) => {
  const [access, setAccess] = useState('checking');

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await apiFetch('/api/auth/is-authenticated');
        const data = await response.json();

        if (response.ok && data.success && (!role || data.user?.role === role)) {
          setAccess('allowed');
        } else {
          setAccess('denied');
        }
      } catch {
        setAccess('denied');
      }
    };

    verifyAccess();
  }, [role]);

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
        <Route path="/citizen/home" element={<ProtectedRoute role="citizen"><CitizenPortal /></ProtectedRoute>} />
        <Route path="/citizen/complaints" element={<ProtectedRoute role="citizen"><Complaint /></ProtectedRoute>} />
        <Route path="/citizen/submit" element={<ProtectedRoute role="citizen"><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/citizen/faq" element={<ProtectedRoute role="citizen"><FAQ /></ProtectedRoute>} />
        <Route path="/citizen/userguide" element={<ProtectedRoute role="citizen"><UserGuide /></ProtectedRoute>} />
        <Route path="/staff/home" element={<ProtectedRoute role="staff"><StaffPortal /></ProtectedRoute>} />
        <Route path="/staff/departmentcomplaints" element={<ProtectedRoute role="staff"><DepartmentComplaints /></ProtectedRoute>} />
        <Route path="/staff/support" element={<ProtectedRoute role="staff"><SupportStaff /></ProtectedRoute>} />
        <Route path="/staff/userguide" element={<ProtectedRoute role="staff"><UserGuideStaff /></ProtectedRoute>} />
        <Route path="/staff/faq" element={<ProtectedRoute role="staff"><FaqStaff /></ProtectedRoute>} />
        <Route path="/staff/search" element={<ProtectedRoute role="staff"><SearchStaff /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>} />
    </Routes>
    </>
  )
}

export default App;