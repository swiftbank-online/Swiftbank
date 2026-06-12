import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import LandingPage from './components/LandingPage';
import AuthFlow from './components/AuthFlow';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import LoadingScreen from './components/LoadingScreen';
import LiveSupportWidget from './components/LiveSupportWidget';
import { dbService } from './services/dbService';
import { auth, db } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Lock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'admin'>('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Securing gateway to Swift Bank online portal...");
  const [user, setUser] = useState<UserProfile | null>(null);

  // Hidden admin login locks
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  // Synchronize authentication lifecycle automatically with live Firebase Auth
  useEffect(() => {
    setIsLoading(true);
    setLoadingMsg("Syncing encrypted digital vault records...");
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            if (profileData.status === 'blocked') {
              await signOut(auth);
              setUser(null);
              setView('login');
              window.history.pushState(null, "", "/login");
              window.dispatchEvent(new PopStateEvent('popstate'));
              setIsLoading(false);
              return;
            }
            dbService.setupListeners(profileData.userId, profileData.isAdmin);
            setUser(profileData);
            if (profileData.isAdmin) {
              setView('admin');
              window.history.pushState(null, "", "/admin");
              window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
              setView('dashboard');
              const path = window.location.pathname;
              const validDashboardPaths = ['/dashboard', '/cards', '/profile', '/transfer', '/topup', '/transactions'];
              if (!validDashboardPaths.includes(path)) {
                window.history.pushState(null, "", "/dashboard");
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
          }
        } catch (err) {
          console.error("Auth state synchronization failure:", err);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Parse pathing and coordinates on boot and refresh
  useEffect(() => {
    const handlePathnameChange = () => {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/login') {
        if (user && user.isAdmin) {
          setView('admin');
        } else {
          setView('admin'); // mount admin credential checkpoint
        }
      } else if (path === '/login') {
        setView('login');
      } else if (path === '/register') {
        setView('register');
      } else if (['/dashboard', '/cards', '/profile', '/transfer', '/topup', '/transactions'].includes(path)) {
        if (user) {
          setView('dashboard');
        } else {
          window.history.pushState(null, "", "/login");
          window.dispatchEvent(new PopStateEvent('popstate'));
          setView('login');
        }
      } else if (path === '/' || path === '') {
        setView('landing');
      } else {
        setView('landing');
      }
    };

    window.addEventListener('popstate', handlePathnameChange);
    // Initial parse
    handlePathnameChange();

    return () => {
      window.removeEventListener('popstate', handlePathnameChange);
    };
  }, [user]);

  // Handle active navigation adjustments
  const navigateTo = (nextView: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => {
    setIsLoading(true);
    let path = "/";
    if (nextView === 'landing') {
      setLoadingMsg("Syncing public-facing branding coefficients...");
      path = "/";
    } else if (nextView === 'login') {
      setLoadingMsg("Checking bank compliance firewalls...");
      path = "/login";
    } else if (nextView === 'register') {
      setLoadingMsg("Opening secure registration portal...");
      path = "/register";
    } else if (nextView === 'dashboard') {
      setLoadingMsg("Authenticating visual assets & transaction limits...");
      path = "/dashboard";
    } else if (nextView === 'admin') {
      setLoadingMsg("Opening administrative mainframe desk...");
      path = "/admin/login";
    }
    
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setView(nextView);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Auth logins success triggers
  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    setIsLoading(true);
    setLoadingMsg(`Welcome back, ${authenticatedUser.fullName}. Unlocking visual bank metrics...`);
    
    setTimeout(() => {
      setIsLoading(false);
      let path = "/dashboard";
      if (authenticatedUser.isAdmin) {
        setView('admin');
        path = "/admin";
      } else {
        setView('dashboard');
        path = "/dashboard";
      }
      window.history.pushState(null, "", path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, 1200);
  };

  // Profile status adjustments
  const handleProfileUpdate = (refreshed: UserProfile) => {
    setUser(refreshed);
  };

  // Logout routine resets state
  const handleLogout = async () => {
    setIsLoading(true);
    setLoadingMsg("Logging out securely of Swift Network...");
    dbService.clearListeners();
    await signOut(auth);
    setUser(null);
    setAdminEmail("");
    setAdminPassword("");
    
    setTimeout(() => {
      setIsLoading(false);
      navigateTo('landing');
    }, 1000);
  };

  // Process Admin sign-in form explicitly for /admin/login route
  const handleAdminFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      } catch (signInErr: any) {
        if (adminEmail === "swiftbank.online@gmail.com" && adminPassword === "Admin@swiftbank.online") {
          userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        } else {
          throw signInErr;
        }
      }

      const uid = userCredential.user.uid;
      const userDocRef = doc(db, 'users', uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newProfile = await dbService.registerUser({
          userId: uid,
          fullName: "George Stetson (Advisory Admin)",
          email: adminEmail,
          age: 40,
          country: "United States",
          pin: "8888"
        });
        await dbService.updateUserProfile(uid, { balance: 1000000.00, isAdmin: true });
        newProfile.balance = 1000050.00;
        newProfile.isAdmin = true;
        
        userDoc = await getDoc(userDocRef);
      }

      const superAdmin = userDoc.data() as UserProfile;
      if (!superAdmin.isAdmin) {
        throw new Error("This account is not designated as administrative role.");
      }

      dbService.setupListeners(superAdmin.userId, superAdmin.isAdmin);
      setUser(superAdmin);
      setIsLoading(true);
      setLoadingMsg("Opening Admin command portal...");
      setTimeout(() => {
        setIsLoading(false);
        setView('admin');
        window.history.pushState(null, "", "/admin");
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 1000);
    } catch (err: any) {
      setAdminError(err.message || "Invalid administrative security credentials.");
    }
  };

  return (
    <>
      {isLoading && <LoadingScreen message={loadingMsg} />}

      {/* RENDER ACTIVE ROUTE VIEW */}
      {!isLoading && (
        <>
          {view === 'landing' && (
            <LandingPage 
              onNavigate={(dest) => navigateTo(dest)}
              onNavigateAdmin={() => navigateTo('admin')}
            />
          )}

          {(view === 'login' || view === 'register') && (
            <AuthFlow 
              initialMode={view}
              onAuthSuccess={handleAuthSuccess}
              onBackToLanding={() => navigateTo('landing')}
            />
          )}

          {view === 'dashboard' && user && (
            <UserDashboard 
              user={user} 
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
            />
          )}

          {view === 'admin' && (
            user && user.isAdmin ? (
              <AdminPanel adminUser={user} onLogout={handleLogout} />
            ) : (
              /* Administrative credentials checkpoint overlay */
              <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-3xl shadow-xl">
                  <div className="text-center mb-6">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/25 flex items-center justify-center text-red-500 mb-3.5">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white font-display">Administrative Checkpoint</h3>
                    <p className="text-[10px] text-slate-550 uppercase tracking-widest font-mono mt-1">Authorized personnel restricted entrance</p>
                  </div>

                  {adminError && (
                    <div className="mb-4 p-3 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminFormLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Admin Email</label>
                      <input 
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@swiftbank.online"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Mainframe Password</label>
                      <input 
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-red-650 hover:bg-red-600 text-white font-semibold rounded-xl text-xs sm:text-sm active:scale-95 transition-all text-xs tracking-wider"
                    >
                      Authenticate Credentials Code
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => navigateTo('landing')}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Return to Public site
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Render FLOATING live support chat widget if client dashboard is active! */}
          {user && !user.isAdmin && (
            <LiveSupportWidget userId={user.userId} userName={user.fullName} />
          )}
        </>
      )}
    </>
  );
}
