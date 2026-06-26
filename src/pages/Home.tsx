import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { TextReveal } from '@/components/ui/cascade-text';
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
  Menu,
  X,
  ChevronRight,
  Play,
  Check,
  Clock,
  Lock,
  Shield,
  Layers,
  Globe,
  Award,
  Key,
  Star,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/authStore';

// Dynamic Counter Component for Statistics
function Counter({ value, suffix = '', prefix = '', duration = 2 }: { value: number; suffix?: string; prefix?: string; duration?: number }) {
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
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// Interactive FAQ Accordion Component
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left py-2 text-sm sm:text-base font-bold text-white hover:text-primary-300 transition-colors focus:outline-none"
      >
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-2 pb-4">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomePage() {
  const { user, signOut } = useAuthStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Showcase tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'family' | 'workspace' | 'ai' | 'reports' | 'notifications' | 'budgets'>('dashboard');
  const [demoOpen, setDemoOpen] = useState(false);

  // Scroll ref and transforms for hero
  const globalScrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: globalProgress } = useScroll({
    target: globalScrollRef,
    offset: ['start start', 'end end'],
  });

  const heroOpacity = useTransform(globalProgress, [0.0, 0.12], [1, 0]);
  const heroY = useTransform(globalProgress, [0.0, 0.12], [0, -40]);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // AI Chat Simulation States
  const [chatStep, setChatStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'user', text: 'How much did I spend on food this month?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

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

  // AI Chat dialogue scripts
  const aiDialogue = useMemo(() => [
    {
      q: 'How much did I spend on food this month?',
      a: 'You have spent **₹12,450.00** on Food & Dining. This is 15% lower than your average monthly spending.'
    },
    {
      q: 'Show unusual expenses.',
      a: 'Detected **2 anomalies**: a duplicate charge of **₹3,453.00** at Starbucks on June 26, and an unusual **₹8,500.00** SaaS billing on June 18.'
    },
    {
      q: 'How can I save more?',
      a: 'You currently have **3 inactive subscriptions** running. Canceling them could save you **₹1,640.00 per month**.'
    }
  ], []);

  useEffect(() => {
    if (chatStep === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiDialogue[0].a }]);
        setIsTyping(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [chatStep, aiDialogue]);

  const triggerChatStep = (idx: number) => {
    if (isTyping) return;
    setChatStep(idx);
    setChatMessages([
      { sender: 'user', text: aiDialogue[idx].q }
    ]);
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'ai', text: aiDialogue[idx].a }]);
      setIsTyping(false);
    }, 1500);
  };

  // Nav items based on state
  const loggedOutNav = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Showcase', href: '#showcase' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
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

  // 9 Premium Feature Cards definitions
  const featuresList = [
    {
      title: 'AI Expense Categorization',
      desc: 'Smart machine learning models automatically verify vendors and assign accurate category tags to purchases.',
      icon: Sparkles,
      gradient: 'from-purple-500/20 to-pink-500/10',
      preview: (
        <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/5 mt-4">
          <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><Sparkles className="h-3.5 w-3.5" /></div>
          <span className="text-[10px] text-slate-300">Swiggy Order → Food</span>
        </div>
      )
    },
    {
      title: 'Receipt OCR Scanner',
      desc: 'Take snapshots of receipt invoices and let AI extract text, merchant, and total numbers in seconds.',
      icon: ScanLine,
      gradient: 'from-cyan-500/20 to-blue-500/10',
      preview: (
        <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/5 mt-4">
          <div className="h-6 w-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400"><ScanLine className="h-3.5 w-3.5" /></div>
          <span className="text-[10px] text-slate-300">Extracting Invoice... 99.4% confidence</span>
        </div>
      )
    },
    {
      title: 'Budget Tracking',
      desc: 'Define custom budget boundaries per category to receive live progress alerts before crossing safety margins.',
      icon: Target,
      gradient: 'from-amber-500/20 to-orange-500/10',
      preview: (
        <div className="space-y-1.5 mt-4 w-full">
          <div className="flex justify-between text-[9px] text-slate-400"><span>Rent limit</span><span>85% Utilized</span></div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: '85%' }} /></div>
        </div>
      )
    },
    {
      title: 'Family Finance Hub',
      desc: 'Invite members to share budget plans, assign spending caps to children, and view total logs.',
      icon: Users,
      gradient: 'from-pink-500/20 to-rose-500/10',
      preview: (
        <div className="flex items-center gap-1.5 mt-4">
          <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white">A</div>
          <div className="h-5 w-5 rounded-full bg-pink-500 flex items-center justify-center text-[8px] text-white">S</div>
          <span className="text-[9px] text-slate-400">+3 members active</span>
        </div>
      )
    },
    {
      title: 'Workspace Collaboration',
      desc: 'Separate personal budgets from business operations under independent domains and permission parameters.',
      icon: Activity,
      gradient: 'from-teal-500/20 to-emerald-500/10',
      preview: (
        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5 mt-4">
          <span className="text-[9px] text-slate-300">Workspace: Engineering Dept</span>
        </div>
      )
    },
    {
      title: 'Recurring Expenses',
      desc: 'Track software subscriptions, utility bills, and insurance fees with automatic billing cycles.',
      icon: Clock,
      gradient: 'from-blue-500/20 to-indigo-500/10',
      preview: (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5 mt-4">
          <span className="text-[9px] text-slate-400">Spotify (Family)</span>
          <span className="text-[9px] text-slate-300">₹179/mo</span>
        </div>
      )
    },
    {
      title: 'Fraud & Spike Detection',
      desc: 'Let our system scan audit logs to automatically flag duplicate transactions and unusual spikes.',
      icon: AlertTriangle,
      gradient: 'from-rose-500/20 to-red-500/10',
      preview: (
        <div className="flex items-center gap-1.5 text-red-400 mt-4 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[9px]">Flagged: Duplicate billing</span>
        </div>
      )
    },
    {
      title: 'Monthly AI Insights',
      desc: 'Receive tailored spending suggestions calculated from month-over-month ledger averages.',
      icon: PieChart,
      gradient: 'from-indigo-500/20 to-cyan-500/10',
      preview: (
        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5 mt-4">
          <span className="text-[9px] text-slate-400">Reduce subscriptions to save ₹1.6k</span>
        </div>
      )
    },
    {
      title: 'Secure Cloud Sync',
      desc: 'Your data is encrypted end-to-end and stored safely with row level security on Supabase.',
      icon: CheckCircle2,
      gradient: 'from-teal-500/20 to-indigo-500/10',
      preview: (
        <div className="flex items-center gap-1.5 text-emerald-400 mt-4 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[9px]">AES-256 Encrypted</span>
        </div>
      )
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
        {[...Array(25)].map((_, i) => (
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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] p-[1.5px] shadow-[0_0_15px_rgba(139,92,246,0.35)]">
              <div className="h-full w-full rounded-[10px] bg-bg-card flex items-center justify-center text-white font-mono font-black text-xs border border-black/10">
                EX
              </div>
            </div>
            <span className="text-lg font-mono tracking-[0.15em] font-black bg-gradient-to-r from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
              Expenso
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
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
        <div className="relative z-10">
          
          {/* Hero Section */}
          <section className="min-h-screen w-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-2 items-center relative bg-transparent gap-12">
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
                <TextReveal
                  text="Smart Expense Management"
                  subtitle="Consolidate your transaction records, coordinate family spending, and visualize automated insights under a sleek, glassmorphic SaaS interface."
                  textSize="text-4xl sm:text-5xl lg:text-6xl"
                  variant="gradient"
                />
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

              {/* Hero Statistics Row (counters animate when visible) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5">
                {[
                  { value: 50000, suffix: '+', title: 'Expenses Tracked', desc: 'Logged securely' },
                  { value: 100, suffix: 'M+', prefix: '₹', title: 'Assets Managed', desc: 'Syncing globally' },
                  { value: 98, suffix: '%', title: 'AI Accuracy', desc: 'Smart categorization' },
                  { value: 10000, suffix: '+', title: 'Active Users', desc: 'Trusting Expenso' },
                  { value: 99.9, suffix: '%', title: 'System Uptime', desc: 'SOC2 Ready' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5 bg-white/[0.01] border border-white/5 rounded-2xl p-4 shadow-glass hover:border-white/10 transition-colors">
                    <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                      {item.prefix}<Counter value={item.value} suffix={item.suffix} />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.title}</p>
                    <p className="text-[8px] text-slate-600 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right-side glowing graphic mockup */}
            <div className="hidden md:flex items-center justify-center relative h-[600px] select-none pointer-events-none">
              <div className="absolute h-[350px] w-[350px] rounded-full bg-gradient-to-tr from-primary-500/20 to-secondary-500/30 blur-[90px] animate-pulse" />

              {/* Main floating glass dashboard card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-[420px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-pink" />
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500/80" />
                    <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
                    <span className="h-2 w-2 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-extrabold tracking-wider uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                    SaaS Analytics
                  </span>
                </div>

                {/* Graph mockup & main balance */}
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Family Assets Overview</span>
                    <span className="text-3xl font-black text-white mt-1 block">₹1,48,920.00</span>
                  </div>

                  {/* Sparkline chart visualization */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span>Monthly Spending Trend</span>
                      <span className="text-emerald-400">₹45,210.00 Spent</span>
                    </div>
                    {/* Simulated SVG line chart */}
                    <div className="h-28 w-full bg-white/5 rounded-2xl p-3 border border-white/5 flex items-end">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                        <defs>
                          <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,40 Q15,10 30,25 T60,5 T90,20 T100,12 L100,40 L0,40 Z"
                          fill="url(#glowGrad)"
                        />
                        <motion.path
                          d="M0,40 Q15,10 30,25 T60,5 T90,20 T100,12"
                          fill="none"
                          stroke="url(#lineGrad)"
                          strokeWidth="2"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                        />
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="50%" stopColor="#EC4899" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                      </svg>
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Savings Target</span>
                      <span className="text-sm font-bold text-slate-200 mt-1 block">82% Achieved</span>
                      <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Daily Average</span>
                      <span className="text-sm font-bold text-slate-200 mt-1 block">₹1,540.00</span>
                      <span className="text-[9px] text-emerald-400 font-semibold mt-1 block">↓ 8% vs last week</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Smaller floating card: Recent transaction */}
              <motion.div
                animate={{ y: [-6, 6, -6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-10 -left-6 w-56 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-white block truncate">AI Categorized</span>
                    <span className="text-[8px] text-slate-400 block truncate">Uber Ride → Travel</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 ml-auto shrink-0">+₹240 saved</span>
                </div>
              </motion.div>

              {/* Smaller floating card: Notification / Warning */}
              <motion.div
                animate={{ y: [6, -6, 6] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-10 -right-6 w-56 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Target className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white block">Safe Budget Cap</span>
                    <span className="text-[8px] text-slate-400 block">Shopping at 65% limit</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Trusted By Section (below Hero) */}
          <section className="relative z-10 py-10 border-y border-white/5 bg-white/[0.01] backdrop-blur-3xl">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full text-center space-y-5">
              <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-slate-500 block">
                Trusted by modern individuals & organizations
              </span>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                {[
                  { label: 'Families', desc: 'Shared limits' },
                  { label: 'Freelancers', desc: 'Tax compliance' },
                  { label: 'Small Businesses', desc: 'Workspaces' },
                  { label: 'Students', desc: 'Budgeting tools' },
                  { label: 'Individuals', desc: 'Smart audits' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -2, scale: 1.03 }}
                    className="px-5 py-3 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-glass flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary-400" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">{item.label}</span>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold tracking-wider mt-0.5 block">{item.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURES SECTION (9 cards) */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent" id="features">
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

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                      {item.preview}
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

          {/* DASHBOARD SHOWCASE SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent" id="showcase">
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
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'expenses', label: 'Expense Manager' },
                  { id: 'family', label: 'Family Dashboard' },
                  { id: 'workspace', label: 'Workspace Dashboard' },
                  { id: 'ai', label: 'AI Assistant' },
                  { id: 'reports', label: 'Reports & Analytics' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'budgets', label: 'Budgets' },
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
              <div className="w-full max-w-5xl mx-auto rounded-2xl bg-bg-card/30 border border-white/10 p-6 shadow-2xl min-h-[440px] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary-500/5 blur-[90px] pointer-events-none" />

                <AnimatePresence mode="wait">
                  {activeTab === 'dashboard' && (
                    <motion.div
                      key="dashboard"
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

                  {activeTab === 'expenses' && (
                    <motion.div
                      key="expenses"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-purple-500/10 text-purple-400 border border-purple-500/15 flex items-center justify-center rounded-lg"><Wallet className="h-4 w-4" /></div>
                          <div>
                            <span className="text-xs font-bold text-white block">Starbucks Coffee</span>
                            <span className="text-[9px] text-slate-500 block">Food & Dining • June 26</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">-₹380.00</span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-500/10 text-blue-400 border border-blue-500/15 flex items-center justify-center rounded-lg"><Clock className="h-4 w-4" /></div>
                          <div>
                            <span className="text-xs font-bold text-white block">Spotify Subscription</span>
                            <span className="text-[9px] text-slate-500 block">Bills & Utilities • June 25</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">-₹179.00</span>
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
                          <div className="h-9 w-9 rounded-full bg-primary-500 flex items-center justify-center font-extrabold text-white text-xs border border-primary-500/20">HK</div>
                          <div>
                            <span className="text-xs font-bold text-white block">Hiten (Owner)</span>
                            <span className="text-[10px] text-slate-400 block">Spent ₹18,453.00</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">₹20,000 Cap</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary-500 flex items-center justify-center font-extrabold text-white text-xs border border-secondary-500/20">AK</div>
                          <div>
                            <span className="text-xs font-bold text-white block">Aishwarya (Spouse)</span>
                            <span className="text-[10px] text-slate-400 block">Spent ₹4,230.00</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">₹15,000 Cap</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'workspace' && (
                    <motion.div
                      key="workspace"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-4 max-w-lg mx-auto"
                    >
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Engineering Operations</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mt-1">Budget Scoped to Department</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-300">₹8,500.00 / ₹25,000.00</span>
                          <div className="h-1.5 w-24 bg-white/10 rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: '34%' }} /></div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="space-y-4 max-w-md mx-auto bg-white/[0.02] border border-white/5 p-5 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">AI Assistant Suggestions</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        "Your subscription costs grew by 18% compared to last month. Consider review sessions to prune inactive licenses."
                      </p>
                    </motion.div>
                  )}

                  {activeTab === 'reports' && (
                    <motion.div
                      key="reports"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="h-56 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-end p-6 select-none">
                        <div className="flex items-end justify-between h-40 max-w-lg mx-auto w-full border-b border-white/5 pb-2">
                          <div className="w-10 bg-gradient-to-t from-primary-500 to-indigo-600 rounded-t" style={{ height: '65%' }} />
                          <div className="w-10 bg-gradient-to-t from-secondary-500 to-cyan-600 rounded-t" style={{ height: '45%' }} />
                          <div className="w-10 bg-gradient-to-t from-primary-500 to-indigo-600 rounded-t" style={{ height: '80%' }} />
                          <div className="w-10 bg-gradient-to-t from-accent-pink to-pink-600 rounded-t" style={{ height: '95%' }} />
                        </div>
                        <div className="flex justify-between max-w-lg mx-auto w-full text-[9px] text-slate-500 uppercase font-bold mt-2.5">
                          <span>Groceries</span>
                          <span>Rent</span>
                          <span>Travel</span>
                          <span>Utilities</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <Bell className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-slate-300">Family Budget Alert: Shopping limit is 85% Utilized.</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <Bell className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs text-slate-300">Sync Success: 1 new invoice scanned and processed.</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'budgets' && (
                    <motion.div
                      key="budgets"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 max-w-md mx-auto"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">Food Limit progress</span>
                          <span className="text-slate-400">70% (₹4,200/₹6,000)</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: '70%' }} /></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* DEDICATED AI ASSISTANT SHOWCASE SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-2 items-center">
              <div className="space-y-6 text-left">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary-400">Gemini AI Engine</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
                  Chat with Expenso Intelligence
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Query your ledger in plain English. Detect abnormal transaction rates, analyze trends, and compile immediate savings recommendations on autopilot.
                </p>

                {/* Questions Trigger Tags */}
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Ask example questions</span>
                  <div className="flex flex-wrap gap-2.5">
                    {aiDialogue.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => triggerChatStep(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                          chatStep === idx
                            ? 'bg-purple-500/10 border-purple-500/35 text-white'
                            : 'border-white/5 bg-white/[0.01] text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        "{item.q}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Simulator Panel */}
              <div className="flex justify-center">
                <div className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden select-none">
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Expenso AI</span>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Gemini-Powered</span>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Message History */}
                  <div className="h-60 overflow-y-auto space-y-4 pr-1">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                          {msg.sender === 'user' ? 'You' : 'AI Assistant'}
                        </span>
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] border ${
                            msg.sender === 'user'
                              ? 'bg-purple-500/10 border-purple-500/15 text-purple-100 rounded-tr-none'
                              : 'bg-white/5 border-white/5 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1">AI Assistant</span>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RECEIPT OCR SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-[1fr_auto_1fr] items-center">
              {/* Left: Receipt Upload frame */}
              <div className="space-y-4 text-center sm:text-left">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-cyan-400">Step 1: Receipt Capture</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">Upload and Scan</h3>
                <div className="h-64 w-full max-w-sm rounded-3xl bg-white/[0.01] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none mx-auto sm:mx-0">
                  {/* Scanner line anim */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-scanner" />
                  <FileText className="h-12 w-12 text-slate-500 mb-3" />
                  <span className="text-xs font-bold text-white">OCR Invoices Scanner</span>
                  <span className="text-[10px] text-slate-500 mt-1">Reading Cost & Merchant details</span>
                </div>
              </div>

              {/* Middle Arrow */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 animate-pulse">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>

              {/* Right: auto filled form */}
              <div className="space-y-4 text-left">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-emerald-400">Step 2: Auto-Filled Form</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">Audit & Log Expense</h3>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 max-w-sm">
                  <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                    <span className="text-xs font-bold text-white">Verify Metadata</span>
                    <span className="text-[8px] bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      99% Match
                    </span>
                  </div>
                  <div className="grid gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Merchant</span>
                      <div className="p-2.5 bg-white/5 rounded-xl text-white font-semibold">Uber Taxi</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Amount</span>
                      <div className="p-2.5 bg-white/5 rounded-xl text-white font-semibold">₹320.00</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Category Match</span>
                      <div className="p-2.5 bg-white/5 rounded-xl text-white font-semibold flex items-center justify-between">
                        <span>Travel & Transport</span>
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAMILY FEATURE SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-2 items-center">
              <div className="space-y-6 text-left">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-pink-400">Collaboration Mode</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
                  Shared Family Budgets
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Establish a shared family financial hub. Keep individual tabs, monitor combined balance progress rings, and manage kids' budgets inside a secure synced account.
                </p>
                <div className="grid gap-3 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-pink-400" />
                    <span>Synchronize partner wallets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-pink-400" />
                    <span>Receive instant budget limit push notifications</span>
                  </div>
                </div>
              </div>

              {/* Family mockup visualization */}
              <div className="flex justify-center">
                <div className="w-full max-w-[420px] p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 to-rose-600" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white uppercase tracking-wider">Family Hub Overview</span>
                    <span className="text-pink-400 font-bold">June 2026</span>
                  </div>

                  {/* budget bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Monthly Spending Limit</span>
                      <span className="text-slate-200">₹18,453 / ₹1,00,000</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-pink-500" style={{ width: '18%' }} /></div>
                  </div>

                  <div className="h-[1px] bg-white/5" />

                  {/* Leaderboard contributors */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Contributor Board</span>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-xs">H</div>
                      <div className="flex-grow min-w-0">
                        <span className="text-xs font-bold text-white block">Hiten (Owner)</span>
                        <span className="text-[9px] text-slate-500 block">7 transactions</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300">₹18,453.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* WORKSPACE COLLABORATION SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-2 items-center">
              {/* Workspace mockup */}
              <div className="flex justify-center lg:order-2">
                <div className="w-full max-w-[420px] p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 to-indigo-600" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white uppercase tracking-wider">Business Workspace</span>
                    <span className="text-[9px] bg-teal-400/10 border border-teal-400/20 text-teal-400 font-extrabold px-2.5 py-0.5 rounded-full">Active</span>
                  </div>

                  {/* Approval workflow card */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approval Queue</span>
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-white block">SaaS Server Billing</span>
                        <span className="text-[9px] text-slate-400 mt-1 block">Requested by Rohan V.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace content */}
              <div className="space-y-6 text-left lg:order-1">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-teal-400">Enterprise Isolation</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
                  Workspace Isolation & Approval Workflows
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Delegate spending rules across multiple users and departments. Track expense approvals, establish workspace limits, and audit logs securely.
                </p>
              </div>
            </div>
          </section>

          {/* INTERACTIVE ANALYTICS SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full text-center space-y-16">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-secondary-500">Live Analytics</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Visualize Your Income & Spending Trends
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Interactive, dynamically animated visual charts designed cleanly to render spending density, gauges, and line targets.
                </p>
              </div>

              {/* Grid of SVGs charts */}
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. Line Chart */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors space-y-4">
                  <span className="text-xs font-bold text-white block text-left">Spending Over Time</span>
                  <div className="h-32 flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                      <path d="M0,35 Q20,10 40,25 T80,5 T100,15" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* 2. Bar Chart */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors space-y-4">
                  <span className="text-xs font-bold text-white block text-left">Weekly Outflow</span>
                  <div className="h-32 flex justify-between items-end px-4 border-b border-white/5 pb-1">
                    <div className="w-6 bg-purple-500/80 rounded-t hover:bg-purple-500 transition-colors" style={{ height: '40%' }} />
                    <div className="w-6 bg-purple-500/80 rounded-t hover:bg-purple-500 transition-colors" style={{ height: '75%' }} />
                    <div className="w-6 bg-purple-500/80 rounded-t hover:bg-purple-500 transition-colors" style={{ height: '50%' }} />
                    <div className="w-6 bg-purple-500/80 rounded-t hover:bg-purple-500 transition-colors" style={{ height: '90%' }} />
                  </div>
                </div>

                {/* 3. Pie Chart (Distribution) */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors space-y-4">
                  <span className="text-xs font-bold text-white block text-left">Category Shares</span>
                  <div className="h-32 flex items-center justify-center">
                    <svg className="h-28 w-28 overflow-visible" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4.2" />
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#6366f1" strokeWidth="4.2" strokeDasharray="40 60" strokeDashoffset="25" />
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#06b6d4" strokeWidth="4.2" strokeDasharray="30 70" strokeDashoffset="85" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PREMIUM TESTIMONIALS GRID (6 Cards) */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
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
                  { text: "This application changed the way we manage our child caps. Setting up limits and seeing the dynamic graphs saved us nearly ₹12,000 in just two months.", author: "Rohan Mehra", role: "Product Manager, Bangalore", rating: 5 },
                  { text: "The OCR receipt scanning tool and automatic category match works with high-level accuracy. We no longer write expenses manually.", author: "Neha Gupta", role: "Freelance Designer, Pune", rating: 5 },
                  { text: "Perfect dashboard flow and secure Supabase integration. Highly recommended for couples seeking to synchronize their accounts.", author: "Arjun Verma", role: "DevOps Engineer, Noida", rating: 5 },
                  { text: "Workspaces let our engineering team isolate corporate subscriptions from personal limits. A secure, clean solution.", author: "Karan Johar", role: "Tech Lead, Mumbai", rating: 5 },
                  { text: "The Free tier is already incredible. It helped me learn discipline and track my daily average spending without complex layouts.", author: "Kabir Singh", role: "University Student, Delhi", rating: 5 },
                  { text: "The AI recommendation matched my subscription logs and helped flag duplicate payments in seconds. Pro package is worth every rupee.", author: "Sneha Patel", role: "Agency Director, Pune", rating: 5 }
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-bg-card/40 border border-white/5 hover:border-white/15 transition-all shadow-md relative group flex flex-col justify-between"
                  >
                    <div className="absolute top-4 right-6 text-primary-400/20 text-5xl font-serif select-none">“</div>
                    <div className="space-y-4 relative z-10">
                      <div className="flex gap-0.5">
                        {[...Array(card.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                        "{card.text}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-6">
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

          {/* PRICING PREVIEW SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent" id="pricing">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full">
              <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary-400">Simple Tiers</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Pricing Built for Financial Growth
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Start tracking your accounts for free, or scale up to unlock unlimited syncing, family invites, and Gemini AI insights.
                </p>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto items-stretch">
                {/* 1. Free */}
                <div className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between shadow-xl">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-bold text-white">Free Starter</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">For Personal Auditing</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹0</span>
                      <span className="text-xs text-slate-500">/ forever</span>
                    </div>
                    <ul className="space-y-3.5 text-xs text-slate-400 border-t border-white/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Track up to 200 expenses/mo</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Standard categorization</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>1 Personal Workspace</span></li>
                    </ul>
                  </div>
                  <Link to="/register" className="mt-8 block">
                    <Button variant="secondary" className="w-full justify-center">Get Started</Button>
                  </Link>
                </div>

                {/* 2. Pro (Highlighted) */}
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-primary-500/35 relative overflow-hidden flex flex-col justify-between shadow-2xl scale-100 md:scale-105">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-pink" />
                  <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary-500/10 blur-xl pointer-events-none" />
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-bold text-white">Expenso Pro</h4>
                        <p className="text-[10px] text-primary-400 mt-1 uppercase font-bold tracking-wider">Most Popular</p>
                      </div>
                      <span className="text-[8px] bg-primary-500/10 border border-primary-500/20 text-primary-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹499</span>
                      <span className="text-xs text-slate-500">/ month</span>
                    </div>
                    <ul className="space-y-3.5 text-xs text-slate-300 border-t border-white/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Unlimited monthly expenses</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Full-access OCR receipt scan</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Family Sync (Up to 5 members)</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Gemini AI Savings Insights</span></li>
                    </ul>
                  </div>
                  <Link to="/register" className="mt-8 block">
                    <Button className="w-full justify-center shadow-[0_0_24px_rgba(99,102,241,0.3)] bg-gradient-to-r from-primary-500 to-primary-600">Start Free Trial</Button>
                  </Link>
                </div>

                {/* 3. Enterprise */}
                <div className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between shadow-xl">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-bold text-white">Enterprise</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">For Small Teams & orgs</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">Custom</span>
                      <span className="text-xs text-slate-500">/ tailored</span>
                    </div>
                    <ul className="space-y-3.5 text-xs text-slate-400 border-t border-white/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>All Pro capabilities included</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Approval workflows & logs</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> <span>Priority developer channels</span></li>
                    </ul>
                  </div>
                  <a href="#contact" className="mt-8 block">
                    <Button variant="secondary" className="w-full justify-center">Contact Sales</Button>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* SECURITY & COMPLIANCE BADGING */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full text-center space-y-16">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-teal-400">Enterprise Security</h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Zero Compromises. Your Ledger is Private.
                </p>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  We deploy military-grade encryption keys and isolation parameters to ensure your transaction statements remain strictly anonymous.
                </p>
              </div>

              {/* Grid of Security features */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                {[
                  { title: 'AES-256 Encryption', desc: 'Secure database storage encryption parameters.', icon: Lock },
                  { title: 'JWT Authentication', desc: 'Secure Express API validation routes.', icon: Shield },
                  { title: 'Supabase Database', desc: 'Managed PostgreSQL architecture with strict RLS.', icon: Layers },
                  { title: 'GDPR Compliant', desc: '30-day soft deletes with feedback reasons.', icon: Globe },
                  { title: 'SOC2 Ready', desc: 'Full compliance tracking and auditable entries.', icon: Award },
                  { title: 'Row-Level Security', desc: 'Isolation schemas prevent cross-tenant leakages.', icon: Key }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors flex gap-4 items-start text-left">
                    <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>


          {/* FAQ ACCORDION SECTION (10 questions) */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent" id="faq">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full grid gap-16 lg:grid-cols-[1fr_2fr] items-start">
              <div className="space-y-4 text-left">
                <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-secondary-500">FAQ</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
                  Common Questions & Troubleshooting
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Quick answers concerning data encryption protocols, refund options, and household sync accounts.
                </p>
              </div>

              {/* Accordions */}
              <div className="space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-3xl">
                <FaqItem
                  question="How is my financial data secured?"
                  answer="Expenso employs military-grade AES-256 database encryption. All API paths verify JWT access tokens, and Supabase enforces strict Row-Level Security (RLS) to keep entries isolated."
                />
                <FaqItem
                  question="Does Expenso sell my transaction data?"
                  answer="Absolutely not. We generate revenue solely through Pro subscription tiers. Your ledger is fully private and is never sold, analyzed, or shared with third parties."
                />
                <FaqItem
                  question="How does the AI Categorization feature work?"
                  answer="When you create an expense, our machine learning categorizer parses the merchant name against thousands of known records to assign categories instantly."
                />
                <FaqItem
                  question="How accurate is the Receipt OCR Scanner?"
                  answer="Our OCR engine achieves up to 99% accuracy on standard printed receipt bills. It scans amounts, dates, and matches categories automatically."
                />
                <FaqItem
                  question="Can I synchronize multiple partner wallets?"
                  answer="Yes! Under our Family Hub Pro tier, couples can synchronize partner wallets, log entries under a shared family budget limit, and review combined records."
                />
                <FaqItem
                  question="What are Workspace isolations?"
                  answer="Workspaces let you separate personal spending categories from business expenditures. You can set independent limits, view department logs, and export audited reports."
                />
                <FaqItem
                  question="Is my data compliant with GDPR privacy laws?"
                  answer="Yes, we are fully GDPR compliant. You can request a ZIP data archive download at any time or schedule account deletes (which occur after a 30-day delay)."
                />
                <FaqItem
                  question="What is the difference between Free and Pro?"
                  answer="The Free tier tracks up to 200 personal expenses. Pro adds unlimited logging, full-access OCR receipt uploads, partner wallets, and AI savings insights."
                />
                <FaqItem
                  question="Can I self-host Expenso?"
                  answer="Currently, Expenso is hosted as a secure cloud SaaS product to ensure seamless AI features, OCR scans, and background database syncing."
                />
                <FaqItem
                  question="How can I request support?"
                  answer="You can fill out our Contact form, email us at support@expensetracker.com, or check out our knowledge base articles inside the help center."
                />
              </div>
            </div>
          </section>

          {/* PREMIUM CALL TO ACTION (CTA) SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent">
            <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 w-full">
              <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center bg-gradient-to-tr from-purple-900/40 via-indigo-950/40 to-cyan-950/20 border border-white/10 shadow-2xl">
                {/* Floating particle animations */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

                <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Establish Control Over Your Outflow
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
                    Sign up today to start logging expenses, tracking family budgets, and unlocking automatic AI insights.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row justify-center pt-4">
                    <Link to="/register">
                      <Button className="w-full sm:w-auto shadow-[0_0_24px_rgba(99,102,241,0.3)] bg-gradient-to-r from-primary-500 to-primary-600">Start Free Trial</Button>
                    </Link>
                    <button
                      onClick={() => setDemoOpen(true)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-xs text-white font-bold tracking-wide cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      Watch Demo Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CONTACT SECTION */}
          <section className="relative z-10 py-24 border-b border-white/5 bg-transparent" id="contact">
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
                      {formSubmitted ? 'Message Transmitted!' : 'Send Message'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ROBUST MULTI-COLUMN FOOTER */}
      <footer className="relative z-10 py-16 border-t border-white/5 bg-bg-dark">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 w-full space-y-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <span className="text-base font-mono tracking-[0.15em] font-black bg-gradient-to-r from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
                Expenso
              </span>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                A premium, modern SaaS product styled with dark glassmorphic components for personal and household bookkeeping.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#showcase" className="hover:text-white transition-colors">Showcase Previews</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Options</a></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security Details</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Center</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Help FAQ</a></li>
                <li><span className="text-slate-600 cursor-default">System Status: 99.9% Uptime</span></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><span className="text-slate-500">Terms of Service</span></li>
                <li><span className="text-slate-500">Privacy Policy</span></li>
                <li><span className="text-slate-500">GDPR Compliant</span></li>
              </ul>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <span>© 2026 Expenso Inc. All rights reserved.</span>
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
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Interactive Platform Demo</h3>
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
