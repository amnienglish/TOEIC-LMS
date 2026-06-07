import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Profile, Question, Score, Material, MeetingLock, Announcement, NotificationType } from './types';
import { parseDeletedScoreIds } from './utils/softDelete';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import ExamInterface from './components/ExamInterface';
import Notification from './components/Notification';
import {
  BookOpen, BookOpenCheck, UserCheck, Settings, LogOut, ChevronRight, User, ShieldAlert,
  Loader2, Sparkles, Megaphone, CheckCircle, ShieldCheck, Mail, Lock as LockIcon
} from 'lucide-react';

export default function App() {
  // Database Mode State Setup
  const [dbMode, setDbModeState] = useState<'supabase' | 'local'>(() => {
    const mode = localStorage.getItem('toeic_lms_db_mode');
    return (mode as 'supabase' | 'local') || 'local';
  });
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);

  // Authentication & Session
  const [session, setSession] = useState<any>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);

  // States
  const [meetingLocks, setMeetingLocks] = useState<Record<number, boolean>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [activeExamMeeting, setActiveExamMeeting] = useState<number | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);

  // Auth Forms
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [loginId, setLoginId] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');

  // Register Fields
  const [regUsername, setRegUsername] = useState<string>('');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regProdi, setRegProdi] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPass, setRegPass] = useState<string>('');

  // Self Profile Modal Form
  const [showSelfEditModal, setShowSelfEditModal] = useState<boolean>(false);
  const [selfUsername, setSelfUsername] = useState<string>('');
  const [selfProdi, setSelfProdi] = useState<string>('');
  const [selfPass, setSelfPass] = useState<string>('');

  // Announcement pop-up visibility (for students on login)
  const [showAnnModal, setShowAnnModal] = useState<boolean>(false);

  // Helper arrays for background styling
  const [allStudents, setAllStudents] = useState<Profile[]>([]);

  // Push notifications
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Switch Database Mode
  const handleToggleDbMode = (mode: 'supabase' | 'local') => {
    localStorage.setItem('toeic_lms_db_mode', mode);
    setDbModeState(mode);
    notify(`Penyimpanan basis data dialihkan ke: ${mode === 'supabase' ? 'Supabase Cloud (Online)' : 'Database Sandbox (Offline)'}`, 'info');
    setTimeout(() => {
      window.location.reload();
    }, 850);
  };

  // Core background listener for automated fallback warnings
  useEffect(() => {
    const handleSupabaseError = (event: any) => {
      const msg = event?.detail?.message || 'Hubungan ke Supabase terputus.';
      setSupabaseErrorMsg(msg);
    };
    window.addEventListener('supabase-error', handleSupabaseError);
    return () => {
      window.removeEventListener('supabase-error', handleSupabaseError);
    };
  }, []);

  // Synchronize master datasets from Supabase
  const refreshMasterData = async () => {
    setLoading(true);
    try {
      // 1. Fetch locks
      const { data: locksData, error: lErr } = await supabase
        .from('meeting_locks')
        .select('*')
        .order('meeting_number', { ascending: true });
      if (lErr) throw lErr;

      const locksMap: Record<number, boolean> = {};
      locksData?.forEach((item: any) => {
        locksMap[item.meeting_number] = item.is_open;
      });
      setMeetingLocks(locksMap);

      // 2. Fetch materials
      const { data: matsData, error: mErr } = await supabase
        .from('materials')
        .select('*')
        .order('meeting_number', { ascending: true });
      if (mErr) throw mErr;
      setMaterials(matsData || []);

      // 3. Fetch announcements
      const { data: annData, error: aErr } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (aErr) throw aErr;
      setAnnouncement(annData || null);

      // If user is logged in
      if (session) {
        // If teacher is logged in, grab all scores, questions, students
        if (profileData?.role === 'admin' || profileData?.username === 'admin') {
          // Questions
          const { data: qData, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .order('meeting_number', { ascending: true })
            .order('sort_order', { ascending: true });
          if (qErr) throw qErr;
          setQuestions(qData || []);

          // Scores (All)
          const { data: sData, error: sErr } = await supabase
            .from('scores')
            .select('*')
            .order('created_at', { ascending: false });
          if (sErr) throw sErr;
          
          const deletedIds = parseDeletedScoreIds(annData?.content);
          const activeScores = sData ? sData.filter((s: Score) => !deletedIds.includes(s.id)) : [];
          setScores(activeScores);

          // Student Profiles
          const { data: pData, error: pErr } = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'admin')
            .neq('username', 'admin');
          if (pErr) throw pErr;
          setAllStudents(pData || []);
        } else {
          // If student is logged in, grab only their scores
          const { data: sData, error: sErr } = await supabase
            .from('scores')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
          if (sErr) throw sErr;
          
          const deletedIds = parseDeletedScoreIds(annData?.content);
          const activeScores = sData ? sData.filter((s: Score) => !deletedIds.includes(s.id)) : [];
          setScores(activeScores);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing data: ', err);
      notify('Koneksi database terganggu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auth setup listeners
  useEffect(() => {
    // 1. Restore mock admin if stored in local storage
    if (localStorage.getItem('toeic_mock_admin') === 'true') {
      const mockAdmin: Profile = {
        id: 'mock-admin-id',
        username: 'admin',
        full_name: 'Dosen Pembimbing',
        email: 'admin@toeiclms.ac.id',
        role: 'admin',
      };
      setProfileData(mockAdmin);
      setSession({ user: { id: 'mock-admin-id', email: 'admin@toeiclms.ac.id' } });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // If mock admin is active, yield and ignore standard auth changes
      if (localStorage.getItem('toeic_mock_admin') === 'true') {
        const mockAdmin: Profile = {
          id: 'mock-admin-id',
          username: 'admin',
          full_name: 'Dosen Pembimbing',
          email: 'admin@toeiclms.ac.id',
          role: 'admin',
        };
        setProfileData(mockAdmin);
        setSession({ user: { id: 'mock-admin-id', email: 'admin@toeiclms.ac.id' } });
        return;
      }

      setSession(currentSession);
      if (currentSession) {
        // Get profile structure
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (data) {
          const profile = data as Profile;
          setProfileData(profile);
          setShowAnnModal(profile.role !== 'admin'); // Display academic announcement modal for students
        } else {
          // Create default profile if somehow auth is valid but profile is missing
          const defaultProf: Profile = {
            id: currentSession.user.id,
            username: currentSession.user.email?.split('@')[0] || 'student',
            full_name: currentSession.user.user_metadata?.full_name || 'Anonymous Student',
            email: currentSession.user.email || '',
            role: 'mahasiswa',
          };
          await supabase.from('profiles').insert([defaultProf]);
          setProfileData(defaultProf);
          setShowAnnModal(true);
        }
      } else {
        setProfileData(null);
        setScores([]);
        setQuestions([]);
        setAllStudents([]);
      }
    });

    // Populate initial public systems (Locks & Materials)
    refreshMasterData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle Refresh datasets when profile/session changes
  useEffect(() => {
    if (session) {
      refreshMasterData();
    }
  }, [session, profileData?.role]);

  // Custom login dispatcher
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPass) {
      notify('Username/Email dan Password wajib diisi!', 'error');
      return;
    }

    setLoading(true);

    // Administrative override back-door
    if (loginId.trim() === 'admin' && loginPass === 'guru123') {
      const mockAdmin: Profile = {
        id: 'mock-admin-id',
        username: 'admin',
        full_name: 'Dosen Pembimbing',
        email: 'admin@toeiclms.ac.id',
        role: 'admin',
      };
      localStorage.setItem('toeic_mock_admin', 'true');
      setProfileData(mockAdmin);
      setSession({ user: { id: 'mock-admin-id', email: 'admin@toeiclms.ac.id' } });
      notify('Selamat Datang, Bapak/Ibu Dosen Pembimbing!', 'success');
      setLoading(false);
      return;
    }

    try {
      let emailAddress = loginId.trim();

      // If user inputs standard username string instead of email, grab their emails
      if (!emailAddress.includes('@')) {
        const { data: matchedProfile, error: getEmailErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailAddress)
          .maybeSingle();

        if (getEmailErr || !matchedProfile) {
          throw new Error('Username tidak terdaftar di sistem. Silakan registrasi.');
        }
        emailAddress = matchedProfile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailAddress,
        password: loginPass,
      });

      if (error) throw error;
      notify('Berhasil masuk ke Dashboard!', 'success');
    } catch (err: any) {
      notify('Login gagal: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Register Student dispatcher
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regFullName.trim() || !regEmail.trim() || !regPass || !regProdi) {
      notify('Seluruh kolom formulir registrasi harus diisi lengkap!', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up user via supabase auth
      const { data: authResult, error: authErr } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPass,
        options: {
          data: {
            full_name: regFullName.trim(),
          },
        },
      });

      if (authErr) throw authErr;
      if (!authResult.user) throw new Error('Pembuatan akun terhambat. Silakan ulangi.');

      // 2. Insert into profiles layout
      const studentProfile: Profile = {
        id: authResult.user.id,
        username: regUsername.trim().toLowerCase(),
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: 'mahasiswa',
        study_program: regProdi,
      };

      const { error: profileErr } = await supabase.from('profiles').insert([studentProfile]);
      if (profileErr) throw profileErr;

      notify('Registrasi akun sukses! Silakan login.', 'success');
      setIsRegisterMode(false);
      setLoginId(regUsername);
    } catch (err: any) {
      notify('Gagal mendaftar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Standard sign out
  const handleSignOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('toeic_mock_admin');
      await supabase.auth.signOut();
      setSession(null);
      setProfileData(null);
      notify('Anda telah berhasil keluar dari sistem.', 'info');
    } catch (err: any) {
      notify('Keluar gagal: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open profile modal and populate
  const handleOpenSelfEdit = () => {
    if (!profileData) return;
    setSelfUsername(profileData.username);
    setSelfProdi(profileData.study_program || '');
    setSelfPass('');
    setShowSelfEditModal(true);
  };

  // Student update profile handler
  const handleUpdateSelfProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;

    if (!selfUsername.trim() || !selfProdi) {
      notify('Username dan Program studi harus terisi!', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. If password is set, update target auth password
      if (selfPass.trim()) {
        const { error: passErr } = await supabase.auth.updateUser({
          password: selfPass,
        });
        if (passErr) throw passErr;
      }

      // 2. Update student profile record
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          username: selfUsername.trim().toLowerCase(),
          study_program: selfProdi,
        })
        .eq('id', profileData.id);

      if (profErr) throw profErr;

      notify('Profil akun berhasil diperbarui!', 'success');
      setShowSelfEditModal(false);
      setProfileData({ ...profileData, username: selfUsername, study_program: selfProdi });
      await refreshMasterData();
    } catch (err: any) {
      notify('Gagal menyimpan profil: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Student test engine trigger
  const handleStartExam = async (meetingNumber: number) => {
    setLoading(true);
    try {
      // Fetch all questions for this meeting
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('meeting_number', meetingNumber)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        onNotify('Pertanyaan latihan di data ini masih kosong! Informasikan kepada dosen pembimbing Anda.', 'error');
        return;
      }

      // ORGANIZE RANDOMIZATION: Group by pattern order "Pola" (sort_order)
      const groupedQuestions: Record<number, Question[]> = {};
      data.forEach((q) => {
        const polaVal = q.sort_order || 1;
        if (!groupedQuestions[polaVal]) groupedQuestions[polaVal] = [];
        groupedQuestions[polaVal].push(q);
      });

      // Sample exactly 1 random question out of each pattern group key (Pola)
      const sampledList: Question[] = [];
      const distinctPolas = Object.keys(groupedQuestions)
        .map(Number)
        .sort((a, b) => a - b);

      distinctPolas.forEach((polaKey) => {
        const list = groupedQuestions[polaKey];
        const randomElement = list[Math.floor(Math.random() * list.length)];
        sampledList.push(randomElement);
      });

      setExamQuestions(sampledList);
      setActiveExamMeeting(meetingNumber);
      notify(`Ujian Latihan ${meetingNumber} siap dikerjakan! Timer aktif berjalan.`, 'info');
    } catch (err: any) {
      notify('Gagal memulai pengerjaan: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Custom handler inside dashboard
  const onNotify = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    notify(msg, type);
  };

  // Complete exam and submit scores back to Supabase
  const handleFinishExam = async (answers: Record<number, string | null>) => {
    if (!profileData) return;

    setLoading(true);
    try {
      let correctMatches = 0;
      examQuestions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) {
          correctMatches++;
        }
      });

      // Scale ratio to complete 990 points
      const scaledScore = Math.round((correctMatches / examQuestions.length) * 990);

      // Insert score details
      const scoreRow = {
        user_id: profileData.id,
        student_name: profileData.full_name,
        total_score: scaledScore,
        meeting_number: activeExamMeeting,
      };

      const { error } = await supabase.from('scores').insert([scoreRow]);
      if (error) throw error;

      notify(`Selesai! Skor evaluasi TOEIC Anda adalah: ${scaledScore} / 990.`, 'success');
      setActiveExamMeeting(null);
      setExamQuestions([]);
      await refreshMasterData();
    } catch (err: any) {
      notify('Gagal mengunggah skor evaluasi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E5E7EB] flex flex-col antialiased">
      <Notification notifications={notifications} onDismiss={handleDismissNotification} />

      {/* DYNAMIC HEADER NAVIGATION BAR */}
      <nav className="bg-[#0F0F12] border-b border-white/5 text-white py-4.5 px-6 shrink-0 relative z-50 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C2A35F] rounded flex items-center justify-center shadow-lg shadow-amber-500/10">
              <BookOpen className="w-5.5 h-5.5 text-[#0A0A0B] stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight select-none text-white leading-none block uppercase">
                TOEIC LMS
              </span>
            </div>
          </div>

          {/* Database Mode Switcher Option (Hanya terlihat oleh Admin/Dosen untuk mencegah kebingungan mahasiswa dan kecurangan data lokal) */}
          {profileData && profileData.role === 'admin' && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 select-none animate-fade-in">
              <button
                onClick={() => handleToggleDbMode('local')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  dbMode === 'local'
                    ? 'bg-[#C2A35F] text-[#0A0A0B] shadow'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Sandbox Lokal (Sandbox)
              </button>
              <button
                onClick={() => handleToggleDbMode('supabase')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  dbMode === 'supabase'
                    ? 'bg-[#C2A35F] text-[#0A0A0B] shadow'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Supabase Cloud (Online)
              </button>
            </div>
          )}

          {profileData && (
            <div className="flex items-center gap-2 sm:gap-4 select-none">
              <div className="hidden sm:flex items-center gap-2 bg-white/5 text-white/80 px-3.5 py-1.5 border border-white/5 rounded-lg text-xs font-semibold">
                <User className="w-3.5 h-3.5 text-[#C2A35F]" />
                <span>{profileData.full_name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-900/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition select-none cursor-pointer hover:scale-105 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* CONNECTION WARNING DIALOG fallbacks */}
      {supabaseErrorMsg && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[550] p-4 backdrop-blur-md">
          <div className="bg-[#0F0F12] border border-red-500/35 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden animate-modal">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 p-1">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">Supabase Belum Diaktivasi</h3>
            <p className="text-[10px] text-red-400 mb-4 uppercase tracking-widest font-black">
              Koneksi database awan terhambat
            </p>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              Koneksi ke alamat Supabase Cloud mengalami error atau skema tabel database di akun Anda belum dibuat.
              <br className="mb-2" />
              Ingin beralih ke <b>Sandbox Lokal</b> untuk menjalankan aplikasi dan evaluasi latihan dengan data simulasi yang lengkap?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSupabaseErrorMsg(null)}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-bold text-white/80 transition cursor-pointer text-xs"
              >
                Abaikan
              </button>
              <button
                type="button"
                onClick={() => {
                  setSupabaseErrorMsg(null);
                  handleToggleDbMode('local');
                }}
                className="flex-1 bg-[#C2A35F] hover:bg-[#C2A35F]/95 py-3 rounded-xl font-bold text-[#0A0A0B] transition cursor-pointer shadow-md text-xs uppercase tracking-wider font-extrabold border-0"
              >
                Aktifkan Mode Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE DISPLAY WINDOW VIEW SWITCHBOARD */}
      <main className="flex-1 py-8 overflow-x-hidden relative">
        {loading && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center select-none pointer-events-auto">
            <Loader2 className="w-12 h-12 text-[#C2A35F] animate-spin" />
            <p className="text-[#C2A35F] font-black tracking-widest text-xs uppercase mt-4 animate-pulse">
              Memproses data...
            </p>
          </div>
        )}

        {!profileData ? (
          /* AUTHENTICATION LAYOUT */
          <div className="max-w-md mx-auto mt-8 sm:mt-12 select-none px-4 flex flex-col">
            <div className="bg-[#0F0F12] rounded-3xl border border-white/5 p-8 sm:p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#C2A35F]" />

              {!isRegisterMode ? (
                /* LOGIN DIALOG */
                <div>
                  <div className="mb-8">
                    <div className="w-14 h-14 bg-[#C2A35F]/10 text-[#C2A35F] border border-[#C2A35F]/25 rounded-2xl flex items-center justify-center mx-auto mb-4 p-1 shadow-sm">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white leading-none">
                      Masuk Portal
                    </h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mt-2 leading-tight">
                      Pembelajaran Sistem LMS TOEIC
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4 text-xs font-bold uppercase text-white/40">
                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Username / Alamat Email</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 w-4.5 h-4.5 text-white/30" />
                        <input
                          type="text"
                          required
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          placeholder="Ketik username atau email..."
                          className="w-full pl-10 pr-4 py-3.5 bg-[#151518] border border-white/10 rounded-2xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                        />
                      </div>
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Kata Sandi (Password)</label>
                      <div className="relative flex items-center">
                        <LockIcon className="absolute left-3 w-4.5 h-4.5 text-white/30" />
                        <input
                          type="password"
                          required
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3.5 bg-[#151518] border border-white/10 rounded-2xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#C2A35F] hover:bg-[#C2A35F]/90 text-[#0A0A0B] active:scale-95 py-3.5 rounded-2xl font-black text-xs tracking-wider transition mt-2 select-none uppercase cursor-pointer border-0 shadow-md"
                    >
                      Masuk Sekarang
                    </button>
                  </form>

                  <div className="mt-8 border-t border-white/5 pt-6 text-sm text-white/40 font-semibold select-none leading-none">
                    Belum memiliki akun?{' '}
                    <button
                      onClick={() => setIsRegisterMode(true)}
                      className="text-[#C2A35F] font-extrabold hover:underline cursor-pointer bg-transparent border-0 inline p-0"
                    >
                      Daftar Akun Baru
                    </button>
                  </div>
                </div>
              ) : (
                /* REGISTRATION DIALOG */
                <div>
                  <div className="mb-6 text-white text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white leading-none">
                      Registrasi Akun
                    </h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mt-2 leading-tight">
                      Buat Akun Mahasiswa Baru
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4 text-xs font-bold uppercase text-white/40">
                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Username Unik</label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Contoh: agus123"
                        className="w-full px-4 py-3 bg-[#151518] border border-white/10 rounded-xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                      />
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Nama Lengkap Mahasiswa</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Nama dan gelar (bila perlu)..."
                        className="w-full px-4 py-3 bg-[#151518] border border-white/10 rounded-xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                      />
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Program Studi (Prodi)</label>
                      <select
                        value={regProdi}
                        required
                        onChange={(e) => setRegProdi(e.target.value)}
                        className="w-full px-4 py-3 bg-[#151518] border border-white/10 rounded-xl outline-none text-white text-sm font-semibold cursor-pointer focus:border-[#C2A35F] transition"
                      >
                        <option value="" className="bg-[#0F0F12] text-white">Pilih Program Studi</option>
                        <option value="S1 TTL-A" className="bg-[#0F0F12] text-white">S1 TTL-A</option>
                        <option value="S1 TTL-B" className="bg-[#0F0F12] text-white">S1 TTL-B</option>
                        <option value="S1 Keselamatan" className="bg-[#0F0F12] text-white">S1 Keselamatan</option>
                      </select>
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Alamat Email Aktif</label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Contoh: mhs@domain.com"
                        className="w-full px-4 py-3 bg-[#151518] border border-white/10 rounded-xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                      />
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="block ml-1">Pasword / Kata Sandi</label>
                      <input
                        type="password"
                        required
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        placeholder="Minimal 6 karakter..."
                        className="w-full px-4 py-3 bg-[#151518] border border-white/10 rounded-xl outline-none text-white text-sm font-semibold focus:border-[#C2A35F] transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#C2A35F] hover:bg-[#C2A35F]/95 active:scale-95 text-[#0A0A0B] py-3.5 rounded-xl font-black text-xs tracking-widest transition mt-4 uppercase border-0 cursor-pointer"
                    >
                      Daftar Sekarang
                    </button>
                  </form>

                  <div className="mt-8 border-t border-white/5 pt-6 text-sm text-white/40 font-semibold select-none leading-none">
                    Sudah memiliki akun?{' '}
                    <button
                      onClick={() => setIsRegisterMode(false)}
                      className="text-[#C2A35F] font-extrabold hover:underline cursor-pointer bg-transparent border-0 inline p-0"
                    >
                      Masuk Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeExamMeeting ? (
          /* ACTIVE EXAM TESTING PLAYER PANEL */
          <ExamInterface
            meetingNumber={activeExamMeeting}
            questions={examQuestions}
            onCancelExam={() => {
              if (window.confirm('Keluar dari pengerjaan soal? Seluruh kemajuan tes ini akan dibatalkan.')) {
                setActiveExamMeeting(null);
                setExamQuestions([]);
              }
            }}
            onFinishExam={handleFinishExam}
          />
        ) : profileData.role === 'admin' || profileData.username === 'admin' ? (
          /* INSTRUCTOR ADMINISTRATIVE AREA */
          <AdminDashboard
            students={allStudents}
            scores={scores}
            questions={questions}
            materials={materials}
            meetingLocks={meetingLocks}
            announcement={announcement}
            onRefreshData={refreshMasterData}
            onNotify={onNotify}
            loading={loading}
          />
        ) : (
          /* STANDARD STUDENTS INTERFACE */
          <StudentDashboard
            profile={profileData}
            meetingLocks={meetingLocks}
            materials={materials}
            scores={scores}
            onOpenSelfEdit={handleOpenSelfEdit}
            onStartExam={handleStartExam}
            onRefreshData={refreshMasterData}
            loading={loading}
          />
        )}
      </main>

      {/* STUDENT SELF EDIT PROFILE FORM INTERACTION */}
      {showSelfEditModal && profileData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F0F12] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 animate-modal relative">
            <h3 className="text-xl font-bold text-white mb-6 leading-tight flex items-center gap-2 select-none border-b border-white/5 pb-3">
              <Settings className="w-5 h-5 text-[#C2A35F] shrink-0" />
              Edit Profil Siswa
            </h3>

            <form onSubmit={handleUpdateSelfProfile} className="space-y-4 text-xs font-bold uppercase text-white/40">
              <div>
                <label className="block mb-1.5 ml-1 leading-none">Username Baru</label>
                <input
                  type="text"
                  required
                  value={selfUsername}
                  onChange={(e) => setSelfUsername(e.target.value)}
                  className="w-full p-3.5 bg-[#151518] border border-[#C2A35F]/20 rounded-2xl outline-none font-semibold text-white text-sm focus:border-[#C2A35F]"
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-1 leading-none">Program Studi (Prodi)</label>
                <select
                  value={selfProdi}
                  required
                  onChange={(e) => setSelfProdi(e.target.value)}
                  className="w-full p-3.5 bg-[#151518] border border-[#C2A35F]/20 rounded-2xl outline-none font-semibold text-white text-sm cursor-pointer focus:border-[#C2A35F]"
                >
                  <option value="" className="bg-[#0F0F12] text-white">Pilih Program Studi</option>
                  <option value="S1 TTL-A" className="bg-[#0F0F12] text-white">S1 TTL-A</option>
                  <option value="S1 TTL-B" className="bg-[#0F0F12] text-white">S1 TTL-B</option>
                  <option value="S1 Keselamatan" className="bg-[#0F0F12] text-white">S1 Keselamatan</option>
                </select>
              </div>

              <div className="border-t border-white/5 pt-4.5 mt-4 text-xs">
                <label className="block text-rose-400 mb-1.5 ml-1 leading-none">Kata Sandi Baru (Kosongkan bila tidak ganti)</label>
                <input
                  type="password"
                  value={selfPass}
                  onChange={(e) => setSelfPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3.5 bg-[#151518] border border-white/10 rounded-2xl outline-none text-white text-sm focus:border-rose-450"
                />
              </div>

              <div className="flex gap-3 pt-6 select-none">
                <button
                  type="button"
                  onClick={() => setShowSelfEditModal(false)}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-xl text-white/80 font-bold transition font-black uppercase text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#C2A35F] hover:bg-[#C2A35F]/90 py-3.5 rounded-xl font-bold text-[#0A0A0B] transition shadow-md uppercase border-0 text-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP ACADEMIC ANNOUNCEMENTS PRESENTATION (On student login) */}
      {showAnnModal && announcement && announcement.is_active && announcement.content.trim() !== '' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[450] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F0F12] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl p-8 sm:p-10 animate-modal relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#C2A35F]" />

            <div className="flex items-center gap-4 mb-6 select-none border-b border-white/5 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C2A35F]/10 text-[#C2A35F] flex items-center justify-center border border-[#C2A35F]/20 shrink-0">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">Pengumuman Akademik</h3>
                <p className="text-[#C2A35F] text-[10px] font-black uppercase tracking-widest leading-none mt-1">
                  Info Penting Dosen Pembimbing
                </p>
              </div>
            </div>

            <div className="passage-content mb-8 max-h-72 overflow-y-auto border-b border-white/5 pb-4 pr-1 scrollbar-thin">
              <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
            </div>

            <button
              onClick={() => setShowAnnModal(false)}
              className="w-full py-4 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 transition text-[#0A0A0B] rounded-2xl font-black text-base shadow-md uppercase tracking-wider cursor-pointer border-0 select-none animate-pulse"
            >
              Saya Mengerti & Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
