import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogIn, Key, Mail, UserPlus, Info } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { loginUser, registerUser, clearError } from '../store/authSlice';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    dispatch(clearError());
  }, [isRegister, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/log-interaction');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (data: any) => {
    if (isRegister) {
      dispatch(registerUser({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
        role: data.role
      })).then((res: any) => {
        if (!res.error) {
          setIsRegister(false);
          reset();
        }
      });
    } else {
      dispatch(loginUser({
        email: data.email,
        password: data.password
      }));
    }
  };

  const loadDemoCredentials = () => {
    reset({
      email: 'rep@aivoa.com',
      password: 'password123'
    });
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 px-4">
      {/* Decorative Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35"></div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-800/40 backdrop-blur-md relative z-10">
        
        {/* Left Side: Branding / Intro */}
        <div className="bg-gradient-to-br from-healthcare-900 to-teal-800 p-10 flex flex-col justify-between text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
              <ShieldAlert className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl tracking-tight">Aivoa CRM</h2>
              <p className="text-[10px] text-teal-200 tracking-widest font-semibold uppercase">AI-First Interaction Hub</p>
            </div>
          </div>

          <div className="my-10 space-y-6">
            <h3 className="text-3xl font-extrabold leading-tight">
              Empowering MSLs & Reps with AI workflows
            </h3>
            <p className="text-sm text-teal-100/80 leading-relaxed font-light">
              Skip traditional form entries. Speak or type naturally about your HCP visits, and let Aivoa automatically update database tables, plan follow-ups, and review compliance in seconds.
            </p>
          </div>

          <div className="text-xs text-teal-200/60 font-semibold border-t border-white/10 pt-4 flex justify-between items-center">
            <span>© 2026 Aivoa Life Sciences</span>
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px]">v1.0.0</span>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="bg-slate-900 p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white">
              {isRegister ? 'Create Representative Account' : 'Welcome Back Rep'}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              {isRegister ? 'Sign up to register your territory details.' : 'Log in to access your dashboard.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {isRegister && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    {...register('fullName', { required: 'Full name is required' })}
                    placeholder="Alex Representative"
                    className="w-full bg-slate-950/80 border border-slate-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-healthcare-500 text-white placeholder-slate-600"
                  />
                  {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName.message as string}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Territory Role</label>
                  <select
                    {...register('role')}
                    className="w-full bg-slate-950/80 border border-slate-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-healthcare-500 text-white"
                  >
                    <option value="Representative">Sales Representative</option>
                    <option value="MSL">Medical Science Liaison (MSL)</option>
                    <option value="Manager">Territory Manager</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email structure' }
                  })}
                  placeholder="rep@aivoa.com"
                  className="w-full bg-slate-950/80 border border-slate-800 text-xs pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-healthcare-500 text-white placeholder-slate-600"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message as string}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Security Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 text-xs pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-healthcare-500 text-white placeholder-slate-600"
                />
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message as string}</p>}
            </div>

            {/* Backend error banners */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-healthcare-600 hover:bg-healthcare-700 disabled:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-lg shadow-healthcare-600/10 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span>Processing...</span>
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In Secured</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle register option */}
          <div className="mt-6 text-center text-xs text-slate-400 font-medium">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button onClick={() => setIsRegister(false)} className="text-healthcare-400 hover:underline font-bold">
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                First time registering?{' '}
                <button onClick={() => setIsRegister(true)} className="text-healthcare-400 hover:underline font-bold">
                  Create Account
                </button>
              </p>
            )}
          </div>

          {/* Sandbox Auto-Demo button */}
          {!isRegister && (
            <div className="mt-6 border-t border-slate-800/60 pt-4 text-center">
              <button
                onClick={loadDemoCredentials}
                className="text-[10px] text-teal-400 hover:text-teal-300 font-bold bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-lg transition-all hover:bg-teal-500/20"
              >
                Load Demo Credentials (rep@aivoa.com)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
