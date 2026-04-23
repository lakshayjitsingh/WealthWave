import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let res;
    if (isLogin) {
      res = await login(email, password);
    } else {
      res = await register(name, email, password);
    }

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="layout-container" style={{ 
      position: 'relative', 
      display: 'flex', 
      height: '100vh', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '2rem', 
      flexWrap: 'nowrap',
      padding: '1rem 4rem',
      overflow: 'hidden'
    }}>
      
      <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', zIndex: 10 }}>
        <ThemeToggle />
      </div>
      
      {/* Left Side: Branding and App Mockup */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left', height: '100%' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ 
            fontSize: '3.2rem', 
            margin: '0', 
            background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            fontWeight: '900',
            letterSpacing: '-2px'
          }}>
            WealthWave
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '0.1rem' }}>
            Your personal financial co-pilot.
          </p>
        </div>

        {/* Windows Download Link - Hidden inside Electron */}
        {!window.navigator.userAgent.includes('Electron') && (
          <div style={{ marginBottom: '2.5rem' }}>
            <a href="/WealthWave.exe" download style={{ textDecoration: 'none' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', 
                color: '#fff', 
                padding: '1rem 2rem', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.2rem',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                transition: 'all 0.3s ease'
              }} onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';
              }} onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
              }}>
                <div style={{ fontSize: '2rem' }}>🪟</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', opacity: '0.8', fontWeight: '700' }}>GET THE APP</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>WealthWave for Windows</div>
                </div>
              </div>
            </a>
          </div>
        )}

        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: '700', lineHeight: '1.1', color: 'var(--text-primary)' }}>
          Master your money <br/>
          <span style={{ color: 'var(--accent-secondary)' }}>anywhere, anytime.</span>
        </h2>

        {/* The App Mockup - PURE CSS GLASS DESIGN */}
        <div style={{ 
          width: '100%', 
          maxWidth: '400px', 
          height: '240px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          padding: '1.5rem',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}>
          {/* Mockup Header */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></div>
          </div>
          
          {/* Mockup Content - Charts/Cards */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, height: '80px', background: 'linear-gradient(to bottom, var(--accent-primary), transparent)', opacity: 0.2, borderRadius: '12px' }}></div>
            <div style={{ flex: 1.5, height: '80px', background: 'linear-gradient(to bottom, var(--accent-secondary), transparent)', opacity: 0.2, borderRadius: '12px' }}></div>
          </div>
          
          <div style={{ marginTop: '1rem', height: '40px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}></div>
          <div style={{ marginTop: '0.8rem', height: '20px', width: '60%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>

          {/* Glowing Orb */}
          <div style={{ 
            position: 'absolute', 
            bottom: '-20px', 
            right: '-20px', 
            width: '150px', 
            height: '150px', 
            background: 'var(--accent-primary)', 
            filter: 'blur(60px)', 
            opacity: 0.15,
            zIndex: -1
          }}></div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div style={{ flex: 0.7, minWidth: '320px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '2rem 2rem',
          borderRadius: '24px',
          border: '2px solid var(--glass-border)',
          background: 'var(--card-bg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.6rem', fontWeight: '700' }}>
            {isLogin ? 'Welcome Back' : 'Join the Wave'}
          </h2>
          
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem', borderRadius: '10px' }}>{error}</div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLogin && (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  style={{ background: 'var(--input-bg)', border: '1.5px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                />
              </div>
            )}
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', borderRadius: '12px', transition: 'transform 0.2s', cursor: 'pointer' }}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            <span style={{ margin: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          </div>
 
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isLogin ? "New to WealthWave? " : "Already on the Wave? "}
            <span 
              style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '700' }} 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Start for free' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
