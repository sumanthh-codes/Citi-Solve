import React, { useState, useEffect } from 'react';
import styles from './gueststyle.module.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { GoogleLogin } from '@react-oauth/google';

const CitiSolveLanding = () => {
  const navigate = useNavigate();
  const {
  signupUser,
  loginUser,
  verifyOtp,
  resendOTP,
  sendResetOtp,
  resetPassword,
  googleLoginUser,
  loading,
  error,
  otpSent,
  setError,
  } = useAuth();


  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setdetail] = useState("citizen");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [authMode, setAuthMode] = useState('login');

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(new Array(6).fill(''));
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  
  // Location state for Staff signup
  const [locationState, setLocationState] = useState("");
  const [locationDistrict, setLocationDistrict] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);

  const handleotpchange = (e, index) => {
    if (isNaN(e.target.value)) return;
    const newotp = [...otp];
    newotp[index] = e.target.value;
    setOtp(newotp);
    if (e.target.nextSibling && e.target.value !== "") {
      e.target.nextSibling.focus();
    }
  };

  const handlekeydown = (e, i) => {
    if (e.key === "Backspace") {
      if (otp[i] === "") {
        if (i === 0) return;
        e.preventDefault();
        const prev = e.target.parentNode.children[i - 1];
        prev.focus();
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveFeature((prev) => (prev + 1) % 4), 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset error when switching auth mode
  useEffect(() => {
    setError('');
    setdetail("citizen");
    setLocationState("");
    setLocationDistrict("");
    setLocationFetched(false);
  }, [authMode, setError]);

  // Fetch location using Geolocation API and reverse geocoding
  const fetchLocation = async () => {
    setFetchingLocation(true);
    setError('');
    
    try {
      // Get user's coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding using OpenStreetMap Nominatim
      const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,{
            credentials: 'include'
          }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }

      const data = await response.json();
      const address = data.address || {};

      // Extract state and district
      const state = address.state || address.region || "";
      const district = address.county || address.state_district || address.city || "";

      setLocationState(state);
      setLocationDistrict(district);
      setLocationFetched(true);

    } catch (err) {
      console.error('Location fetch error:', err);
      setError(err.message === 'User denied Geolocation' 
        ? 'Location access denied. Please enable location permissions.'
        : 'Failed to fetch location. Please try again or report to administrator.');
      setLocationFetched(false);
    } finally {
      setFetchingLocation(false);
    }
  };

  const features = [
    { icon: "📍", title: "Submit Complaints", description: "Report civic issues instantly with photos and location tracking" },
    { icon: "📊", title: "Track Progress", description: "Monitor your complaints in real-time with detailed status updates" },
    { icon: "🔔", title: "Get Notifications", description: "Stay informed with instant alerts on municipal updates and resolutions" },
    { icon: "📈", title: "Analytics Dashboard", description: "Access comprehensive data insights and community complaint trends" }
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "5K+", label: "Complaints Resolved" },
    { number: "95%", label: "Satisfaction Rate" },
    { number: "24/7", label: "Support Available" }
  ];

  const buildSignupPayload = (formData) => {
  return {
    name: formData.get('fullname')?.trim(),
    email: formData.get('email')?.trim(),
    password: formData.get('password'),
    role: detail,
    ...(detail === 'staff' && {
      department: formData.get('category'),
      state: locationState,
      district: locationDistrict,
    }),
  };
  };


  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.target);

    if (authMode === 'signup') {
      await signupUser(buildSignupPayload(formData));
    } else {
        await loginUser({
          email: formData.get('email')?.trim(),
          password: formData.get('password'),
          role: detail,
        });
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const ok = await sendResetOtp(forgotEmail.trim());
    if (ok) {
      setForgotStep('verify');
      setForgotOtp(new Array(6).fill(''));
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    const enteredOtp = forgotOtp.join('');
    const ok = await resetPassword(forgotEmail.trim(), enteredOtp, forgotNewPassword);
    if (ok) {
      setForgotSuccess(true);
    }
  };

  const handleForgotOtpChange = (e, index) => {
    if (isNaN(e.target.value)) return;
    const next = [...forgotOtp];
    next[index] = e.target.value;
    setForgotOtp(next);
    if (e.target.nextSibling && e.target.value !== '') e.target.nextSibling.focus();
  };

  const handleForgotOtpKeyDown = (e, i) => {
    if (e.key === 'Backspace' && forgotOtp[i] === '') {
      if (i === 0) return;
      e.preventDefault();
      const prev = e.target.parentNode.children[i - 1];
      prev.focus();
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google login failed. Please try again.');
      return;
    }

    await googleLoginUser(credentialResponse.credential);
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail('');
    setForgotOtp(new Array(6).fill(''));
    setForgotNewPassword('');
    setForgotSuccess(false);
    setError('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('email');
    setForgotEmail('');
    setForgotOtp(new Array(6).fill(''));
    setForgotNewPassword('');
    setForgotSuccess(false);
    setError('');
  };


  const handleotp = async (e) => {
  e.preventDefault();
  const enteredOtp = otp.join("");
  await verifyOtp(enteredOtp);
  };


  const handleclose = () => {
    setShowAuthModal(false);
  };

  // Loader styles
  const loaderStyles = {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  const errorMessageStyles = {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '12px',
    marginBottom: '8px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    borderRadius: '6px',
    textAlign: 'center',
  };

  return (
    <div className={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {/* Navigation */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoText}>CitiSolve</span>
          </div>
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </div>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
            <a href="#features" className={styles.navLink} onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className={styles.navLink} onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#about" className={styles.navLink} onClick={() => setMenuOpen(false)}>About</a>
            <button className={styles.authBtn} onClick={() => setShowAuthModal(true)}>Login / Sign Up</button>
          </div>
        </div>
      </nav>
      {/* Auth Modal */}
      {showAuthModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={handleclose}>×</button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Welcome to CitiSolve</h2>
              <div className={styles.tabContainer}>
                <button className={`${styles.tab} ${authMode === 'login' ? styles.tabActive : ''}`} onClick={() => setAuthMode('login')}>
                  Login
                  <img className={styles.signupimg} src='unicycle.png' alt="login" />
                </button>
                <button className={`${styles.tab} ${authMode === 'signup' ? styles.tabActive : ''}`} onClick={() => setAuthMode('signup')}>
                  Sign Up
                  <img className={styles.signupimg} src='circus-tent.png' alt="signup" />
                </button>
              </div>
            </div>
            <div className={styles.profilesections}>
              <button className={`${styles.profiles} ${detail === "citizen" ? styles.active : ""}`} onClick={(e) => {
                e.preventDefault();
                setdetail("citizen");
                setError('');
                setLocationState("");
                setLocationDistrict("");
                setLocationFetched(false);
              }}>
                <img src="/citizen.png" className={styles.profilesimg} alt="citizen" />
                citizen
              </button>
              <button className={`${styles.profiles} ${detail === "staff" ? styles.active : ""}`} onClick={(e) => {
                e.preventDefault();
                setdetail("staff");
                setError('');
                setLocationState("");
                setLocationDistrict("");
                setLocationFetched(false);
              }}>
                <img src="/staff.png" className={styles.profilesimg} alt="staff" />
                Staff
              </button>
              {authMode === 'login' && (
                <button className={`${styles.profiles} ${detail === "admin" ? styles.active : ""}`} onClick={(e) => {
                  e.preventDefault();
                  setdetail("admin");
                  setError('');
                }}>
                  <img src="/admin.png" className={styles.profilesimg} alt="admin" />
                  admin
                </button>
              )}
            </div>
            <form onSubmit={handleAuthSubmit} className={styles.formContainer}>
              {detail === 'citizen' && !otpSent && (
                <div className={styles.googleAuthBlock}>
                  <div className={styles.authDivider}>
                    <span></span>
                    <p>or continue as citizen</p>
                    <span></span>
                  </div>
                  <div className={styles.googleButtonWrap}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google login failed. Please try again.')}
                      text={authMode === 'signup' ? 'signup_with' : 'signin_with'}
                      theme="outline"
                      size="large"
                      shape="rectangular"
                      logo_alignment="left"
                      width="400"
                    />
                  </div>
                  <p className={styles.googleHint}>Google Sign-In is available for citizen accounts only.</p>
                </div>
              )}
              {authMode === 'signup' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input type="text" name='fullname' className={styles.input} placeholder="Enter your name" disabled={otpSent} required />
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input type="email" name='email' className={styles.input} disabled={otpSent} placeholder="Enter your email" required />
              </div>
              {authMode === 'signup' && detail === 'staff' && (
                <div className={styles.formgroupright}>
                  <div className={styles.formgroup}>
                    <label htmlFor="complaint-category">Category *</label>
                    <select id="complaint-category" name="category" disabled={otpSent} required>
                      <option value="">Select a category</option>
                      <option value="roads">🛣️ Roads & Infrastructure</option>
                      <option value="water">💧 Water Supply</option>
                      <option value="power">💡 Power & Electricity</option>
                      <option value="sanitation">🗑️ Sanitation & Garbage</option>
                      <option value="other">📋 Other</option>
                    </select>
                    <span className={styles.formerror}>Please select a category</span>
                  </div>
                  
                  {!otpSent && (
                    <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                      <button 
                        type="button" 
                        onClick={fetchLocation} 
                        disabled={fetchingLocation}
                        className={styles.submitBtn}
                        style={{
                          backgroundColor: locationFetched ? '#10b981' : '#667eea',
                          opacity: fetchingLocation ? 0.7 : 1,
                          cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                          marginBottom: '1rem'
                        }}
                      >
                        {fetchingLocation ? (
                          <>
                            <div style={loaderStyles}></div>
                            <span style={{ marginLeft: '8px' }}>Fetching Location...</span>
                          </>
                        ) : locationFetched ? (
                          '✅ Location Fetched'
                        ) : (
                          '📍 Fetch Location (Required)'
                        )}
                      </button>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>State</label>
                    <input 
                      type="text" 
                      name='state' 
                      value={locationState}
                      readOnly
                      placeholder="Auto-filled from location"
                      className={styles.input}
                      style={{
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>District</label>
                    <input 
                      type="text" 
                      name='district' 
                      value={locationDistrict}
                      readOnly
                      placeholder="Auto-filled from location"
                      className={styles.input}
                      style={{
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        cursor: 'not-allowed'
                      }}
                    />
                    <p style={{
                      fontSize: '12px',
                      color: '#f59e0b',
                      marginTop: '8px',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      backgroundColor: '#797770',
                    }}>
                      ⚠️ If the detected location is incorrect/failing, please report it to the administrator.
                    </p>
                  </div>
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input type="password" name='password' disabled={otpSent} className={styles.input} placeholder="Enter your password" required />
                {authMode === 'login' && !otpSent && (
                  <button
                    type="button"
                    onClick={openForgot}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#bc6c25',
                      fontSize: '13px',
                      fontFamily: 'Poppins, sans-serif',
                      cursor: 'pointer',
                      textAlign: 'right',
                      marginTop: '4px',
                      padding: '0',
                      textDecoration: 'underline',
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              {error && (
                <div style={errorMessageStyles}>
                  {error}
                </div>
              )}
              {otpSent && (
                <>
                  <span className={styles.otpname}>Enter otp</span>
                  <label className={styles.contentxyz}>
                    {otp.map((data, i) => (
                      <input
                        type="text"
                        key={i}
                        value={data}
                        onChange={(e) => handleotpchange(e, i)}
                        onKeyDown={(e) => handlekeydown(e, i)}
                        maxLength="1"
                        name="otp"
                        required
                      />
                    ))}
                  </label>
                </>
              )}
              {!otpSent && (
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <div style={loaderStyles}></div>
                  ) : (
                    "Get OTP ✉️"
                  )}
                </button>
              )}
              {otpSent && (
                <>
                  <button
                    type="button"
                    onClick={handleotp}
                    className={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <div style={loaderStyles}></div>
                    ) : (
                      authMode === 'login' ? 'Login 🚀' : 'Create Account 🚀'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resendOTP}
                    className={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <div style={loaderStyles}></div>
                    ) : (
                      "Resend OTP ✉️"
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
      {/* Forgot Password Modal */}
      {showForgot && (
        <div className={styles.modalOverlay} onClick={closeForgot}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeForgot}>×</button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🔑 Reset Password</h2>
            </div>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <p style={{ color: '#283618', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Password reset successful!
                </p>
                <p style={{ color: '#606c38', fontFamily: 'Poppins, sans-serif', fontSize: '14px', marginBottom: '24px' }}>
                  You can now login with your new password.
                </p>
                <button
                  onClick={closeForgot}
                  className={styles.submitBtn}
                >
                  Back to Login
                </button>
              </div>
            ) : forgotStep === 'email' ? (
              <form onSubmit={handleForgotSendOtp} className={styles.formContainer}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Enter your registered email</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <div style={errorMessageStyles}>{error}</div>}
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <div style={loaderStyles}></div> : 'Send OTP ✉️'}
                </button>
                <button type="button" onClick={closeForgot} className={styles.submitBtn}
                  style={{ background: 'linear-gradient(135deg, #9ca3af, #6b7280)', marginTop: '4px' }}>
                  Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className={styles.formContainer}>
                <p style={{ color: '#606c38', fontFamily: 'Poppins, sans-serif', fontSize: '13px', textAlign: 'center', marginBottom: '4px' }}>
                  OTP sent to <strong>{forgotEmail}</strong>
                </p>
                <div className={styles.formGroup}>
                  <span className={styles.otpname}>Enter OTP</span>
                  <label className={styles.contentxyz}>
                    {forgotOtp.map((val, i) => (
                      <input
                        key={i}
                        type="text"
                        value={val}
                        onChange={(e) => handleForgotOtpChange(e, i)}
                        onKeyDown={(e) => handleForgotOtpKeyDown(e, i)}
                        maxLength="1"
                        required
                      />
                    ))}
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>New Password</label>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Enter new password (min 5 chars)"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    minLength={5}
                    required
                  />
                </div>
                {error && <div style={errorMessageStyles}>{error}</div>}
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <div style={loaderStyles}></div> : 'Reset Password 🔑'}
                </button>
                <button type="button" onClick={() => { setForgotStep('email'); setError(''); }}
                  className={styles.submitBtn}
                  style={{ background: 'linear-gradient(135deg, #9ca3af, #6b7280)', marginTop: '4px' }}>
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Your Voice for a <span className={styles.highlightText}>Better City</span>
            </h1>
            <p className={styles.heroSubtitle}>
              CitiSolve connects citizens with municipal services, making it easier than ever to report issues, track progress, and build stronger communities together.
            </p>
            <div className={styles.heroCta}>
              <button className={styles.primaryBtn} onClick={() => setShowAuthModal(true)}>Get Started Now</button>
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.floatingCard}>
              <div className={styles.cardIcon}>🏛️</div>
              <h3 className={styles.cardTitle}>Smart City Solutions</h3>
              <p className={styles.cardText}>Empowering citizens, one complaint at a time</p>
            </div>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Choose CitiSolve?</h2>
          <p className={styles.sectionSubtitle}>Everything you need to make your city better, all in one place</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, i) => (
            <div key={i} className={`${styles.featureCard} ${activeFeature === i ? styles.featureCardActive : ''}`} onMouseEnter={() => setActiveFeature(i)}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
      {/* How It Works */}
      <section id="how-it-works" className={styles.howItWorksSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>Three simple steps to make a difference</p>
        </div>
        <div className={styles.stepsContainer}>
          {[{ num: "1", title: "Report", desc: "Submit your complaint with photos and location" },
            { num: "2", title: "Track", desc: "Monitor progress with real-time updates" },
            { num: "3", title: "Resolve", desc: "Get notified when your issue is resolved" }].map((step, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNumber}>{step.num}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Make a Difference?</h2>
          <p className={styles.ctaSubtitle}>Join thousands of citizens working together to build better communities</p>
          <button className={styles.ctaButton} onClick={() => setShowAuthModal(true)}>Create Your Account</button>
        </div>
      </section>
      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>CitiSolve</div>
            <p className={styles.footerTagline}>Empowering citizens, transforming cities</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4 className={styles.footerColumnTitle}>Product</h4>
              <a href="#" className={styles.footerLink}>Features</a>
              <a href="#" className={styles.footerLink}>Pricing</a>
              <a href="#" className={styles.footerLink}>FAQ</a>
            </div>
            <div className={styles.footerColumn}>
              <h4 className={styles.footerColumnTitle}>Company</h4>
              <a href="#" className={styles.footerLink}>About Us</a>
              <a href="#" className={styles.footerLink}>Contact</a>
              <a href="#" className={styles.footerLink}>Careers</a>
            </div>
            <div className={styles.footerColumn}>
              <h4 className={styles.footerColumnTitle}>Legal</h4>
              <a href="#" className={styles.footerLink}>Privacy</a>
              <a href="#" className={styles.footerLink}>Terms</a>
              <a href="#" className={styles.footerLink}>Security</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 CitiSolve. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default CitiSolveLanding;