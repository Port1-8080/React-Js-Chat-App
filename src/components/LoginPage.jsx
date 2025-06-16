// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import './LoginPage.css';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { googleLogin } from '../firebaseAuth';

const LoginPage = ({ onLoginSuccess, onSignupSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  const switchTab = (tab) => {
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setActiveTab(tab);
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleGoogleLogin = async () => {
    try {
      const { user, username } = await googleLogin();
      alert(`Welcome back, ${username}!`);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      onSignupSuccess(userCredential.user);
      switchTab('login');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length === 0) {
        setError('Account not found.');
      } else {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent.');
        switchTab('login');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <header>
        <div className="nav-inner container">
          <div className="logo">BOLO</div>
          <nav>
            <ul>
              <li><button onClick={() => switchTab('login')}>Login</button></li>
              <li><button onClick={() => switchTab('signup')}>Sign Up</button></li>
              <li><button onClick={() => switchTab('forgot')}>Forgot Password</button></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero container">
          <h1>Connect instantly with your friends and family</h1>
          <p>Join ChatApp, the secure and intuitive chat platform.</p>
          <button onClick={() => switchTab('login')}>Get Started</button>
        </section>

        <section className="forms">
          <nav className="form-tabs">
            <button className={activeTab === 'login' ? 'active' : ''} onClick={() => switchTab('login')}>Login</button>
            <button className={activeTab === 'signup' ? 'active' : ''} onClick={() => switchTab('signup')}>Sign Up</button>
            <button className={activeTab === 'forgot' ? 'active' : ''} onClick={() => switchTab('forgot')}>Forgot Password</button>
          </nav>

          {activeTab === 'login' && (
            <form onSubmit={handleEmailPasswordLogin}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {error && <p className="error">{error}</p>}
              <button type="submit">Login</button>
              <button type="button" className="google-login" onClick={handleGoogleLogin}>Login with Google</button>
            </form>
          )}

          {activeTab === 'signup' && (
            <form onSubmit={handleSignup}>
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {error && <p className="error">{error}</p>}
              <button type="submit">Sign Up</button>
              <button type="button" className="google-login" onClick={handleGoogleLogin}>Sign Up with Google</button>
            </form>
          )}

          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {error && <p className="error">{error}</p>}
              <button type="submit">Reset Password</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
