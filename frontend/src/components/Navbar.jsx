import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { AuthContext } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ThemeToggle />
        <Link to="/" className="nav-brand" style={{
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '1.75rem',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))'
        }}>WealthWave</Link>
      </div>
      <div className="nav-links">
        {user ? (
          <>
            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ padding: '6px 12px' }}>Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
