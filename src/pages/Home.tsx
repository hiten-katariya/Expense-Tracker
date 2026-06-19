import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Wallet,
  Activity,
  Users,
  Target,
  PieChart,
  Bell,
  FileText,
  ScanLine,
  AlertTriangle,
  Mail,
  MapPin,
  Phone,
  Linkedin,
  Github,
  Menu,
  X,
  ChevronRight,
  Play,
  Check,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/authStore';


// Dynamic Counter Component for Statistics
function Counter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = value;
    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.min(Math.ceil(totalMiliseconds / end), 50);
    const step = end / (totalMiliseconds / incrementTime);

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className="font-extrabold tracking-tight">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function HomePage() {
  const { user, signOut } = useAuthStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'analytics' | 'budget' | 'family'>('desktop');
  const [demoOpen, setDemoOpen] = useState(false);

  // Scroll ref and transforms for frame-by-frame text narrative progression
  const globalScrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress: globalProgress } = useScroll({
    target: globalScrollRef,
    offset: ['start start', 'end end'],
  });

  const heroOpacity = useTransform(globalProgress, [0.0, 0.12], [1, 0]);
  const heroY = useTransform(globalProgress, [0.0, 0.12], [0, -40]);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  // Nav items based on state
  const loggedOutNav = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ];

  const loggedInNav = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Expenses', to: '/expenses' },
    { label: 'Budgets', to: '/budgets' },
    { label: 'Reports', to: '/reports' },
    { label: 'Family', to: '/family' },
    { label: 'Settings', to: '/settings' },
  ];

  // Alternating About sections lists
  const aboutItems = [
    {
      title: 'Expense Tracking',
      description: 'Record every purchase inside an elegant high-contrast interface. Sort by accounts, verify merchant structures, and group records with rich meta-tags.',
      badge: 'Real-time Logs',
      icon: Wallet,
      color: 'from-indigo-500 to-purple-600',
      stat: '99.9% Instant Sync'
    },
    {
      title: 'Budget Planning',
      description: 'Assign dynamic boundaries to specific categories. Receive warnings on your screen before crossing thresholds, protecting family financial goals.',
      badge: 'Visual Safeguards',
      icon: Target,
      color: 'from-cyan-500 to-blue-600',
      stat: '15% Average Monthly Savings'
    },
    {
      title: 'Family Expense Management',
      description: 'Invite family members to join a shared wallet ecosystem. Delegate spending caps to children and review combined logs in a synchronized profile feed.',
      badge: 'Collaborative Wallets',
      icon: Users,
      color: 'from-pink-500 to-rose-600',
      stat: 'Up to 5 Synchronized Members'
    },
    {
      title: 'AI Powered Categorization',
      description: 'Let machine learning match standard transactions to target categories automatically. Smart tagging improves over time based on your edits.',
      badge: 'Intelligent Matching',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      stat: '98% Tagging Accuracy'
    },
    {
      title: 'Reports & Analytics',
      description: 'Unlock structured breakdowns of month-over-month trends. Inspect interactive spending charts and export reports with single-click configurations.',
      badge: 'SaaS Audits',
      icon: PieChart,
      color: 'from-teal-500 to-emerald-600',
      stat: 'PDF & CSV Exporting Enabled'
    }
  ];

  // Features list
  const featuresList = [
    {
      title: 'Smart Expense Tracking',
      desc: 'Seamlessly capture currency outflows with absolute precision.',
      icon: Wallet,
      gradient: 'from-indigo-500/20 to-purple-500/10'
    },
    {
      title: 'AI Categorization',
      desc: 'Smart algorithms match vendors and tag purchases on autopilot.',
      icon: Sparkles,
      gradient: 'from-purple-500/20 to-pink-500/10'
    },
    {
      title: 'OCR Receipt Scanner',
      desc: 'Take photos of invoice receipts and let AI extract cost numbers.',
      icon: ScanLine,
      gradient: 'from-cyan-500/20 to-blue-500/10'
    },
    {
      title: 'Budget Alerts',
      desc: 'Receive alerts when you approach monthly spending margins.',
      icon: AlertTriangle,
      gradient: 'from-amber-500/20 to-orange-500/10'
    },
    {
      title: 'Family Accounts',
      desc: 'Co-manage combined household budgets under a single group.',
      icon: Users,
      gradient: 'from-pink-500/20 to-rose-500/10'
    },
    {
      title: 'Analytics Dashboard',
      desc: 'Trace spending metrics and financial indices with responsive graphs.',
      icon: PieChart,
      gradient: 'from-teal-500/20 to-emerald-500/10'
    },
    {
      title: 'Export Reports',
      desc: 'Generate audited accounting reports optimized for tax filing.',
      icon: FileText,
      gradient: 'from-blue-500/20 to-indigo-500/10'
    },
    {
      title: 'Notifications',
      desc: 'Immediate system alerts about updates, budgets, and family cards.',
      icon: Bell,
      gradient: 'from-indigo-500/20 to-cyan-500/10'
    }
  ];

  return (
    <div
      id="home"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
      className="min-h-screen bg-bg-dark text-slate-100 relative overflow-hidden flex flex-col font-sans scroll-smooth"
    >
      {/* 1. Immersive Awwwards-style Backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-[0.12]" />
        
        {/* Decorative Blurred Blobs */}
        <div className="absolute -top-[10%] -left-[10%] h-[700px] w-[700px] rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 opacity-[0.22] blur-[130px] blob-animate-1" />
        <div className="absolute bottom-[20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-[#06B6D4] to-primary-600 opacity-[0.16] blur-[140px] blob-animate-2" />
        <div className="absolute top-[40%] left-[25%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-accent-pink to-primary-600 opacity-[0.12] blur-[120px] blob-animate-3" />
        
        {/* Star Particle Matrix */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20 pointer-events-none"
            style={{
              width: Math.random() * 3 + 1.5,
              height: Math.random() * 3 + 1.5,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * -50 - 25, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.15, 0.75, 0.15],
            }}
            transition={{
              duration: Math.random() * 10 + 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Cursor Reactive Spotlight */}
      {isMouseOver && (
        <div
          className="absolute pointer-events-none rounded-full w-[500px] h-[500px] radial-glow-1 blur-[110px] opacity-[0.25] z-0 transition-opacity duration-300"
          style={{
            left: mousePos.x - 250,
            top: mousePos.y - 250,
          }}
        />
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full h-20 flex items-center justify-between px-6 sm:px-8 lg:px-12 border-b border-white/5 bg-bg-dark/60 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] w-full flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-500 via-primary-600 to-secondary-500 p-[1.5px] shadow-[0_0_15px_rgba(99,102,241,0.35)]">
              <div className="h-full w-full rounded-[10px] bg-bg-card flex items-center justify-center text-white font-extrabold text-sm border border-black/10">
                ET
              </div>
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
              Expense Tracker
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {/* If NOT logged in, show marketing links */}
            {!user ? (
              <>
                {loggedOutNav.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-sm font-semibold text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="h-5 w-px bg-white/10" />
                <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                  Log In
                </Link>
                <Link to="/register">
                  <Button size="sm" className="shadow-[0_0_15px_rgba(124,58,237,0.25)] border border-primary-500/20 bg-gradient-to-r from-primary-500 to-primary-600">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              // If logged in, show app internal navigation links
              <>
                {loggedInNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="text-sm font-semibold text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="h-5 w-px bg-white/10" />
                <button
                  onClick={() => signOut()}
                  className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Log Out
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu trigger */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed top-20 left-0 right-0 bg-bg-deep/95 border-b border-white/5 z-40 p-6 backdrop-blur-xl flex flex-col gap-5 shadow-2xl"
          >
            {!user ? (
              <>
                {loggedOutNav.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-semibold text-slate-300 hover:text-white py-1 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="h-[1px] bg-white/5 w-full my-1" />
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-slate-300 hover:text-white py-1"
                >
                  Log In
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center">Sign Up</Button>
                </Link>
              </>
            ) : (
              <>
                {loggedInNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-semibold text-slate-300 hover:text-white py-1 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="h-[1px] bg-white/5 w-full my-1" />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="text-left text-base font-semibold text-red-400 hover:text-red-300 py-1"
                >
                  Log Out
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Scroll Container for Sticky Canvas & Sections */}
      <div ref={globalScrollRef} className="relative w-full">


        {/* Narrative & Marketing Content */}
        <div className="relative z-10">
          
          {/* Hero Section */}
          <section className="min-h-screen w-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-2 items-center relative bg-transparent">
            <motion.div 
              style={{ opacity: heroOpacity, y: heroY }} 
              className="space-y-8 max-w-xl pointer-events-auto select-text py-20"
            >
              <div className="inline-flex">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-600/35 bg-primary-600/10 px-4 py-2 text-xs font-semibold text-primary-300 backdrop-blur shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                  <Sparkles className="h-3.5 w-3.5 text-secondary-500 animate-pulse" />
                  <span>AI-Powered Expense Management</span>
                </div>
              </div>

              <div className="space-y-5">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.1] font-sans">
                  Take Control of{' '}
                  <span className="shimmer-text bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent block mt-1">
                    Every Rupee.
                  </span>
                  <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-secondary-500 bg-clip-text text-transparent block mt-1">
                    Smarter Expense Tracking
                  </span>{' '}
                  for Individuals and Families.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                  Consolidate your transaction records, coordinate family spending, and visualize automated insights under a sleek, glassmorphic SaaS interface.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full justify-center group shadow-[0_0_25px_rgba(124,58,237,0.3)] border border-primary-500/25 bg-gradient-to-r from-primary-500 to-primary-600"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 cursor-pointer shadow-md"
                >
                  <Play className="h-4.5 w-4.5 text-secondary-500 fill-secondary-500" />
                  Watch Demo
                </button>
              </div>

              {/* High level features check */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'Zero Data Leaks', desc: 'Secure local & cloud encryption' },
                  { title: 'Shared Wallets', desc: 'Sync spendings with spouses' },
                  { title: 'AI Automation', desc: 'Tag purchases instantly' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-left backdrop-blur hover:border-white/10 transition-colors duration-300"
                  >
                    <CheckCircle2 className="mb-2 h-5 w-5 text-secondary-500" />
                    <p className="font-semibold text-sm text-white">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <div className="hidden md:block" />
          </section>

          {/* INTERACTIVE HUB MOCKUP SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-[1fr_1fr] items-center">
              <div className="space-y-6">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary-400">Interactive Hub</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
                  Trace Your Ledger with Live Visual Mockups
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Verify how transaction records immediately adjust category budgets, trigger warnings, and maintain synchronization coordinates across active family groups in real-time.
                </p>
                <div className="grid gap-3.5 text-slate-300 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-400" />
                    <span>Real-time balance feeds and income sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-400" />
                    <span>Live category budget status warning indicators</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                {/* Live Interactive Wallet Mockup */}
                <div className="w-full max-w-[420px] glass-card border border-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group select-none">
                  {/* Card top gradient indicator */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-pink" />

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="text-[10px] text-slate-500 tracking-wider uppercase font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Preview
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-extrabold text-white">₹78,430.00</span>
                        <span className="text-xs text-emerald-400 font-semibold flex items-center">↑ 12%</span>
                      </div>
                    </div>

                    {/* Progress Ring / Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Monthly Budget (Food & Dining)</span>
                        <span className="text-slate-200">₹8,400 / ₹12,000</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                          initial={{ width: 0 }}
                          whileInView={{ width: '70%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, delay: 0.2 }}
                        />
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Recent Items Mockup */}
                    <div className="space-y-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transactions Feed</span>
                      
                      {[
                        { label: 'Weekly Groceries', amount: '-₹4,230.00', time: 'Just now', icon: Wallet, tag: 'Groceries' },
                        { label: 'SaaS Cloud Hosting', amount: '-₹1,640.00', time: '2 hours ago', icon: FileText, tag: 'Bills' },
                        { label: 'Salary Credit', amount: '+₹90,000.00', time: 'Yesterday', icon: TrendingUp, tag: 'Income', isIncome: true }
                      ].map((tx, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors duration-200">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${tx.isIncome ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-white/5 border-white/5 text-primary-400'}`}>
                            <tx.icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-grow">
                            <span className="text-xs font-semibold text-white block">{tx.label}</span>
                            <span className="text-[9px] text-slate-500 uppercase font-semibold">{tx.tag}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${tx.isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {tx.amount}
                            </span>
                            <span className="text-[9px] text-slate-500 block">{tx.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ABOUT / STORYTELLING SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent" id="about">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-secondary-500">How It Works</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  A Premium Ecosystem Engineered for Financial Health
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Unlock a modern storytelling experience mapping cash tracking, budget parameters, and household logs into unified workflows.
                </p>
              </div>

              <div className="space-y-32">
                {aboutItems.map((item, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <div
                      key={item.title}
                      className="grid gap-12 lg:grid-cols-2 items-center"
                    >
                      {/* Left Column (Alternating placement) */}
                      <motion.div
                        initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8 }}
                        className={isEven ? 'lg:order-1' : 'lg:order-2'}
                      >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 mb-4">
                          {item.badge}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
                          {item.title}
                        </h3>
                        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                          {item.description}
                        </p>
                        <div className="h-[1px] bg-white/10 w-full mb-6" />
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                            <Check className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-300">{item.stat}</span>
                        </div>
                      </motion.div>

                      {/* Right Column: Visual Component */}
                      <motion.div
                        initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8 }}
                        className={isEven ? 'lg:order-2 flex justify-center' : 'lg:order-1 flex justify-center'}
                      >
                        <div className="w-full max-w-[460px] p-6 rounded-3xl bg-bg-card/30 border border-white/5 relative overflow-hidden shadow-xl select-none group">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full bg-primary-500/10 blur-[80px] pointer-events-none" />
                          
                          {/* Alternating Mockup Designs */}
                          {index === 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                    <Wallet className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-white block">Starbucks Premium</span>
                                    <span className="text-[9px] text-slate-500 block uppercase font-semibold">Coffee Shop</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-slate-300">-₹380.00</span>
                              </div>
                              <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                                    <Activity className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-white block">Fitness Gym Membership</span>
                                    <span className="text-[9px] text-slate-500 block uppercase font-semibold">Health & Gym</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-slate-300">-₹2,500.00</span>
                              </div>
                            </div>
                          )}

                          {index === 1 && (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                              <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>Entertainment Limit</span>
                                <span className="text-red-400">85% exceeded</span>
                              </div>
                              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full" style={{ width: '85%' }} />
                              </div>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Alert generated automatically. You have exceeded your weekly budget by ₹1,400.
                              </p>
                            </div>
                          )}

                          {index === 2 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <div className="h-10 w-10 rounded-full bg-primary-500/20 flex items-center justify-center text-white font-extrabold text-sm border border-primary-500/30">
                                  A
                                </div>
                                <div className="flex-grow">
                                  <span className="text-xs font-bold text-white block">Aditi (Spouse)</span>
                                  <span className="text-[9px] text-slate-400 block">Spent ₹14,320 this month</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/10">Active</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <div className="h-10 w-10 rounded-full bg-secondary-500/20 flex items-center justify-center text-white font-extrabold text-sm border border-secondary-500/30">
                                  K
                                </div>
                                <div className="flex-grow">
                                  <span className="text-xs font-bold text-white block">Kabir (Child)</span>
                                  <span className="text-[9px] text-slate-400 block">Spent ₹1,800 this month</span>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-400/10">Child Cap</span>
                              </div>
                            </div>
                          )}

                          {index === 3 && (
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3.5 items-start">
                              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-white block">AI Recommendation</span>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                  We noticed subscription spendings rose by 18% this month. Canceling inactive accounts could recover up to **₹800/month**.
                                </p>
                              </div>
                            </div>
                          )}

                          {index === 4 && (
                            <div className="flex flex-col items-center py-4 space-y-4">
                              <div className="flex gap-2">
                                <div className="h-2.5 w-10 rounded-full bg-primary-500/30" />
                                <div className="h-2.5 w-16 rounded-full bg-secondary-500/40" />
                                <div className="h-2.5 w-12 rounded-full bg-white/10" />
                              </div>
                              <div className="h-24 w-full flex items-end justify-around border-b border-white/10 px-6">
                                <div className="w-6 bg-primary-500/40 hover:bg-primary-500 rounded-t-lg transition-all" style={{ height: '40%' }} />
                                <div className="w-6 bg-secondary-500/40 hover:bg-secondary-500 rounded-t-lg transition-all" style={{ height: '70%' }} />
                                <div className="w-6 bg-accent-pink/40 hover:bg-accent-pink rounded-t-lg transition-all" style={{ height: '55%' }} />
                                <div className="w-6 bg-primary-600/40 hover:bg-primary-600 rounded-t-lg transition-all" style={{ height: '90%' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* FEATURES SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent" id="features">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary-400">Core Features</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Enterprise Grade Finance. Designed for Living.
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Explore custom card systems with gradient glows, interactive states, and micro-hover lifts.
                </p>
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {featuresList.map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -6, scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4 }}
                    className="glass-card border border-white/5 hover:border-white/20 p-6 relative overflow-hidden group shadow-lg flex flex-col justify-between"
                  >
                    {/* Glowing backdrop shadow */}
                    <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-tr ${item.gradient} blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />
                    
                    <div>
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary-500/40 group-hover:text-primary-400 transition-all duration-300 flex items-center justify-center text-slate-400 mb-6">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight group-hover:text-primary-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-600 group-hover:text-primary-400 transition-colors">
                      <span>Learn more</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* STATISTICS SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="grid gap-10 grid-cols-2 lg:grid-cols-4 text-center">
                {[
                  { value: 1284000, suffix: '+', title: 'Total Transactions', desc: 'Logged and cataloged securely' },
                  { value: 50280, suffix: '+', title: 'Active Users', desc: 'Syncing wallets globally' },
                  { value: 450000000, suffix: '+', title: 'Expenses Tracked', desc: 'Saved and structured' },
                  { value: 12500, suffix: '+', title: 'Families Managed', desc: 'Collaborating securely' },
                ].map((stat, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                      <Counter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">{stat.title}</h4>
                    <p className="text-[10px] sm:text-xs text-slate-500">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* INTERACTIVE SCREENSHOTS SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent" id="pricing">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-secondary-500">Platform Preview</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  A Complete Suite. Everywhere You Work.
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Explore dynamic interactive screens designed cleanly in pure CSS layouts, optimized for all screens.
                </p>
              </div>

              {/* Interactive Navigation Tabs */}
              <div className="flex flex-wrap justify-center gap-2 mb-10 select-none">
                {[
                  { id: 'desktop', label: 'Desktop Dashboard' },
                  { id: 'mobile', label: 'Mobile App View' },
                  { id: 'analytics', label: 'Analytics Page' },
                  { id: 'budget', label: 'Budget Management' },
                  { id: 'family', label: 'Family Dashboard' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary-500/10 to-primary-600/5 border-primary-500/35 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'border-white/5 bg-white/[0.01] text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Preview Tab Container */}
              <div className="w-full max-w-5xl mx-auto rounded-2xl bg-bg-card/30 border border-white/10 p-6 shadow-2xl min-h-[400px] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary-500/5 blur-[90px] pointer-events-none" />

                <AnimatePresence mode="wait">
                  {activeTab === 'desktop' && (
                    <motion.div
                      key="desktop"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <div className="grid gap-6 sm:grid-cols-3">
                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Expenses</span>
                            <TrendingUp className="h-4.5 w-4.5 text-red-400" />
                          </div>
                          <span className="text-xl font-extrabold text-white">₹24,300.50</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Budgets</span>
                            <Target className="h-4.5 w-4.5 text-cyan-400" />
                          </div>
                          <span className="text-xl font-extrabold text-white">4 Categories</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Family Accounts</span>
                            <Users className="h-4.5 w-4.5 text-pink-400" />
                          </div>
                          <span className="text-xl font-extrabold text-white">3 Sync Groups</span>
                        </div>
                      </div>
                      <div className="h-48 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="flex gap-2 mb-4">
                          <div className="h-2 w-10 bg-primary-500 rounded-full" />
                          <div className="h-2 w-16 bg-secondary-500 rounded-full" />
                          <div className="h-2 w-6 bg-white/15 rounded-full" />
                        </div>
                        <span className="text-xs text-slate-400 font-semibold tracking-wide">Main Dashboard Layout Loaded</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'mobile' && (
                    <motion.div
                      key="mobile"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="flex justify-center"
                    >
                      {/* Phone shell container */}
                      <div className="w-64 border-4 border-white/10 rounded-[32px] bg-bg-deep p-4 relative shadow-2xl">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-white/10 rounded-full" />
                        <div className="pt-6 space-y-4">
                          <div className="text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold">Weekly Spend</span>
                            <h4 className="text-lg font-black text-white">₹5,400.00</h4>
                          </div>
                          <div className="h-[1px] bg-white/5" />
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] text-slate-300 font-bold bg-white/5 p-2 rounded-lg">
                              <span>Starbucks</span>
                              <span className="text-white">-₹320.00</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-300 font-bold bg-white/5 p-2 rounded-lg">
                              <span>Uber Taxi</span>
                              <span className="text-white">-₹180.00</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'analytics' && (
                    <motion.div
                      key="analytics"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="h-56 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-end p-6 select-none">
                        <div className="flex items-end justify-between h-40 max-w-lg mx-auto w-full border-b border-white/5 pb-2">
                          <div className="w-10 bg-gradient-to-t from-primary-500 to-indigo-600 hover:scale-105 transition-transform rounded-t" style={{ height: '65%' }} />
                          <div className="w-10 bg-gradient-to-t from-secondary-500 to-cyan-600 hover:scale-105 transition-transform rounded-t" style={{ height: '45%' }} />
                          <div className="w-10 bg-gradient-to-t from-primary-500 to-indigo-600 hover:scale-105 transition-transform rounded-t" style={{ height: '80%' }} />
                          <div className="w-10 bg-gradient-to-t from-accent-pink to-pink-600 hover:scale-105 transition-transform rounded-t" style={{ height: '95%' }} />
                        </div>
                        <div className="flex justify-between max-w-lg mx-auto w-full text-[9px] text-slate-500 uppercase font-bold mt-2.5">
                          <span>Week 1</span>
                          <span>Week 2</span>
                          <span>Week 3</span>
                          <span>Week 4</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'budget' && (
                    <motion.div
                      key="budget"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-5"
                    >
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3.5 max-w-md mx-auto">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">Food & Beverages</span>
                          <span className="text-slate-400">₹4,200 / ₹6,000</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: '70%' }} />
                        </div>
                        
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">Office Rent</span>
                          <span className="text-slate-400">₹15,000 / ₹15,000</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                        </div>

                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">Cab & Transport</span>
                          <span className="text-slate-400">₹2,800 / ₹2,000</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'family' && (
                    <motion.div
                      key="family"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 max-w-md mx-auto"
                    >
                      <div className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-500 flex items-center justify-center font-extrabold text-white text-xs border border-primary-500/20">
                            HK
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Hiten (Owner)</span>
                            <span className="text-[10px] text-slate-400 block">Spent ₹18,400.00</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">₹20,000 Cap</span>
                      </div>

                      <div className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary-500 flex items-center justify-center font-extrabold text-white text-xs border border-secondary-500/20">
                            AK
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Aishwarya (Spouse)</span>
                            <span className="text-[10px] text-slate-400 block">Spent ₹4,230.00</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">₹15,000 Cap</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* TESTIMONIALS SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-accent-pink">Reviews</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Endorsed by Independent Families
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Check out genuine testimonials detailing how tracking and AI classification saved monthly funds.
                </p>
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { text: "This application changed the way we manage our child caps. Setting up limits and seeing the dynamic graphs saved us nearly ₹12,000 in just two months.", author: "Rohan Mehra", role: "Product Manager, Bangalore" },
                  { text: "The OCR receipt scanning tool and automatic category match works with high-level accuracy. We no longer write expenses manually.", author: "Neha Gupta", role: "Freelance Designer, Pune" },
                  { text: "Perfect dashboard flow and secure Supabase integration. Highly recommended for couples seeking to synchronize their accounts.", author: "Arjun Verma", role: "DevOps Engineer, Noida" }
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-bg-card/40 border border-white/5 hover:border-white/15 transition-all shadow-md relative group flex flex-col justify-between"
                  >
                    <div className="absolute top-4 right-6 text-primary-400/20 text-5xl font-serif select-none">“</div>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 italic relative z-10">
                      {card.text}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white font-extrabold text-xs">
                        {card.author.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{card.author}</span>
                        <span className="text-[10px] text-slate-500 block">{card.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FOUNDER / OWNER INFORMATION SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full flex flex-col items-center">
              <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary-400">Founder Profile</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Meet the Architect
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Designed and developed with a vision to streamline household finances and personal auditing.
                </p>
              </div>

              {/* Premium Profile Card */}
              <motion.div
                whileHover={{ y: -4 }}
                className="w-full max-w-2xl bg-gradient-to-r from-bg-card/70 to-bg-deep/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row gap-8 items-center"
              >
                {/* Glowing corner background decoration */}
                <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-secondary-500/10 blur-3xl pointer-events-none" />
                
                {/* Founder Avatar Placeholder */}
                <div className="h-32 w-32 rounded-2xl bg-gradient-to-tr from-primary-500 to-secondary-500 p-[2.5px] shadow-lg flex-shrink-0 relative overflow-hidden group/avatar select-none">
                  <div className="h-full w-full rounded-[14px] bg-bg-card flex flex-col items-center justify-center border border-black/10">
                    <span className="text-3xl font-black text-white">HK</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Founder</span>
                  </div>
                </div>

                <div className="flex-grow space-y-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Hiten Katariya</h3>
                    <p className="text-xs text-primary-400 font-bold tracking-wider uppercase mt-1">Founder & Lead Software Architect</p>
                  </div>

                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    Hiten is a Senior Product Designer and Software Engineer with a passion for designing visual animations, database security, and high-performance Web apps.
                  </p>

                  {/* Coordinates List */}
                  <div className="grid gap-2.5 sm:grid-cols-2 text-left">
                    <div className="flex items-center gap-2 text-slate-300 text-xs">
                      <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span>hiten@expensetracker.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-xs">
                      <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span>+91 98765 43210</span>
                    </div>
                  </div>

                  {/* Founder Social Links */}
                  <div className="flex justify-center sm:justify-start gap-4 pt-2">
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      <Linkedin className="h-4.5 w-4.5" />
                    </a>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      <Github className="h-4.5 w-4.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* CONTACT SECTION */}
          <section className="relative z-10 py-24 border-t border-white/5 bg-transparent" id="contact">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="grid gap-16 lg:grid-cols-2 items-start">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-secondary-500">Contact Channels</h2>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
                      Connect with Our Engineering & Support Teams
                    </h3>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                      Have inquiries regarding family sync configurations, OCR capabilities, or enterprise customization? Fill in our form or connect directly.
                    </p>
                  </div>

                  {/* Channels List */}
                  <div className="space-y-5">
                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 flex-shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Company Address</h4>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                          102, Premium Heights, Baner Road, Pune, Maharashtra, 411045, India.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 flex-shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Support Channels</h4>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                          General support: support@expensetracker.com
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 flex-shrink-0">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Help Center</h4>
                        <a href="#help" className="text-xs sm:text-sm text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 mt-1 transition-colors">
                          Explore our knowledge database
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Form Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-bg-card/40 border border-white/5 relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary-500/5 blur-2xl pointer-events-none" />

                  <h4 className="text-xl font-bold text-white tracking-tight mb-6">Send a Message</h4>

                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Your Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-bg-deep/40 px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-bg-deep/40 px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="Inquiry Topic"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg-deep/40 px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Message Content</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Enter details..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-bg-deep/40 px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none transition-all"
                      />
                    </div>

                    <Button type="submit" className="w-full mt-2 justify-center">
                      {formSubmitted ? 'Message Transmitted Successfully!' : 'Send Message'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 py-16 border-t border-white/5 bg-bg-dark">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full space-y-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 select-none">
                <span className="text-base font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Expense Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                A premium, modern SaaS product styled with dark glassmorphic components for personal and household bookkeeping.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Mockups</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Center</a></li>
                <li><a href="#help" className="hover:text-white transition-colors">Help Articles</a></li>
                <li><a href="#api" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security Details</a></li>
              </ul>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <span>© 2026 Expense Tracker Inc. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Watch Demo Modal */}
      <AnimatePresence>
        {demoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={() => setDemoOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-3xl bg-bg-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden"
            >
              <button
                onClick={() => setDemoOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Interactive Platform Demo Walkthrough</h3>
                  <p className="text-xs text-slate-500 mt-1">Brief look inside our SaaS financial dashboard capabilities.</p>
                </div>

                <div className="h-80 rounded-2xl bg-bg-dark/50 border border-white/5 flex flex-col justify-center items-center relative overflow-hidden select-none p-6 text-center">
                  <div className="absolute inset-0 grid-bg opacity-[0.05]" />
                  <div className="h-12 w-12 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2">Simulating Live Session Recording...</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-normal">
                    This interactive simulator plays walkthrough reels displaying AI invoice scans, budget warning modals, and spreadsheet exporting features.
                  </p>
                  <Button size="sm" className="mt-6" onClick={() => setDemoOpen(false)}>
                    Close Walkthrough
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
