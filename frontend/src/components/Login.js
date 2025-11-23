import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/');
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.message) {
          setMessage(data.message);
        }
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="auth-container">
      <h1>Welcome Back</h1>
      <p className="subtitle">Sign in to your account to continue</p>

      {message && (
        <div className={`message ${message.includes('error') || message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="error-message">
          <strong>Please correct the errors below:</strong>
          {errors.non_field_errors && (
            <div>{errors.non_field_errors.join(', ')}</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {errors.username && (
            <div className="field-error">{errors.username.join(', ')}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && (
            <div className="field-error">{errors.password.join(', ')}</div>
          )}
        </div>

        <button type="submit" className="btn">Sign In</button>
      </form>

      <p className="auth-link">
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
      </div>
    </div>
  );
}

export default Login;

