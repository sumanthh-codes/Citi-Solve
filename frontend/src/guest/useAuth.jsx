import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export const useAuth = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [pendingUserId, setPendingUserId] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'signup' | 'login'

  /* =========================
     SIGNUP
  ========================= */
  const signupUser = async (payload) => {
    setLoading(true);
    setError('');
    setMessage('');
    setAuthMode('signup');

    try {
      const res = await fetch(`${API_URL}/api/auth/send-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Signup failed');
        return false;
      }

      setPendingUserId(data.tempUserId);
      setOtpSent(true);
      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGIN
  ========================= */
  const loginUser = async (payload) => {
    setLoading(true);
    setError('');
    setMessage('');
    setAuthMode('login');

    try {
      const res = await fetch(`${API_URL}/api/auth/send-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Login failed');
        return false;
      }

      setPendingUserId(data.userId);
      setOtpSent(true);
      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     VERIFY OTP
  ========================= */
  const verifyOtp = async (otp) => {
    setLoading(true);
    setError('');
    setMessage('');
    if (!pendingUserId) {
    setError("OTP session expired. Please login again.");
    return false;
    }

    const endpoint =
      authMode === 'signup'
        ? '/api/auth/verify-signup-otp'
        : '/api/auth/verify-login-otp';

    const payload =
      authMode === 'signup'
        ? { otp, tempUserId: pendingUserId }
        : { otp, userId: pendingUserId };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'OTP verification failed');
        return false;
      }

      if (data.requiresApproval) {
        setOtpSent(false);
        setPendingUserId(null);
        setMessage(data.message);
        navigate('/');
        return true;
      }

      // Backend returns role in user object
      const role = data.user?.role;
      if (role) {
        navigate(`/${role}/home`);
      } else {
        navigate('/');
      }

      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RESEND OTP
  ========================= */
  const resendOTP = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    const endpoint =
      authMode === 'signup'
        ? '/api/auth/resend-signup-otp'
        : '/api/auth/resend-login-otp';

    const payload =
      authMode === 'signup'
        ? { tempUserId: pendingUserId }
        : { userId: pendingUserId };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Failed to resend OTP');
        return false;
      }

      return true;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD — SEND OTP
  ========================= */
  const sendResetOtp = async (email) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/send-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data.message || 'Failed to send OTP');
        return false;
      }
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD — RESET
  ========================= */
  const resetPassword = async (email, otp, newPassword) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data.message || 'Password reset failed');
        return false;
      }
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     GOOGLE LOGIN - CITIZEN
  ========================= */
  const googleLoginUser = async (credential) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Google login failed');
        return false;
      }

      navigate('/citizen/home');
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/');
    } catch {
      // silent fail
    }
  };

  return {
    signupUser,
    loginUser,
    verifyOtp,
    resendOTP,
    logout,
    sendResetOtp,
    resetPassword,
    googleLoginUser,
    loading,
    error,
    message,
    otpSent,
    setError,
    setMessage,
  };
};