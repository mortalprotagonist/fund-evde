import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message.replace("Firebase: ", ""));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-gray-50 to-gray-50 px-4">
      <div className="w-full max-w-sm transform rounded-3xl bg-white/60 p-8 text-center shadow-xl backdrop-blur-xl border border-white">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-6xl font-black text-white shadow-inner">
          ₹
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900">Fund Evde</h1>
        <p className="mb-8 text-sm font-medium text-gray-500">Track perfectly. Never forget a debt.</p>
        
        <form onSubmit={handleSubmit} className="text-left space-y-4">
          {error && <div className="text-sm font-bold text-rose-500 text-center bg-rose-50 rounded-xl py-3 px-3">{error}</div>}
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1 px-1">Email Base</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" 
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1 px-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" 
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 border border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In securely' : 'Create Account')}
          </button>
        </form>

        <p className="mt-8 text-sm text-gray-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="font-bold text-indigo-600 hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
};
