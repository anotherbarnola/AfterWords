import React, { useState, useEffect } from "react";

export default function App() {
  const [page, setPage] = useState("landing"); // 'landing', 'login', 'register', 'dashboard', 'compose', 'contacts', 'verify-email', 'forgot-password', 'reset-password'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Email Verification states
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [debugVerifyToken, setDebugVerifyToken] = useState("");

  // Forgot Password / Reset Password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [debugResetToken, setDebugResetToken] = useState("");

  // Compose states
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");
  const [msgStatus, setMsgStatus] = useState("draft");
  const [recipients, setRecipients] = useState([{ name: "", email: "" }]);

  // Trusted contact states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Loading states
  const [loading, setLoading] = useState(false);

  // Check for reset-password token in URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      // Clear query params to keep URL clean
      window.history.replaceState({}, document.title, window.location.pathname);
      setResetToken(tokenParam);
      setPage("reset-password");
    }
  }, []);

  // Sync token to localStorage and fetch user data
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchUserProfile();
    } else {
      localStorage.removeItem("token");
      setUser(null);
      if (page !== "login" && page !== "register" && page !== "landing" && page !== "forgot-password" && page !== "reset-password") {
        setPage("landing");
      }
    }
  }, [token]);

  // Fetch lists when logged in
  useEffect(() => {
    if (user && user.is_email_verified) {
      fetchMessages();
      fetchContacts();
    }
  }, [user, page]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        // Redirect to email verification if not verified
        if (data.user && !data.user.is_email_verified) {
          setVerifyEmailAddress(data.user.email);
          setPage("verify-email");
        } else if (page === "landing" || page === "login" || page === "register" || page === "verify-email") {
          setPage("dashboard");
        }
      } else {
        // Token expired or invalid
        setToken("");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Messages fetch error:", err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/trusted-contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error("Contacts fetch error:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setLoginEmail("");
        setLoginPassword("");
        if (data.user && !data.user.is_email_verified) {
          setVerifyEmailAddress(data.user.email);
          setPage("verify-email");
        } else {
          setPage("dashboard");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setVerifyEmailAddress(regEmail);
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        if (data.user && data.user.debugToken) {
          setDebugVerifyToken(data.user.debugToken);
        }
        setPage("verify-email");
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmailAddress, token: verificationCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Email successfully verified!");
        setVerificationCode("");
        setDebugVerifyToken("");
        fetchUserProfile();
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        if (data.debugToken) {
          setDebugResetToken(data.debugToken);
        }
        setForgotEmail("");
      } else {
        setError(data.error || "Failed to process request");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Password reset successfully! You can now log in.");
        setResetToken("");
        setNewPassword("");
        setDebugResetToken("");
        setPage("login");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert("Check-in logged! We have updated your status to 'Alive'.");
        fetchUserProfile();
      } else {
        alert("Check-in failed. Please try again.");
      }
    } catch (err) {
      alert("Network error logging check-in.");
    }
  };

  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: "", email: "" }]);
  };

  const handleRecipientChange = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const handleRemoveRecipient = (index) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const handleCreateMessage = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const validRecipients = recipients.filter(r => r.name && r.email);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: msgSubject,
          content: msgContent,
          status: msgStatus,
          recipients: validRecipients,
        }),
      });
      if (res.ok) {
        setMsgSubject("");
        setMsgContent("");
        setMsgStatus("draft");
        setRecipients([{ name: "", email: "" }]);
        setPage("dashboard");
        fetchMessages();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create message");
      }
    } catch (err) {
      setError("Network error creating message.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/trusted-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        }),
      });
      if (res.ok) {
        setContactName("");
        setContactEmail("");
        setContactPhone("");
        setPage("contacts");
        fetchContacts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add contact");
      }
    } catch (err) {
      setError("Network error adding contact.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    setPage("landing");
  };

  return (
    <div className="app-container">
      {/* Header Navigation */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => setPage("landing")}>
          <img src="/logo.png" alt="AfterWords" className="brand-logo" />
          <span className="brand-name">AfterWords</span>
        </div>
        <nav className="nav-links">
          {user && user.is_email_verified ? (
            <>
              <span className="welcome-tag">Hello, {user.name}</span>
              <button className={`nav-btn ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>Dashboard</button>
              <button className={`nav-btn ${page === "compose" ? "active" : ""}`} onClick={() => setPage("compose")}>Compose</button>
              <button className={`nav-btn ${page === "contacts" ? "active" : ""}`} onClick={() => setPage("contacts")}>Trusted Contacts</button>
              <button className="nav-btn logout-btn" onClick={handleLogout}>Log Out</button>
            </>
          ) : user && !user.is_email_verified ? (
            <>
              <span className="welcome-tag">Hello, {user.name} (Unverified)</span>
              <button className="nav-btn logout-btn" onClick={handleLogout}>Log Out</button>
            </>
          ) : (
            <>
              <button className={`nav-btn ${page === "login" ? "active" : ""}`} onClick={() => setPage("login")}>Login</button>
              <button className="nav-btn cta-btn" onClick={() => setPage("register")}>Get Started</button>
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}
        {successMsg && <div className="success-banner">{successMsg}</div>}

        {/* Landing Page */}
        {page === "landing" && (
          <section className="landing-hero">
            <h1 className="hero-title">Words that live on, securely delivered.</h1>
            <p className="hero-subtitle">
              Write meaningful messages to your children, spouse, or legacy heirs today. If your dead man's switch misses a check-in, we verify your status and securely release your final thoughts.
            </p>
            <div className="hero-ctas">
              {user ? (
                <button className="primary-btn big" onClick={() => setPage(user.is_email_verified ? "dashboard" : "verify-email")}>Go to Dashboard</button>
              ) : (
                <>
                  <button className="primary-btn big" onClick={() => setPage("register")}>Create Your Legacy Vault</button>
                  <button className="secondary-btn big" onClick={() => setPage("login")}>Access Vault</button>
                </>
              )}
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <h3>🕰️ Dead Man's Switch</h3>
                <p>Configure a schedule (e.g., every 30 days). A simple click checks you in as active and healthy.</p>
              </div>
              <div className="feature-card">
                <h3>👥 Trusted Verification</h3>
                <p>Designate trusted contacts who will be notified and asked to verify your status if you ever miss a check-in.</p>
              </div>
              <div className="feature-card">
                <h3>🔒 Encrypted Storage</h3>
                <p>Your messages remain absolutely secure, private, and unreleased until trigger conditions are strictly met.</p>
              </div>
            </div>
          </section>
        )}

        {/* Login Page */}
        {page === "login" && (
          <div className="form-card">
            <h2>Access Legacy Vault</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <div className="form-links" style={{ marginBottom: "15px", display: "flex", justifyContent: "flex-end" }}>
                <span className="text-link small-text" onClick={() => setPage("forgot-password")}>Forgot Password?</span>
              </div>
              <button type="submit" className="primary-btn block" disabled={loading}>
                {loading ? "Decrypting..." : "Unlock Vault"}
              </button>
              <p className="form-footer">
                Don't have a vault yet? <span className="text-link" onClick={() => setPage("register")}>Register here</span>
              </p>
            </form>
          </div>
        )}

        {/* Register Page */}
        {page === "register" && (
          <div className="form-card">
            <h2>Create Your Vault</h2>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required placeholder="john@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Create Vault Password</label>
                <input type="password" required placeholder="Min 8 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              </div>
              <button type="submit" className="primary-btn block" disabled={loading}>
                {loading ? "Creating..." : "Initialize Legacy Vault"}
              </button>
              <p className="form-footer">
                Already registered? <span className="text-link" onClick={() => setPage("login")}>Login here</span>
              </p>
            </form>
          </div>
        )}

        {/* Email Verification Page */}
        {page === "verify-email" && (
          <div className="form-card">
            <h2>Verify Your Email</h2>
            <p className="small-text" style={{ marginBottom: "20px", textAlign: "center" }}>
              A 6-digit verification code has been sent to <strong>{verifyEmailAddress}</strong>. Please enter it below to arm your security system.
            </p>
            
            {debugVerifyToken && (
              <div className="debug-alert" style={{ background: "#fff9e6", border: "1px solid #ffe0b2", padding: "10px", borderRadius: "4px", marginBottom: "15px", fontSize: "0.85em", color: "#b78103" }}>
                <strong>Dev Sandbox Bypass:</strong> Your verification code is: <code style={{ fontSize: "1.1em", fontWeight: "bold" }}>{debugVerifyToken}</code>
              </div>
            )}

            <form onSubmit={handleVerifyEmail}>
              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <input type="text" required placeholder="e.g. 123456" maxLength="6" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} style={{ textAlign: "center", fontSize: "1.5em", letterSpacing: "5px" }} />
              </div>
              <button type="submit" className="primary-btn block" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Activate Vault"}
              </button>
              <p className="form-footer" style={{ marginTop: "15px" }}>
                Need to change account? <span className="text-link" onClick={handleLogout}>Log Out</span>
              </p>
            </form>
          </div>
        )}

        {/* Forgot Password Page */}
        {page === "forgot-password" && (
          <div className="form-card">
            <h2>Forgot Your Password?</h2>
            <p className="small-text" style={{ marginBottom: "20px", textAlign: "center" }}>
              Enter your registered email address below. We'll send you a secure link to reset your vault access password.
            </p>

            {debugResetToken && (
              <div className="debug-alert" style={{ background: "#fff9e6", border: "1px solid #ffe0b2", padding: "12px", borderRadius: "4px", marginBottom: "15px", fontSize: "0.85em", color: "#b78103" }}>
                <strong>Dev Sandbox Link:</strong> A password reset token was generated. Click below to go directly to reset page:<br />
                <button className="secondary-btn btn-sm" style={{ marginTop: "8px", width: "100%" }} onClick={() => { setResetToken(debugResetToken); setPage("reset-password"); }}>
                  Go to Reset Password Screen
                </button>
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required placeholder="your-email@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              <button type="submit" className="primary-btn block" disabled={loading}>
                {loading ? "Processing..." : "Send Reset Link"}
              </button>
              <p className="form-footer">
                Remember your password? <span className="text-link" onClick={() => setPage("login")}>Back to login</span>
              </p>
            </form>
          </div>
        )}

        {/* Reset Password Page */}
        {page === "reset-password" && (
          <div className="form-card">
            <h2>Reset Vault Password</h2>
            <p className="small-text" style={{ marginBottom: "20px", textAlign: "center" }}>
              Enter a new secure password for your legacy vault below.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Reset Token</label>
                <input type="text" required placeholder="Enter token from email link" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" required placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="primary-btn block" disabled={loading}>
                {loading ? "Resetting Password..." : "Update Vault Password"}
              </button>
              <p className="form-footer">
                Want to go back? <span className="text-link" onClick={() => setPage("login")}>Cancel</span>
              </p>
            </form>
          </div>
        )}

        {/* Dashboard */}
        {page === "dashboard" && user && user.is_email_verified && (
          <div className="dashboard-grid">
            {/* Column 1: Switch / Profile */}
            <div className="dash-col shadow-card">
              <div className="status-header">
                <h2>Legacy Switch Status</h2>
                <span className="status-badge active">System Armed</span>
              </div>
              <div className="switch-status-box">
                <div className="heartbeat">💓</div>
                <h3>Status: Alive & Active</h3>
                <p className="small-text">Last check-in: {new Date(user.last_check_in).toLocaleString()}</p>
                <p className="small-text font-bold">Next Check-In Due Every: {user.check_in_interval_days} Days</p>
              </div>
              <button className="primary-btn heartbeat-btn block" onClick={handleCheckIn}>
                👋 Click to Confirm You Are Alive
              </button>
              <div className="profile-info" style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                <h4>Vault Details</h4>
                <p><strong>Owner:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Legacy Tier:</strong> <span className="tier-tag">{user.subscription_status.toUpperCase()}</span></p>
              </div>
            </div>

            {/* Column 2: Messages list */}
            <div className="dash-col main-col">
              <div className="col-header">
                <h2>Your Legacy Messages ({messages.length})</h2>
                <button className="primary-btn" onClick={() => setPage("compose")}>✍️ New Message</button>
              </div>
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't written any messages yet.</p>
                  <p className="small-text">Leave words, guidance, or letters for your loved ones.</p>
                  <button className="secondary-btn" onClick={() => setPage("compose")}>Compose Your First Letter</button>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div key={msg.id} className="message-item-card">
                      <div className="msg-meta">
                        <span className={`msg-status-badge ${msg.status}`}>{msg.status.toUpperCase()}</span>
                        <span className="msg-date">{new Date(msg.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3>{msg.subject}</h3>
                      <p className="msg-preview">{msg.content.substring(0, 150)}...</p>
                      <div className="msg-recipients-list">
                        <strong>Recipients:</strong> {msg.recipients_list || "No designated recipients"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compose Page */}
        {page === "compose" && user && user.is_email_verified && (
          <div className="compose-container shadow-card">
            <h2>Compose Legacy Letter</h2>
            <form onSubmit={handleCreateMessage}>
              <div className="form-group">
                <label>Subject / Title</label>
                <input type="text" required placeholder="e.g., To My Children - Read After My Passing" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Message Body</label>
                <textarea required placeholder="Write your thoughts, guidance, and love here. It will be stored with bank-grade security and never revealed until trigger conditions are met." rows="10" value={msgContent} onChange={(e) => setMsgContent(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Message Status</label>
                <select value={msgStatus} onChange={(e) => setMsgStatus(e.target.value)}>
                  <option value="draft">Draft (Stay local in vault, edit anytime)</option>
                  <option value="pending_delivery">Queue for Delivery (Deliver when switch triggers)</option>
                </select>
              </div>

              {/* Recipients management */}
              <div className="recipients-section">
                <h3>Message Recipients</h3>
                <p className="small-text">Designate who should receive this message when delivered.</p>
                
                {recipients.map((rec, idx) => (
                  <div key={idx} className="recipient-row">
                    <input type="text" required placeholder="Recipient's Name" value={rec.name} onChange={(e) => handleRecipientChange(idx, "name", e.target.value)} />
                    <input type="email" required placeholder="Recipient's Email" value={rec.email} onChange={(e) => handleRecipientChange(idx, "email", e.target.value)} />
                    <button type="button" className="remove-btn" onClick={() => handleRemoveRecipient(idx)} disabled={recipients.length === 1}>❌</button>
                  </div>
                ))}
                
                <button type="button" className="secondary-btn btn-sm" onClick={handleAddRecipient}>
                  ➕ Add Recipient
                </button>
              </div>

              <div className="compose-actions">
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Storing Letter..." : "Save Letter to Vault"}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setPage("dashboard")}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Trusted Contacts Page */}
        {page === "contacts" && user && user.is_email_verified && (
          <div className="contacts-container">
            <div className="contacts-grid">
              <div className="contacts-list-section shadow-card">
                <h2>Your Trusted Contacts ({contacts.length})</h2>
                <p className="small-text">
                  These designated individuals can verify your status if you miss your scheduled check-in. They cannot read your messages; they only help verify whether you are alive.
                </p>
                {contacts.length === 0 ? (
                  <div className="empty-state">
                    <p>No trusted contacts added yet.</p>
                    <p className="small-text">Please designate at least one contact to ensure reliable switch triggering.</p>
                  </div>
                ) : (
                  <div className="contacts-list">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="contact-item">
                        <div className="contact-avatar">👤</div>
                        <div className="contact-details">
                          <h4>{contact.name}</h4>
                          <p>{contact.email}</p>
                          {contact.phone && <p className="small-text">📞 {contact.phone}</p>}
                        </div>
                        <span className={`verification-badge ${contact.is_verified ? "verified" : "pending"}`}>
                          {contact.is_verified ? "Verified" : "Verification Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="add-contact-section shadow-card">
                <h2>Add Trusted Contact</h2>
                <form onSubmit={handleCreateContact}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" required placeholder="Sarah Smith" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" required placeholder="sarah@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (Optional)</label>
                    <input type="tel" placeholder="+1 (555) 019-2834" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </div>
                  <button type="submit" className="primary-btn block" disabled={loading}>
                    {loading ? "Adding..." : "Add Trusted Contact"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} AfterWords Platform. Ensuring no important words are left unsaid.</p>
        <p className="small-text">Bank-grade security. Secure legacy distribution.</p>
      </footer>
    </div>
  );
}
