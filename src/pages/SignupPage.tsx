import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, CheckCircle, FileText, Brain, Shield, Mail, Lock, User } from 'lucide-react';

interface SignupPageProps {
  onNavigateLogin: () => void;
}

export default function SignupPage({ onNavigateLogin }: SignupPageProps) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try { await signup(form.fullName, form.email, form.password); }
    catch (err: any) { setApiError(err.message || 'Signup failed.'); }
    finally { setLoading(false); }
  };

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const score = getStrength(form.password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const strengthColors = ['', 'hsl(0 72% 55%)', 'hsl(38 92% 55%)', 'hsl(210 80% 55%)', 'hsl(152 60% 42%)', 'hsl(152 70% 35%)'];

  const features = [
    { icon: CheckCircle, text: 'Free to get started' },
    { icon: FileText, text: 'Upload any PDF lecture' },
    { icon: Brain, text: 'AI extracts what matters' },
    { icon: Shield, text: 'Your data stays private' },
  ];

  const fieldClass = (name: string) =>
    `w-full pl-10 pr-4 py-3 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 ${errors[name] ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'hsl(263 70% 50% / 0.15)' }} />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'hsl(217 91% 60% / 0.1)' }} />
        </div>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-primary-foreground mb-4 leading-tight">
            AI Teaching<br />Assistant
          </h1>
          <p className="text-primary-foreground/60 text-lg mb-10 leading-relaxed">
            Join thousands of students studying smarter with AI-powered lecture tools.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-primary-foreground/70">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">AI Teaching Assistant</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">Create your account</h2>
          <p className="text-muted-foreground mb-8">Get started — it only takes a minute</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Jane Smith"
                  value={form.fullName} onChange={handleChange} disabled={loading} className={fieldClass('fullName')} />
              </div>
              {errors.fullName && <span className="text-xs text-destructive">{errors.fullName}</span>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
                  value={form.email} onChange={handleChange} disabled={loading} className={fieldClass('email')} />
              </div>
              {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Min. 8 characters"
                  value={form.password} onChange={handleChange} disabled={loading} className={fieldClass('password')} />
              </div>
              {errors.password && <span className="text-xs text-destructive">{errors.password}</span>}
              {form.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="strength-bars flex-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="strength-bar" style={{ background: i <= score ? strengthColors[score] : undefined }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColors[score] }}>{strengthLabels[score]}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-foreground">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" placeholder="Repeat your password"
                  value={form.confirm} onChange={handleChange} disabled={loading} className={fieldClass('confirm')} />
              </div>
              {errors.confirm && <span className="text-xs text-destructive">{errors.confirm}</span>}
            </div>

            {apiError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <span>⚠️</span> {apiError}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-primary-foreground transition-all disabled:opacity-50 hover:shadow-lg"
              style={{ background: loading ? 'hsl(var(--primary) / 0.7)' : 'var(--gradient-brand)' }}>
              {loading ? <><span className="btn-spinner" /> Creating account…</> : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{' '}
            <button onClick={onNavigateLogin} className="text-primary font-semibold hover:underline">Sign in</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
