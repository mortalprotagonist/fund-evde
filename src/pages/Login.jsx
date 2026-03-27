import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Login failed: ' + error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-gray-50 to-gray-50 px-4">
      <div className="w-full max-w-sm transform rounded-3xl bg-white/60 p-8 text-center shadow-xl backdrop-blur-xl border border-white">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-6xl font-black text-white shadow-inner">
          ₹
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900">Fund Evde</h1>
        <p className="mb-10 text-sm font-medium text-gray-500">Track perfectly. Never forget a debt.</p>
        
        <button
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 font-bold text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95 border border-gray-100"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-6 w-6" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};
