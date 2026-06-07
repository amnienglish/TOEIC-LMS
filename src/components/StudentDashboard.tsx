import React, { useState } from 'react';
import { LayoutGrid, Info, BookOpen, CheckCircle, Lock, Award, Settings, BookOpenCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { Profile, Score, Material, MeetingLock } from '../types';
import { getToeicLevel } from '../utils/toeic';

interface StudentDashboardProps {
  profile: Profile;
  meetingLocks: Record<number, boolean>;
  materials: Material[];
  scores: Score[];
  onOpenSelfEdit: () => void;
  onStartExam: (meetingNumber: number) => void;
  onRefreshData: () => Promise<void>;
  loading: boolean;
}

export default function StudentDashboard({
  profile,
  meetingLocks,
  materials,
  scores,
  onOpenSelfEdit,
  onStartExam,
  onRefreshData,
  loading,
}: StudentDashboardProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Group materials by meeting
  const materialsByMeeting = React.useMemo(() => {
    const map = new Map<number, Material>();
    materials.forEach((m) => map.set(m.meeting_number, m));
    return map;
  }, [materials]);

  // Aggregate scores by meeting
  const scoresByMeeting = React.useMemo(() => {
    const bestScores: Record<number, number> = {};
    const attempts: Record<number, number> = {};

    scores.forEach((s) => {
      const meet = s.meeting_number;
      if (bestScores[meet] === undefined || s.total_score > bestScores[meet]) {
        bestScores[meet] = s.total_score;
      }
      attempts[meet] = (attempts[meet] || 0) + 1;
    });

    return { bestScores, attempts };
  }, [scores]);

  const { bestScores, attempts } = scoresByMeeting;

  // Track read material IDs from localStorage
  const [readMaterials, setReadMaterials] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    materials.forEach((m) => {
      const read = localStorage.getItem(`read_mat_${profile.id}_${m.id}`) === 'true';
      if (read) map[m.id] = true;
    });
    return map;
  });

  const handleOpenMaterial = (mat: Material) => {
    setSelectedMaterial(mat);
  };

  const handleFinishReading = (matId: string) => {
    localStorage.setItem(`read_mat_${profile.id}_${matId}`, 'true');
    setReadMaterials((prev) => ({ ...prev, [matId]: true }));
    setSelectedMaterial(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Hero card */}
      <div className="p-8 md:p-12 rounded-3xl text-white relative overflow-hidden bg-gradient-to-r from-[#121217] to-[#1a1a24] border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-1 tracking-tight text-white">
              Halo, {profile.full_name.split(' ')[0]}!
            </h2>
            <p className="text-base sm:text-lg font-semibold opacity-90 mb-2 mt-1">
              <span className="bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/5 select-none text-[#C2A35F] text-xs font-bold uppercase tracking-wider">
                Prodi: {profile.study_program || 'Belum Set'}
              </span>
            </p>
            <p className="text-xs sm:text-sm font-semibold opacity-50 text-white/70 tracking-wide mt-2">
              Username: <span className="underline select-all">@{profile.username}</span>
            </p>
          </div>
          <button
            onClick={onOpenSelfEdit}
            className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 px-5 py-3 rounded-xl text-xs font-bold tracking-wider transition flex items-center gap-2 text-[#C2A35F] cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4 text-[#C2A35F]" /> PENGATURAN PROFIL
          </button>
        </div>
        {/* Absolute logo element in backdrop */}
        <BookOpenCheck className="absolute right-[-40px] bottom-[-40px] w-56 h-56 sm:w-64 sm:h-64 opacity-[0.03] rotate-12 pointer-events-none text-white" />
      </div>

      {/* Grid Pertemuan */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xl sm:text-2xl flex items-center gap-3 text-white">
            <span className="p-2.5 bg-[#C2A35F]/10 text-[#C2A35F] rounded-xl border border-[#C2A35F]/20">
              <LayoutGrid className="w-6 h-6" />
            </span>
            Daftar Pertemuan & Latihan
          </h3>
          <button
            onClick={onRefreshData}
            title="Sikronkan data"
            disabled={loading}
            className={`p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/70 transition cursor-pointer hover:text-white ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend Panel */}
        <div className="bg-[#0F0F12] text-white/80 border border-white/5 p-5 rounded-2xl text-sm flex flex-col md:flex-row items-start gap-4">
          <div className="p-2 bg-[#C2A35F]/10 text-[#C2A35F] rounded-xl border border-[#C2A35F]/20 shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-base tracking-tight text-[#C2A35F]">
              Aturan Latihan & Persyaratan Belajar
            </p>
            <p className="opacity-80 leading-relaxed font-medium text-white/75 mt-1">
              Sistem membatasi pengerjaan masing-masing latihan maksimal{' '}
              <strong className="text-white">3 KALI COBA</strong>, sedangkan untuk ujian UTS (Pertemuan 8) & UAS (Pertemuan 16) hanya diberikan{' '}
              <strong className="text-white">1 KALI COBA</strong>. Soal akan diacak secara otomatis.
              <br className="mb-1" />
              Apabila terdapat ikon buku kuning (<BookOpen className="w-4 h-4 inline mx-0.5 text-[#C2A35F] shrink-0" />), Anda{' '}
              <strong className="text-[#C2A35F]">wajib membuka dan membaca materi pembelajaran</strong> terlebih dahulu sebelum latihan dapat diakses.
            </p>
          </div>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 16 }, (_, idx) => {
            const num = idx + 1;
            const isOpen = meetingLocks[num] || false;
            const isExam = num === 8 || num === 16;
            const mat = materialsByMeeting.get(num);
            const isRead = mat ? !!readMaterials[mat.id] : true; // No material means always technically read

            const attemptCount = attempts[num] || 0;
            const maxAttempts = isExam ? 1 : 3;
            const isLockedByAdmin = !isOpen;
            const isLockedByRead = mat && !isRead;
            const isAttemptRemaining = attemptCount < maxAttempts;

            const isLocked = isLockedByAdmin || isLockedByRead || !isAttemptRemaining;
            const bestScore = bestScoreOfMeeting(num);

            function bestScoreOfMeeting(mNum: number) {
              return bestScores[mNum];
            }

            return (
              <div
                key={num}
                className="relative flex flex-col justify-between p-5 bg-[#0F0F12] border border-white/5 rounded-2xl transition duration-200 hover:border-[#C2A35F]/50 group min-h-[220px]"
              >
                {/* Material Link Indicator inside Card */}
                {mat && (
                  <div className="absolute top-4 right-4 z-20">
                    {isRead ? (
                      <button
                        onClick={() => handleOpenMaterial(mat)}
                        title="Buka Materi Pembelajaran (Sudah Dibaca)"
                        className="p-1.5 bg-[#C2A35F]/10 text-[#C2A35F] hover:bg-[#C2A35F]/15 border border-[#C2A35F]/20 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-[#C2A35F]" />
                        <span>Materi</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenMaterial(mat)}
                        title="WAJIB: Baca Materi Pembelajaran Terlebih Dahulu"
                        className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-semibold animate-pulse"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Baca</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Card Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                      isLocked
                        ? 'bg-white/5 text-white/20 border-white/5'
                        : isExam
                        ? 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                        : 'bg-[#C2A35F]/10 text-[#C2A35F] border-[#C2A35F]/20'
                    }`}
                  >
                    {isLockedByAdmin ? (
                      <Lock className="w-5 h-5" />
                    ) : isExam ? (
                      <Award className="w-5 h-5" />
                    ) : (
                      <BookOpen className="w-5 h-5" />
                    )}
                  </div>

                  {/* Meeting and title info */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-widest text-[#C2A35F] uppercase">
                      Pertemuan {num}
                    </span>
                    <h4 className="font-bold text-white text-sm leading-tight group-hover:text-[#C2A35F] transition-colors">
                      {isExam ? (num === 8 ? 'UTS - Midterm Exam' : 'UAS - Final Exam') : 'TOEIC Practice Test'}
                    </h4>
                  </div>
                </div>

                {/* Attempt trackers */}
                <div className="pt-4 border-t border-white/5 space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/40">Pengerjaan:</span>
                    <span
                      className={`font-semibold ${
                        isAttemptRemaining ? 'text-white/80' : 'text-rose-400 font-extrabold'
                      }`}
                    >
                      {attemptCount} / {maxAttempts}
                    </span>
                  </div>

                  {/* Best Score Badge if exists */}
                  {bestScore !== undefined ? (
                    <div
                      className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1 border border-white/5 bg-[#C2A35F]/5 text-[#C2A35F]"
                    >
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 shrink-0" />
                        SKOR TERTINGGI:
                      </span>
                      <span className="font-black text-xs">{bestScore}</span>
                    </div>
                  ) : null}

                  {/* Primary Action Button */}
                  {isLockedByAdmin ? (
                    <div className="w-full text-center py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 bg-white/5 border border-white/5 rounded-xl">
                      Akses Terkunci
                    </div>
                  ) : isLockedByRead ? (
                    <button
                      onClick={() => handleOpenMaterial(mat!)}
                      className="w-full text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition rounded-xl cursor-pointer"
                    >
                      Harus Baca Materi
                    </button>
                  ) : !isAttemptRemaining ? (
                    <div className="w-full text-center py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl select-none">
                      Batas Percobaan Habis
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartExam(num)}
                      className="w-full text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0B] bg-[#C2A35F] hover:bg-[#C2A35F]/90 rounded-lg cursor-pointer transition active:scale-95"
                    >
                      Mulai Kerjakan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Riwayat & Legend Panduan Skor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Riwayat Skor */}
        <div className="lg:col-span-2 bg-[#0F0F12] border border-white/5 px-6 py-8 sm:p-8 rounded-3xl space-y-6">
          <h3 className="font-extrabold text-xl flex items-center gap-3 text-white">
            <span className="p-2 bg-[#C2A35F]/15 text-[#C2A35F] rounded-xl border border-[#C2A35F]/20">
              <Award className="w-5 h-5" />
            </span>
            Riwayat Skor Anda
          </h3>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {scores.length > 0 ? (
              scores.map((sc) => {
                const level = getToeicLevel(sc.total_score);
                const isExam = sc.meeting_number === 8 || sc.meeting_number === 16;
                return (
                  <div
                    key={sc.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-[#151518] border border-white/5 rounded-2xl hover:border-[#C2A35F]/20 transition duration-150"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          {isExam
                            ? sc.meeting_number === 8
                              ? 'Ujian Tengah Semester'
                              : 'Ujian Akhir Semester'
                            : `Latihan Pertemuan ${sc.meeting_number}`}
                        </span>
                        <span className="text-[9px] text-[#C2A35F] font-semibold">
                          • {new Date(sc.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/80 border border-white/10 px-2.5 py-0.5 rounded-lg">
                          Meeting {sc.meeting_number}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg border border-[#C2A35F]/25 bg-[#C2A35F]/10 text-[#C2A35F]">
                          {level.label} Level
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                      <span className="text-3xl font-black text-white tracking-tight block">
                        {sc.total_score}
                      </span>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight">
                        {level.full}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 text-white/30 bg-white/5">
                <LayoutGrid className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-sm font-semibold">Belum ada riwayat hasil pengerjaan soal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend Panel */}
        <div className="bg-[#0F0F12] border border-white/5 p-6 sm:p-8 rounded-3xl">
          <h4 className="font-extrabold text-xs uppercase tracking-widest text-[#C2A35F] mb-6">
            Panduan Skor & Estimasi Level TOEIC
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4.5 p-3.5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-yellow-300">
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 shrink-0 shadow-sm animate-pulse" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-yellow-250">785 - 990 (Gold)</p>
                <p className="text-[10px] text-white/40 font-medium">Professional Working Proficiency</p>
              </div>
            </div>

            <div className="flex items-center gap-4.5 p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-blue-300">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0 shadow-sm animate-pulse" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-blue-250">605 - 780 (Blue)</p>
                <p className="text-[10px] text-white/40 font-medium">Advanced Working Proficiency</p>
              </div>
            </div>

            <div className="flex items-center gap-4.5 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-emerald-250">405 - 600 (Green)</p>
                <p className="text-[10px] text-white/40 font-medium">General Working Proficiency</p>
              </div>
            </div>

            <div className="flex items-center gap-4.5 p-3.5 rounded-2xl bg-[#C2A35F]/5 border border-[#C2A35F]/20 text-[#C2A35F]">
              <span className="w-3.5 h-3.5 rounded-full bg-[#C2A35F] shrink-0 shadow-sm" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-[#C2A35F]">255 - 400 (Brown)</p>
                <p className="text-[10px] text-white/40 font-medium">Elementary Proficiency</p>
              </div>
            </div>

            <div className="flex items-center gap-4.5 p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-orange-300">
              <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shrink-0 shadow-sm" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-orange-250">10 - 250 (Orange)</p>
                <p className="text-[10px] text-white/40 font-medium">Basic Proficiency Only</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* READING MATERIAL DIALOG MODAL */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F0F12] border border-white/10 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl p-6 sm:p-10 animate-modal relative flex flex-col text-white">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <div>
                <p className="text-xs font-bold uppercase text-[#C2A35F] tracking-widest mb-1.5">
                  Materi Pembelajaran (Pertemuan {selectedMaterial.meeting_number})
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {selectedMaterial.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="text-white/40 hover:text-white hover:bg-white/5 p-2 rounded-xl transition shrink-0 cursor-pointer text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Content box with rich text support */}
            <div className="overflow-y-auto flex-1 px-2 py-4 passage-content no-scrollbar">
              <div dangerouslySetInnerHTML={{ __html: selectedMaterial.content }} />
            </div>

            {/* Read completion toggle */}
            <div className="pt-6 border-t border-white/5 mt-4">
              <button
                type="button"
                onClick={() => handleFinishReading(selectedMaterial.id)}
                className="w-full py-3.5 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 transition text-[#0A0A0B] rounded-xl font-black text-sm uppercase tracking-wider cursor-pointer"
              >
                Selesai membaca, Buka Akses Latihan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
