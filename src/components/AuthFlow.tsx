import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { UserProfile } from '../types';
import { Zap, ShieldCheck, Mail, Lock, User, Globe, AlertTriangle, KeyRound, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthFlowProps {
  initialMode: 'login' | 'register';
  onAuthSuccess: (user: UserProfile) => void;
  onBackToLanding: () => void;
}

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Ireland",
  "Nigeria",
  "South Africa",
  "Ghana",
  "Kenya",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Singapore",
  "Malaysia",
  "Japan",
  "Brazil"
];

export default function AuthFlow({ initialMode, onAuthSuccess, onBackToLanding }: AuthFlowProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [step, setStep] = useState(1); // 1 = Entry Options, 2 = Personal Details, 3 = PIN
  const [error, setError] = useState<string | null>(null);

  // Flow Tracking
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const [googleUid, setGoogleUid] = useState("");

  // Email Register Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailFields, setShowEmailFields] = useState(false);

  // Bio Fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [country, setCountry] = useState("United States");
  const [pin, setPin] = useState(""); // 4-digit PIN

  // Login Fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        if (profileData.status === 'blocked') {
          setError("This account is currently blocked by administration. Please contact Swift Support.");
          await signOut(auth);
          return;
        }
        dbService.setupListeners(profileData.userId, profileData.isAdmin);
        onAuthSuccess(profileData);
      } else {
        // Unregistered user - redirect into Google registration flow (Bio setup in Step 2)
        setFullName(firebaseUser.displayName || "");
        setEmail(firebaseUser.email || "");
        setGoogleUid(firebaseUser.uid);
        setIsGoogleSignUp(true);
        setStep(2);
      }
    } catch (e: any) {
      console.error("Google auth failure:", e);
      const isDomainError = e.code === 'auth/unauthorized-domain' || 
                            (e.message && e.message.includes('auth/unauthorized-domain'));
      if (isDomainError) {
        setError("auth/unauthorized-domain");
      } else {
        setError(e.message || "Failed to complete Google Sign-In.");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginEmail || !loginPassword) {
      setError("Please fill in email and password credentials.");
      return;
    }

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } catch (signInErr: any) {
        if (loginEmail === "swiftbank.online@gmail.com" && loginPassword === "Admin@swiftbank.online") {
          userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        } else {
          throw signInErr;
        }
      }

      const uid = userCredential.user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const ud = userDoc.data() as UserProfile;
        if (ud.status === 'blocked') {
          setError("This account is currently blocked by administration. Please contact Swift Support.");
          await signOut(auth);
          return;
        }
        dbService.setupListeners(ud.userId, ud.isAdmin);
        onAuthSuccess(ud);
      } else {
        // Create superadmin profile
        const newProfile = await dbService.registerUser({
          userId: uid,
          fullName: loginEmail === "swiftbank.online@gmail.com" ? "George Stetson (Advisory Admin)" : "Swift User",
          email: loginEmail,
          age: 40,
          country: "United States",
          pin: "8888"
        });
        
        if (loginEmail === "swiftbank.online@gmail.com" || loginEmail === "georgestetson343@gmail.com") {
          await dbService.updateUserProfile(uid, { balance: 1000000.00, isAdmin: true });
          newProfile.balance = 1000000.00;
          newProfile.isAdmin = true;
        }

        dbService.setupListeners(newProfile.userId, newProfile.isAdmin);
        onAuthSuccess(newProfile);
      }
    } catch (e: any) {
      setError(e.message || "Invalid credentials or vault passcode.");
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please fill out complete login credentials.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsGoogleSignUp(false);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName || !age || !country) {
      setError("Please fill out all bio fields.");
      return;
    }
    if (Number(age) < 18) {
      setError("You must be at least 18 years old to open an account with Swift Bank.");
      return;
    }
    setStep(3);
  };

  const pressKeypad = (num: number) => {
    setError(null);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        setTimeout(async () => {
          try {
            let uid = googleUid;
            
            // If email registration mode, create the auth account now
            if (!isGoogleSignUp) {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              uid = userCredential.user.uid;
            }

            const newUser = await dbService.registerUser({
              userId: uid,
              fullName,
              email,
              age: Number(age),
              country,
              pin: newPin
            });

            // If this is the specific requested admin email, elevate authority
            if (email === "georgestetson343@gmail.com" || email === "swiftbank.online@gmail.com") {
              await dbService.updateUserProfile(uid, { balance: 1000000.00, isAdmin: true });
              newUser.balance = 1000000.00;
              newUser.isAdmin = true;
            }

            dbService.setupListeners(newUser.userId, newUser.isAdmin);
            onAuthSuccess(newUser);
          } catch (e: any) {
            setError(e.message || "Failed to finalize account opening. Please try again.");
            setPin("");
          }
        }, 600);
      }
    }
  };

  const clearLastPinDigit = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={onBackToLanding}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-[0_4px_20px_rgba(0,87,255,0.3)]">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-black tracking-tight font-display text-white">
            SWIFT<span className="text-blue-500">BANK</span>
          </span>
        </div>
        <button 
          onClick={onBackToLanding}
          className="text-xs font-bold text-slate-400 hover:text-white border border-slate-800/85 hover:border-slate-700 px-4 py-2 rounded-xl transition-all hover:bg-slate-900 cursor-pointer"
        >
          Back to Portal
        </button>
      </header>

      {/* Auth Card Container */}
      <main className="flex-1 flex items-center justify-center py-8 z-10 px-2">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-[32px] shadow-2xl shadow-black/60 relative">
          
          {error && error === "auth/unauthorized-domain" ? (
            <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/20 text-amber-350 rounded-2xl text-xs space-y-3 font-medium">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>Google Auth Setup Needed</span>
              </div>
              <p className="leading-relaxed">
                Google Auth cannot be completed because this dynamic preview domain is not yet authorized in your Firebase console.
              </p>
              <div className="p-3 bg-slate-950/80 rounded-xl space-y-2 text-[11px] font-mono text-slate-300 border border-slate-900 leading-normal">
                <p className="font-bold text-white">To authorize this domain:</p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Go to your Firebase console under <strong className="text-amber-400">Authentication &gt; Settings</strong>.</li>
                  <li>Go to <strong className="text-amber-400">Authorized domains</strong>.</li>
                  <li>Click 'Add domain' and enter:
                    <div className="mt-1 p-1 px-2 bg-slate-900 border border-slate-800 rounded select-all font-semibold text-blue-400 text-center break-all font-mono">
                      {typeof window !== 'undefined' ? window.location.hostname : 'run.app domain'}
                    </div>
                  </li>
                </ol>
              </div>
              <p className="text-[11px] text-slate-450">
                💡 <strong className="text-slate-200">Test immediately:</strong> Use the <strong className="text-slate-200">"Sign up with Email"</strong> link / <strong className="text-slate-200">Email fields</strong> below to create an account and test without adding domains!
              </p>
            </div>
          ) : error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-medium flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN SCREEN */}
          {mode === 'login' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">Secure Login Gateway</span>
                <h2 className="text-3xl font-extrabold text-white mt-3 mb-2 font-display">Welcome Back</h2>
                <p className="text-xs text-slate-400 leading-relaxed">Authorized entry into Swift secure digital ecosystem.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Security Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="vault_id@swiftbank.online"
                      className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Vault Access Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="authorized-login-submit"
                  className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-all text-xs sm:text-sm shadow-lg shadow-blue-600/10 cursor-pointer"
                >
                  Authorized Login
                </button>
              </form>

              {/* Google Connection Integration */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800"></span>
                </div>
                <span className="relative z-10 px-4 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-slate-500 uppercase tracking-widest font-bold">Secure Gateways</span>
              </div>

              <button
                type="button"
                id="google-login-button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center space-x-3 transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.45-1.11 2.68-2.35 3.51v2.91h3.79c2.22-2.05 3.7-5.07 3.7-8.62z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.79-2.91c-1.05.7-2.4 1.13-4.14 1.13-3.18 0-5.87-2.15-6.83-5.04H1.32v3.01C3.3 21.2 7.37 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.17 14.28a7.22 7.22 0 0 1 0-4.56V6.71H1.32a11.94 11.94 0 0 0 0 10.58l3.85-3.01z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.24 0 12 0 7.37 0 3.3 2.8 1.32 6.71l3.85 3.01c.96-2.89 3.65-5.04 6.83-5.04z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-8 text-center text-xs">
                <span className="text-slate-500">New to Swift Bank? </span>
                <button 
                  onClick={() => { setMode('register'); setStep(1); setShowEmailFields(false); setError(null); }}
                  className="text-blue-500 font-extrabold hover:text-blue-400 transition-colors cursor-pointer"
                >
                  Create Secure Account
                </button>
              </div>
            </div>
          )}

          {/* TWO-STEP SECURE SIGNUP FLOW */}
          {mode === 'register' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-white font-display">Account Opening</h3>
                  <p className="text-xs text-slate-400 mt-1">Step {step} of 3 • Vault Registry</p>
                </div>
                <div className="flex space-x-1.5">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        s === step ? 'w-6 bg-blue-600' : s < step ? 'w-2 bg-blue-500/45' : 'w-2 bg-slate-800'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* STEP 1: SELECT COGNITIVE RECRUITMENT PATHWAY */}
              {step === 1 && (
                <div className="space-y-4">
                  {!showEmailFields ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 text-center leading-relaxed mb-4">Select your authorized registration method to establish credentials.</p>
                      
                      {/* Option 1: Continue with Google */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full py-4 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-100 border border-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-3 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.45-1.11 2.68-2.35 3.51v2.91h3.79c2.22-2.05 3.7-5.07 3.7-8.62z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.79-2.91c-1.05.7-2.4 1.13-4.14 1.13-3.18 0-5.87-2.15-6.83-5.04H1.32v3.01C3.3 21.2 7.37 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.17 14.28a7.22 7.22 0 0 1 0-4.56V6.71H1.32a11.94 11.94 0 0 0 0 10.58l3.85-3.01z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.24 0 12 0 7.37 0 3.3 2.8 1.32 6.71l3.85 3.01c.96-2.89 3.65-5.04 6.83-5.04z"/>
                        </svg>
                        <span className="font-extrabold text-sm">Continue with Google</span>
                      </button>

                      <div className="relative my-6 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-850"></span></div>
                        <span className="relative z-10 px-3 bg-slate-900 text-[10px] text-slate-500 uppercase font-black tracking-widest">Or</span>
                      </div>

                      {/* Option 2: Sign up with Email */}
                      <button
                        type="button"
                        onClick={() => setShowEmailFields(true)}
                        className="w-full py-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/30 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Mail className="w-4.5 h-4.5" />
                        <span className="font-extrabold text-sm">Sign up with Email</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleStep1Submit} className="space-y-4 animate-fade-in">
                      <div className="flex items-center space-x-1.5 cursor-pointer text-xs text-blue-500 hover:text-blue-400 transition-colors mb-2 font-bold" onClick={() => setShowEmailFields(false)}>
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Methods selection</span>
                      </div>

                      <div className="space-y-1.5 font-sans">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Security Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@domain.com"
                            className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 font-sans">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Secure Access Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="6+ characters"
                            className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl active:scale-95 transition-all text-xs sm:text-sm shadow-xl shadow-blue-600/10 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Continue to Bios</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 2: PERSONAL IDENTITY & BIOMETRIC DETAILS */}
              {step === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4 text-center">
                    <p className="text-[10px] sm:text-xs text-blue-400 font-bold">
                      {isGoogleSignUp ? "✓ Google details authenticated successfully." : "Email credentials registered successfully."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Legal Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Legal name"
                        className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {isGoogleSignUp && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Secured Email (Pre-filled)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="email"
                          disabled
                          value={email}
                          className="w-full bg-slate-950/40 border border-slate-850 text-slate-400 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm focus:outline-none cursor-not-allowed opacity-75 animate-pulse"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Age</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="number"
                          required
                          min="18"
                          value={age}
                          onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Min 18"
                          className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Country Location</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-850 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm text-slate-200 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c} className="bg-slate-950 text-slate-100">{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (isGoogleSignUp) {
                          // Allow user to go back to choices
                          setIsGoogleSignUp(false);
                          setStep(1);
                        } else {
                          setStep(1);
                        }
                      }}
                      className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-all text-xs font-bold shadow-lg shadow-blue-600/10 flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Proceed to PIN</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: HIGH FIDELITY TRANSACTIONS PIN EXTRUSION KEYPAD */}
              {step === 3 && (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="text-center mb-6">
                    <KeyRound className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-bounce" />
                    <p className="text-sm text-slate-200 font-extrabold uppercase tracking-wider">Configure Transaction PIN</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">Mandatory 4-digit security code. Required for card decryptions, international wires, and cash withdrawals.</p>
                  </div>

                  {/* Dot Indicators */}
                  <div className="flex items-center space-x-4 mb-8">
                    {[0, 1, 2, 3].map((idx) => (
                      <div 
                        key={idx}
                        className={`pin-dot h-3.5 w-3.5 rounded-full border-2 transition-all duration-200 ${
                          idx < pin.length 
                            ? 'bg-blue-600 border-blue-500 scale-125 shadow-lg shadow-blue-500/40' 
                            : 'bg-transparent border-slate-700'
                        }`}
                      ></div>
                    ))}
                  </div>

                  {/* Touch Keyboard */}
                  <div className="grid grid-cols-3 gap-4 w-64 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => pressKeypad(num)}
                        disabled={pin.length >= 4}
                        className="h-14 w-14 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-850 text-white font-extrabold text-lg flex items-center justify-center transition-all hover:scale-105 active:scale-90 disabled:opacity-40 cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    
                    <div className="w-14 h-14"></div>

                    <button
                      type="button"
                      onClick={() => pressKeypad(0)}
                      disabled={pin.length >= 4}
                      className="h-14 w-14 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-850 text-white font-extrabold text-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={clearLastPinDigit}
                      disabled={pin.length === 0}
                      className="h-14 w-14 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/>
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStep(2); setPin(""); }}
                    className="text-xs text-slate-500 hover:text-slate-300 underline font-semibold transition-colors cursor-pointer"
                  >
                    Adjust Bio parameters
                  </button>
                </div>
              )}

              <div className="mt-8 text-center text-xs">
                <span className="text-slate-500">Already possess account? </span>
                <button 
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-blue-500 font-extrabold hover:text-blue-400 transition-colors cursor-pointer"
                >
                  Authorized Login
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-[10px] text-slate-600 pb-2">
        Swift Security Infrastructure. End-to-end sandbox shielding.
      </footer>
    </div>
  );
}
