import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password1: '',
    password2: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Account created for ${formData.username}! You can now log in.`);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.message) {
          setMessage(data.message);
        }
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="auth-container">
      <h1>Create Account</h1>
      <p className="subtitle">Sign up to get started with The Hive</p>

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
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          {errors.username && (
            <div className="field-error">{errors.username.join(', ')}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password1">Password</label>
          <input
            type="password"
            id="password1"
            name="password1"
            value={formData.password1}
            onChange={handleChange}
            required
          />
          {errors.password1 && (
            <div className="field-error">{errors.password1.join(', ')}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password2">Password Confirmation</label>
          <input
            type="password"
            id="password2"
            name="password2"
            value={formData.password2}
            onChange={handleChange}
            required
          />
          {errors.password2 && (
            <div className="field-error">{errors.password2.join(', ')}</div>
          )}
        </div>

        <button type="submit" className="btn">Sign Up</button>
      </form>

      <p className="auth-link">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      </div>
    </div>
  );
}

export default Register;

