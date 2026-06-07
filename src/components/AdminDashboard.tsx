import React, { useState, useEffect } from 'react';
import {
  Users, Award, BookOpenCheck, Settings2, Megaphone, Search, Filter, FileSpreadsheet,
  Trash2, Edit3, UserCheck, Plus, Sparkles, FileUp, X, Check, FileText, ArrowRight, RefreshCw, AudioLines, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile, Question, Score, Material, MeetingLock, Announcement } from '../types';
import { getToeicLevel } from '../utils/toeic';
import { parseDeletedScoreIds, stringifyDeletedScoreIds } from '../utils/softDelete';
import RichTextEditor from './RichTextEditor';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  students: Profile[];
  scores: Score[];
  questions: Question[];
  materials: Material[];
  meetingLocks: Record<number, boolean>;
  announcement: Announcement | null;
  onRefreshData: () => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  loading: boolean;
}

export default function AdminDashboard({
  students,
  scores,
  questions,
  materials,
  meetingLocks,
  announcement,
  onRefreshData,
  onNotify,
  loading,
}: AdminDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'students' | 'scores' | 'questions' | 'materials' | 'locks' | 'announcements'>('students');

  // Search/Filters
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [scoreSearch, setScoreSearch] = useState<string>('');
  const [scoreMeetingFilter, setScoreMeetingFilter] = useState<string>('all');
  const [qSearch, setQSearch] = useState<string>('');
  const [qMeetingFilter, setQMeetingFilter] = useState<string>('all');
  const [qCategoryFilter, setQCategoryFilter] = useState<string>('all');

  // Modals
  const [editingStudent, setEditingStudent] = useState<Profile | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [editingScoreValue, setEditingScoreValue] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [pasteJsonText, setPasteJsonText] = useState<string>('');
  const [scoreToDelete, setScoreToDelete] = useState<string | null>(null);

  // Form: Questions
  const [qEditId, setQEditId] = useState<string | null>(null);
  const [qMeeting, setQMeeting] = useState<number>(1);
  const [qPola, setQPola] = useState<number>(1);
  const [qPassage, setQPassage] = useState<string>('');
  const [qQuestion, setQQuestion] = useState<string>('');
  const [qOptA, setQOptA] = useState<string>('');
  const [qOptB, setQOptB] = useState<string>('');
  const [qOptC, setQOptC] = useState<string>('');
  const [qOptD, setQOptD] = useState<string>('');
  const [qCorrect, setQCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qCategory, setQCategory] = useState<'Listening' | 'Reading'>('Listening');
  const [qAudioUrl, setQAudioUrl] = useState<string>('');
  const [qImageUrl, setQImageUrl] = useState<string>('');
  const [qAudioSourceType, setQAudioSourceType] = useState<'url' | 'file'>('url');
  const [qImageSourceType, setQImageSourceType] = useState<'url' | 'file'>('url');

  // Form: Materials
  const [mEditId, setMEditId] = useState<string | null>(null);
  const [mMeeting, setMMeeting] = useState<number>(1);
  const [mTitle, setMTitle] = useState<string>('');
  const [mContent, setMContent] = useState<string>('');

  // Form: Announcement
  const [annContent, setAnnContent] = useState<string>('');
  const [annActive, setAnnActive] = useState<boolean>(false);

  // Auto-increment Pola helper
  useEffect(() => {
    // Dynamically calculate the next available Pattern (Pola/sort_order) for the selected meeting
    const filteredQs = questions.filter((q) => q.meeting_number === qMeeting && q.category === qCategory);
    if (filteredQs.length > 0) {
      const maxPola = Math.max(...filteredQs.map((q) => q.sort_order || 1));
      setQPola(maxPola + 1);
    } else {
      setQPola(1);
    }
  }, [qMeeting, qCategory, questions, qEditId]); // Don't disrupt when explicitly editing

  // Map announcements on load
  useEffect(() => {
    if (announcement) {
      setAnnContent(announcement.content);
      setAnnActive(announcement.is_active);
    }
  }, [announcement]);

  // Handle student info update
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editingStudent.username,
          full_name: editingStudent.full_name,
          email: editingStudent.email,
          study_program: editingStudent.study_program,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;
      onNotify('Profil mahasiswa berhasil diperbarui!');
      setEditingStudent(null);
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal memperbarui profil: ' + err.message, 'error');
    }
  };

  // Delete student profile
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Hapus mahasiswa ini secara permanen? Seluruh riwayat ujian mahasiswa juga akan ikut terhapus.')) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      onNotify('Mahasiswa berhasil dihapus!');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal menghapus: ' + err.message, 'error');
    }
  };

  // Override manual score
  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;

    const val = parseInt(editingScoreValue);
    if (isNaN(val) || val < 0 || val > 990) {
      onNotify('Masukkan nilai TOEIC yang valid antara 0 s.d 990!', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('scores').update({ total_score: val }).eq('id', editingScore.id);
      if (error) throw error;
      onNotify('Skor ujian berhasil diubah!');
      setEditingScore(null);
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal mengubah nilai: ' + err.message, 'error');
    }
  };

  // Delete score item
  const handleDeleteScore = async (id: string) => {
    try {
      // 1. Attempt database physical deletion (fails silently on some databases if RLS blocks deletes)
      await supabase.from('scores').delete().eq('id', id);

      // 2. Perform fallback soft-deletion via academic announcement metadata to bypass standard RLS limitations
      const currentIds = parseDeletedScoreIds(announcement?.content);
      if (!currentIds.includes(id)) {
        const updatedIds = [...currentIds, id];
        const updatedContent = stringifyDeletedScoreIds(announcement?.content, updatedIds);
        
        const { error: annErr } = await supabase
          .from('announcements')
          .update({ content: updatedContent })
          .eq('id', 1);
          
        if (annErr) throw annErr;
      }

      onNotify('Data nilai berhasil dihapus & jumlah percobaan mahasiswa telah di-reset!', 'success');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal menghapus nilai: ' + err.message, 'error');
    } finally {
      setScoreToDelete(null);
    }
  };

  // Toggle Meeting Access
  const handleToggleMeetingLock = async (no: number, val: boolean) => {
    try {
      const { error } = await supabase.from('meeting_locks').update({ is_open: val }).eq('meeting_number', no);
      if (error) throw error;
      onNotify(`Pertemuan ${no} kini ${val ? 'DIBUKA' : 'DITUTUP'} bagi mahasiswa.`);
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal mengubah akses: ' + err.message, 'error');
    }
  };

  // Material Save
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) return onNotify('Judul materi harus diisi!', 'error');
    if (!mContent.trim()) return onNotify('Isi konten materi tidak boleh kosong!', 'error');

    const payload = {
      title: mTitle.trim(),
      content: mContent,
      meeting_number: mMeeting,
    };

    try {
      if (mEditId) {
        const { error } = await supabase.from('materials').update(payload).eq('id', mEditId);
        if (error) throw error;
        onNotify('Materi berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('materials').insert([payload]);
        if (error) throw error;
        onNotify('Materi pembelajaran baru ditambahkan!');
      }
      resetMaterialForm();
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal menyimpan materi: ' + err.message, 'error');
    }
  };

  const resetMaterialForm = () => {
    setMEditId(null);
    setMTitle('');
    setMContent('');
    setMMeeting(1);
  };

  const handleEditMaterial = (m: Material) => {
    setMEditId(m.id);
    setMTitle(m.title);
    setMContent(m.content);
    setMMeeting(m.meeting_number);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm('Hapus materi pembelajaran ini?')) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      onNotify('Materi berhasil dihapus!');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      onNotify('File harus berupa audio (.mp3, .wav, .m4a, dll)!', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) { // 8MB limit
      onNotify('Ukuran file audio maksimal adalah 8MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQAudioUrl(event.target.result as string);
        onNotify('Audio berhasil diunggah secara lokal!', 'success');
      }
    };
    reader.onerror = () => {
      onNotify('Gagal membaca file audio.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('File harus berupa gambar (.jpg, .jpeg, .png, .webp, dll)!', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onNotify('Ukuran file gambar maksimal adalah 5MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQImageUrl(event.target.result as string);
        onNotify('Gambar berhasil diunggah secara lokal!', 'success');
      }
    };
    reader.onerror = () => {
      onNotify('Gagal membaca file gambar.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Add/Update single question manually
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qQuestion.trim()) return onNotify('Pertanyaan utama harus diisi!', 'error');
    if (!qOptA.trim() || !qOptB.trim()) return onNotify('Opsi jawaban A & B wajib diisi!', 'error');

    const payload = {
      question_text: qQuestion,
      passage_text: qPassage.trim() ? qPassage : null,
      option_a: qOptA.trim(),
      option_b: qOptB.trim(),
      option_c: qOptC.trim() || '',
      option_d: qOptD.trim() || '',
      correct_answer: qCorrect,
      category: qCategory,
      meeting_number: qMeeting,
      sort_order: qPola || 1, // Will assign the recommended incremented Pattern
      audio_url: qAudioUrl.trim() ? qAudioUrl.trim() : null,
      image_url: qImageUrl.trim() ? qImageUrl.trim() : null,
    };

    try {
      if (qEditId) {
        const { error } = await supabase.from('questions').update(payload).eq('id', qEditId);
        if (error) throw error;
        onNotify('Data soal berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('questions').insert([payload]);
        if (error) throw error;
        onNotify('Soal baru berhasil ditambahkan! Pola: ' + payload.sort_order);
      }
      resetQuestionForm();
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal menyimpan soal: ' + err.message, 'error');
    }
  };

  const handleEditQuestion = (q: Question) => {
    setQEditId(q.id);
    setQMeeting(q.meeting_number);
    setQPola(q.sort_order);
    setQCategory(q.category);
    setQPassage(q.passage_text || '');
    setQQuestion(q.question_text);
    setQOptA(q.option_a);
    setQOptB(q.option_b);
    setQOptC(q.option_c);
    setQOptD(q.option_d);
    setQCorrect(q.correct_answer);
    setQAudioUrl(q.audio_url || '');
    setQImageUrl(q.image_url || '');
    setQAudioSourceType(q.audio_url && q.audio_url.startsWith('data:') ? 'file' : 'url');
    setQImageSourceType(q.image_url && q.image_url.startsWith('data:') ? 'file' : 'url');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleCopyQuestionAsTemplate = (q: Question) => {
    setQEditId(null); // Clear ID to treat as new question
    setQMeeting(q.meeting_number);
    setQCategory(q.category);
    setQPassage(q.passage_text || '');
    setQQuestion(q.question_text + ' (Copy)');
    setQOptA(q.option_a);
    setQOptB(q.option_b);
    setQOptC(q.option_c);
    setQOptD(q.option_d);
    setQCorrect(q.correct_answer);
    setQAudioUrl(q.audio_url || '');
    setQImageUrl(q.image_url || '');
    setQAudioSourceType(q.audio_url && q.audio_url.startsWith('data:') ? 'file' : 'url');
    setQImageSourceType(q.image_url && q.image_url.startsWith('data:') ? 'file' : 'url');
    window.scrollTo({ top: 350, behavior: 'smooth' });
    onNotify('Kerangka soal disalin! Ubah detail lalu klik simpan untuk menyimpannya sebagai soal baru.', 'info');
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Hapus soal ini?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      onNotify('Soal dihapus!');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal: ' + err.message, 'error');
    }
  };

  const resetQuestionForm = () => {
    setQEditId(null);
    setQPassage('');
    setQQuestion('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrect('A');
    setQAudioUrl('');
    setQImageUrl('');
    setQAudioSourceType('url');
    setQImageSourceType('url');
    // Automatically triggers Pola recalculation
    setQMeeting((prev) => (prev));
  };

  // Bulk Paste JSON Questions
  const handleImportJSON = async () => {
    if (!pasteJsonText.trim()) return onNotify('Masukkan kode JSON!', 'error');

    try {
      const cleanJsonStr = pasteJsonText.replace(/[\u2018\u2019]/g, "'").trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Suku format JSON harus berupa Array / Daftar Objek!');
      }

      const itemsToInsert = parsed.map((item: any, idx: number) => ({
        question_text: item.question_text || 'Teks soal kosong',
        passage_text: item.passage_text || null,
        option_a: item.option_a || '',
        option_b: item.option_b || '',
        option_c: item.option_c || '',
        option_d: item.option_d || '',
        correct_answer: item.correct_answer || 'A',
        category: item.category || 'Reading',
        meeting_number: item.meeting_number || 1,
        sort_order: item.pola || item.sort_order || (idx + 1),
        audio_url: item.audio_url || null,
        image_url: item.image_url || null,
      }));

      const { error } = await supabase.from('questions').insert(itemsToInsert);
      if (error) throw error;

      onNotify(`Berhasil mengimpor ${itemsToInsert.length} soal ke database!`);
      setShowImportModal(false);
      setPasteJsonText('');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal mengimpor: ' + err.message, 'error');
    }
  };

  // Announcement Save
  const handleSaveAnnouncement = async () => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          content: annContent,
          is_active: annActive,
        })
        .eq('id', 1);

      if (error) throw error;
      onNotify('Pengumuman akademik berhasil diperbarui!');
      await onRefreshData();
    } catch (err: any) {
      onNotify('Gagal memperbarui pengumuman: ' + err.message, 'error');
    }
  };

  // Direct SheetJS Excel Report Generator
  const exportToExcel = () => {
    try {
      if (students.length === 0) {
        onNotify('Data mahasiswa kosong, tidak ada yang bisa diekspor.', 'error');
        return;
      }

      const rows = students.map((student) => {
        const studentScores = scores.filter((s) => s.user_id === student.id);
        const uniqueMeetings = new Set(studentScores.map((s) => s.meeting_number));
        const attendanceRate = (uniqueMeetings.size / 16) * 100;

        // UTS and UAS maximum score
        const utsData = studentScores
          .filter((s) => s.meeting_number === 8)
          .sort((a, b) => b.total_score - a.total_score)[0];
        const uasData = studentScores
          .filter((s) => s.meeting_number === 16)
          .sort((a, b) => b.total_score - a.total_score)[0];

        const utsScore = utsData ? utsData.total_score : 0;
        const uasScore = uasData ? uasData.total_score : 0;
        const hasUTS = !!utsData;
        const hasUAS = !!uasData;

        // Attendance Grade math rule
        let attendanceGrade = 0;
        if (!hasUTS || !hasUAS) {
          attendanceGrade = attendanceRate < 50 ? 0 : 50;
        } else {
          if (attendanceRate > 75) attendanceGrade = 90;
          else if (attendanceRate >= 50) attendanceGrade = 70;
          else attendanceGrade = 50;
        }

        // Assignment Average (non UTS/UAS)
        const assignments: number[] = [];
        for (let i = 1; i <= 16; i++) {
          if (i !== 8 && i !== 16) {
            const mtgScores = studentScores
              .filter((s) => s.meeting_number === i)
              .sort((a, b) => b.total_score - a.total_score);
            if (mtgScores.length > 0) assignments.push(mtgScores[0].total_score);
          }
        }
        const avgAssignment = assignments.length > 0 ? assignments.reduce((a, b) => a + b, 0) / assignments.length : 0;

        // Convert TOEIC Scores to scales of 0-100 to get Final grade
        const scaledAssignment = (avgAssignment / 990) * 100;
        const scaledUTS = (utsScore / 990) * 100;
        const scaledUAS = (uasScore / 990) * 100;

        // Weight percentages: Kehadiran (10%), Tugas (20%), UTS (30%), UAS (40%)
        const finalGrade = attendanceGrade * 0.1 + scaledAssignment * 0.2 + scaledUTS * 0.3 + scaledUAS * 0.4;

        // Final Grade classification
        let code = 'E';
        let numPointer = '0.00';
        let status = 'Tidak Lulus';
        let equivalent = '< 400';
        let desc = 'Wajib mengulang kuliah.';

        if (finalGrade >= 85) {
          code = 'A';
          numPointer = '4.00';
          status = 'Sangat Baik';
          equivalent = '750–990';
          desc = 'Sangat kompeten, siap sertifikasi global.';
        } else if (finalGrade >= 70) {
          code = 'B';
          numPointer = '3.00';
          status = 'Baik';
          equivalent = '600–745';
          desc = 'Kompeten, siap bersaing.';
        } else if (finalGrade >= 60) {
          code = 'C';
          numPointer = '2.00';
          status = 'Cukup';
          equivalent = '500–595';
          desc = 'Memenuhi kompetensi minimum.';
        } else if (finalGrade >= 50) {
          code = 'D';
          numPointer = '1.09';
          status = 'Kurang';
          equivalent = '400–495';
          desc = 'Kurang memahami materi, perlu peningkatan.';
        }

        return {
          'Nama Mahasiswa': student.full_name,
          'Username': student.username,
          'Program Studi': student.study_program || '-',
          'Kehadiran (%)': attendanceRate.toFixed(1) + '%',
          'Nilai Kehadiran': attendanceGrade,
          'Nilai Rata Tugas (TOEIC)': Math.round(avgAssignment),
          'Skor UTS (TOEIC)': utsScore,
          'Skor UAS (TOEIC)': uasScore,
          'NILAI AKHIR (IP)': finalGrade.toFixed(2),
          'Huruf': code,
          'SKS Bobot': numPointer,
          'Predikat': status,
          'Setara Skor': equivalent,
          'Rekomendasi': desc,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penilaian');

      // Set nice column widths
      XLSX.writeFile(workbook, 'Laporan_Rekapitulasi_TOEIC_LMS.xlsx');
      onNotify('Rekap nilai terunduh! Buka file Excel tersebut untuk melihat rapor.', 'success');
    } catch (err: any) {
      onNotify('Kesalahan ekspor SheetJS: ' + err.message, 'error');
    }
  };

  // Filter students based on keyword search
  const filteredStudents = students.filter((s) => {
    const key = studentSearch.toLowerCase();
    return s.full_name.toLowerCase().includes(key) || s.username.toLowerCase().includes(key);
  });

  // Filter scores based on meeting filter and search keyword
  const filteredScores = scores.filter((sc) => {
    const meetMatch = scoreMeetingFilter === 'all' || String(sc.meeting_number) === scoreMeetingFilter;
    const searchMatch = sc.student_name.toLowerCase().includes(scoreSearch.toLowerCase());
    return meetMatch && searchMatch;
  });

  return (
    <div className="space-y-8 select-none max-w-7xl mx-auto px-4 sm:px-6 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
            Dashboard Dosen
          </h2>
          <p className="text-white/40 font-bold text-sm tracking-wide">
            Manajemen Soal Ujian, Mahasiswa & Rekap Evaluasi Mengajar
          </p>
        </div>

        {/* Tab Switching controls */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto select-none no-scrollbar">
          {(['students', 'scores', 'questions', 'materials', 'locks', 'announcements'] as const).map((tab) => {
            const active = activeTab === tab;
            const labels = {
              students: 'Mahasiswa',
              scores: 'Skor Ujian',
              questions: 'Bank Soal',
              materials: 'Materi',
              locks: 'Kelas',
              announcements: 'Pengumuman',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  active
                    ? 'bg-[#C2A35F] text-[#0A0A0B] shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. STUDENTS TAB BOARD */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-[#0F0F12] p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2.5 bg-[#C2A35F]/15 text-[#C2A35F] rounded-xl">
                <Search className="w-5 h-5 flex-shrink-0" />
              </div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wide">
                Cari Mahasiswa
              </h4>
            </div>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Masukkan nama mahasiswa atau username..."
              className="w-full sm:w-80 p-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-[#C2A35F] text-white text-sm font-medium"
            />
          </div>

          <div className="bg-[#0F0F12] rounded-2xl border border-white/5 overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-[#121217] border-b border-white/5 text-white/40 font-bold text-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="p-5 font-black">Username</th>
                  <th className="p-5 font-black">Nama Lengkap</th>
                  <th className="p-5 font-black">Program Studi</th>
                  <th className="p-5 font-black text-center">Skor Tertinggi (UTS/UAS)</th>
                  <th className="p-5 font-black text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-white/80">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => {
                    const studentScores = scores.filter((sc) => sc.user_id === s.id);
                    const best = studentScores.length > 0 ? Math.max(...studentScores.map((sc) => sc.total_score)) : 0;

                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition">
                        <td className="p-5 text-white font-bold select-all">@{s.username}</td>
                        <td className="p-5 font-bold select-all text-white">{s.full_name}</td>
                        <td className="p-5 text-white/50">{s.study_program || 'Belum Set'}</td>
                        <td className="p-5 text-center">
                          <span className="text-sm font-black bg-white/5 px-3 py-1 rounded-lg block w-fit mx-auto border border-white/5 text-[#C2A35F]">
                            {best}
                          </span>
                        </td>
                        <td className="p-5 text-right flex justify-end gap-2.5">
                          <button
                            onClick={() => setEditingStudent(s)}
                            className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-[#C2A35F]/20 text-[#C2A35F] transition"
                            title="Edit Profil Mahasiswa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-2.5 bg-[#rose-500]/5 border border-[#rose-500]/10 rounded-xl hover:bg-rose-500/20 text-rose-400 transition"
                            title="Hapus Mahasiswa secara Permanen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center italic text-white/30 font-medium">
                      Mahasiswa tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. EXAM SCORES TABLE BOARD */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="bg-[#0F0F12] p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-[#C2A35F]/15 text-[#C2A35F] rounded-xl border border-[#C2A35F]/10">
                <Filter className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-[#C2A35F] text-xs uppercase tracking-wide">
                Filter Rekap Nilai
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select
                value={scoreMeetingFilter}
                onChange={(e) => setScoreMeetingFilter(e.target.value)}
                className="p-3 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-xs text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
              >
                <option value="all">Semua Pertemuan</option>
                {Array.from({ length: 16 }, (_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Pertemuan {idx + 1} {idx + 1 === 8 ? '(UTS)' : idx + 1 === 16 ? '(UAS)' : ''}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={scoreSearch}
                onChange={(e) => setScoreSearch(e.target.value)}
                placeholder="Cari nama mahasiswa..."
                className="p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-xs font-semibold text-white focus:border-[#C2A35F] w-full sm:w-48"
              />

              <button
                onClick={exportToExcel}
                className="bg-[#C2A35F] hover:bg-[#C2A35F]/90 text-[#0A0A0B] font-bold text-xs px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer select-none border-0 shrink-0 uppercase tracking-wider shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#0A0A0B] shrink-0" />
                Ekspor Rapor Nilai
              </button>
            </div>
          </div>

          <div className="bg-[#0F0F12] rounded-2xl border border-white/5 overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-[#121217] border-b border-white/10 text-white/40 font-bold text-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="p-5 font-black">Waktu Ujian</th>
                  <th className="p-5 font-black text-center">Prtm</th>
                  <th className="p-5 font-black">Mahasiswa</th>
                  <th className="p-5 font-black text-center">Hasil TOEIC & Level</th>
                  <th className="p-5 font-black text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-white/80">
                {filteredScores.length > 0 ? (
                  filteredScores.map((sc) => {
                    const dtStr = new Date(sc.created_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const level = getToeicLevel(sc.total_score);

                    return (
                      <tr key={sc.id} className="hover:bg-white/5 transition">
                        <td className="p-5 text-xs text-white/40 font-semibold">{dtStr}</td>
                        <td className="p-5 text-center font-bold text-[#C2A35F]">P{sc.meeting_number}</td>
                        <td className="p-5 font-bold select-all text-white">{sc.student_name}</td>
                        <td className="p-5 text-center">
                          <div className="flex items-center justify-center gap-2 select-none">
                            <span className="text-lg font-black text-white">{sc.total_score}</span>
                            <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-lg border border-[#C2A35F]/20 bg-[#C2A35F]/10 text-[#C2A35F]">
                              {level.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 text-right flex justify-end gap-2.5">
                          <button
                            onClick={() => {
                              setEditingScore(sc);
                              setEditingScoreValue(String(sc.total_score));
                            }}
                            className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-[#C2A35F]/20 text-[#C2A35F] transition cursor-pointer"
                            title="Edit / Override Nilai"
                          >
                            <Edit3 className="w-4 h-4 text-[#C2A35F]" />
                          </button>
                          <button
                            onClick={() => setScoreToDelete(sc.id)}
                            className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-rose-500/20 text-rose-450 transition cursor-pointer"
                            title="Hapus Skor"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center italic text-white/30 font-medium">
                      Belum ada pengerjaan ujian untuk filter terpilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. QUESTION BANK BOARD */}
      {activeTab === 'questions' && (
        <div className="space-y-8 text-white">
          {/* Question management form */}
          <div className="bg-[#0F0F12] p-6 sm:p-10 rounded-2xl border border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-tight leading-none flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#C2A35F] shrink-0" />
                  {qEditId ? 'Edit Soal Terpilih' : 'Tambah Soal Manual'}
                </h3>
                <p className="text-white/40 font-semibold text-xs">
                  {qEditId
                    ? 'Ubah isi soal yang Anda pilih lalu klik simpan untuk memperbarui.'
                    : 'Pertanyaan manual akan diatur sesuai pola kelompok latihan.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 font-bold text-xs text-[#C2A35F] px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm uppercase tracking-wider cursor-pointer select-none"
              >
                <FileUp className="w-4 h-4 text-[#C2A35F]" /> Impor JSON
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-6">
              {/* Categorization configs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                    Pertemuan (Meeting)
                  </label>
                  <select
                    value={qMeeting}
                    onChange={(e) => setQMeeting(parseInt(e.target.value))}
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
                  >
                    {Array.from({ length: 16 }, (_, idx) => (
                      <option key={idx + 1} value={idx + 1} className="bg-[#121217] text-white">
                        Pertemuan {idx + 1} {idx + 1 === 8 ? '(UTS)' : idx + 1 === 16 ? '(UAS)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                    Kategori Soal
                  </label>
                  <select
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value as 'Listening' | 'Reading')}
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
                  >
                    <option value="Listening" className="bg-[#121217] text-white">Listening Section</option>
                    <option value="Reading" className="bg-[#121217] text-white">Reading Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                    Pola Soal / Slot Ke-
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={qPola}
                      onChange={(e) => setQPola(parseInt(e.target.value) || 1)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-center font-bold text-sm w-24 text-[#C2A35F] focus:border-[#C2A35F]"
                    />
                    <div className="flex-1 flex items-center justify-start text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1 select-none leading-relaxed font-bold">
                      💡 Saran Pola Soal Berikutnya: {qPola}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                    Kunci Jawaban Correct
                  </label>
                  <select
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
                  >
                    <option value="A" className="bg-[#121217] text-white">Jawaban Terbaca A</option>
                    <option value="B" className="bg-[#121217] text-white">Jawaban Terbaca B</option>
                    <option value="C" className="bg-[#121217] text-white">Jawaban Terbaca C</option>
                    <option value="D" className="bg-[#121217] text-white">Jawaban Terbaca D</option>
                  </select>
                </div>
              </div>

              {/* Rich scripts editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/60">
                    Teks Bacaan (Passage / Context Script) - <i>Opsional</i>
                  </label>
                  <RichTextEditor
                    value={qPassage}
                    onChange={setQPassage}
                    placeholder="Wajib untuk Reading Comprehension / Opsional transkrip Listening."
                    height="h-32"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/60">
                    Teks Pertanyaan Utama <span className="text-rose-500">*</span>
                  </label>
                  <RichTextEditor
                    value={qQuestion}
                    onChange={setQQuestion}
                    placeholder="Tuliskan pertanyaan ujian TOEIC di sini..."
                    height="h-32"
                  />
                </div>
              </div>

              {/* Option input forms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-1 ml-1 tracking-widest">
                    Pilihan Opsi A
                  </label>
                  <input
                    type="text"
                    required
                    value={qOptA}
                    onChange={(e) => setQOptA(e.target.value)}
                    placeholder="Pilihan A"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white placeholder-white/20 focus:border-[#C2A35F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-1 ml-1 tracking-widest">
                    Pilihan Opsi B
                  </label>
                  <input
                    type="text"
                    required
                    value={qOptB}
                    onChange={(e) => setQOptB(e.target.value)}
                    placeholder="Pilihan B"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white placeholder-white/20 focus:border-[#C2A35F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-1 ml-1 tracking-widest">
                    Pilihan Opsi C
                  </label>
                  <input
                    type="text"
                    value={qOptC}
                    onChange={(e) => setQOptC(e.target.value)}
                    placeholder="Pilihan C (Opsional)"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white placeholder-white/20 focus:border-[#C2A35F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-1 ml-1 tracking-widest">
                    Pilihan Opsi D
                  </label>
                  <input
                    type="text"
                    value={qOptD}
                    onChange={(e) => setQOptD(e.target.value)}
                    placeholder="Pilihan D (Opsional)"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white placeholder-white/20 focus:border-[#C2A35F] outline-none"
                  />
                </div>
              </div>

              {/* Media assets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-4.5 rounded-2xl border border-white/10">
                {/* 1. AUDIO ELEMENT (Listening Only) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/40 tracking-widest leading-none">
                      <AudioLines className="w-3.5 h-3.5 text-[#C2A35F]" /> Audio (.mp3) - Listening Section
                    </label>
                    
                    {/* Source Toggle */}
                    <div className="flex bg-[#121217] p-0.5 rounded-lg border border-white/5 self-center">
                      <button
                        type="button"
                        onClick={() => setQAudioSourceType('url')}
                        className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer leading-none ${
                          qAudioSourceType === 'url'
                            ? 'bg-[#C2A35F] text-[#0A0A0B]'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        Tautan (URL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQAudioSourceType('file')}
                        className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer leading-none ${
                          qAudioSourceType === 'file'
                            ? 'bg-[#C2A35F] text-[#0A0A0B]'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        Unggah File
                      </button>
                    </div>
                  </div>

                  {qAudioSourceType === 'url' ? (
                    <input
                      type="url"
                      value={qAudioUrl}
                      onChange={(e) => setQAudioUrl(e.target.value)}
                      placeholder="https://example.com/audio.mp3"
                      className="w-full p-2.5 bg-[#121217] border border-white/10 text-white placeholder-white/30 rounded-xl text-xs focus:border-[#C2A35F] outline-none transition font-semibold"
                    />
                  ) : (
                    <div className="relative group border-2 border-dashed border-white/10 hover:border-[#C2A35F]/50 rounded-xl bg-[#121217] p-3 text-center transition">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FileUp className="w-5 h-5 text-white/40 group-hover:text-[#C2A35F]/80 transition" />
                        <p className="text-[10px] font-bold text-white/50 group-hover:text-white/80 select-none">
                          {qAudioUrl && qAudioUrl.startsWith('data:') 
                            ? '✓ Audio Terpilih (Klik untuk ganti)' 
                            : 'Pilih / Seret File Audio (.mp3, .wav)'}
                        </p>
                        <p className="text-[8px] text-white/30 select-none">Maksimal 8MB</p>
                      </div>
                    </div>
                  )}

                  {/* Live preview of sound */}
                  {qAudioUrl && (
                    <div className="bg-[#121217] border border-white/5 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-[#C2A35F] font-bold uppercase tracking-wider">Pratinjau Pemutar Audio:</span>
                        <button
                          type="button"
                          onClick={() => setQAudioUrl('')}
                          className="text-rose-450 hover:text-rose-400 font-bold uppercase transition text-[9px]"
                        >
                          Hapus Audio
                        </button>
                      </div>
                      <audio
                        src={qAudioUrl}
                        controls
                        className="w-full h-8 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 2. IMAGE ELEMENT */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/40 tracking-widest leading-none">
                      <ImageIcon className="w-3.5 h-3.5 text-[#C2A35F]" /> Gambar Ilustrasi (.jpg/.png)
                    </label>
                    
                    {/* Source Toggle */}
                    <div className="flex bg-[#121217] p-0.5 rounded-lg border border-white/5 self-center">
                      <button
                        type="button"
                        onClick={() => setQImageSourceType('url')}
                        className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer leading-none ${
                          qImageSourceType === 'url'
                            ? 'bg-[#C2A35F] text-[#0A0A0B]'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        Tautan (URL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQImageSourceType('file')}
                        className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition cursor-pointer leading-none ${
                          qImageSourceType === 'file'
                            ? 'bg-[#C2A35F] text-[#0A0A0B]'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        Unggah File
                      </button>
                    </div>
                  </div>

                  {qImageSourceType === 'url' ? (
                    <input
                      type="url"
                      value={qImageUrl}
                      onChange={(e) => setQImageUrl(e.target.value)}
                      placeholder="https://example.com/illustration.jpg"
                      className="w-full p-2.5 bg-[#121217] border border-white/10 text-white placeholder-white/30 rounded-xl text-xs focus:border-[#C2A35F] outline-none transition font-semibold"
                    />
                  ) : (
                    <div className="relative group border-2 border-dashed border-white/10 hover:border-[#C2A35F]/50 rounded-xl bg-[#121217] p-3 text-center transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FileUp className="w-5 h-5 text-white/40 group-hover:text-[#C2A35F]/80 transition" />
                        <p className="text-[10px] font-bold text-white/50 group-hover:text-white/80 select-none">
                          {qImageUrl && qImageUrl.startsWith('data:') 
                            ? '✓ Gambar Terpilih (Klik untuk ganti)' 
                            : 'Pilih / Seret Gambar (.jpg, .png, .webp)'}
                        </p>
                        <p className="text-[8px] text-white/30 select-none">Maksimal 5MB</p>
                      </div>
                    </div>
                  )}

                  {/* Live preview of image */}
                  {qImageUrl && (
                    <div className="bg-[#121217] border border-white/5 p-2 rounded-xl text-center space-y-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-[#C2A35F] font-bold uppercase tracking-wider text-left">Pratinjau Gambar:</span>
                        <button
                          type="button"
                          onClick={() => setQImageUrl('')}
                          className="text-rose-450 hover:text-rose-400 font-bold uppercase transition text-[9px]"
                        >
                          Hapus Gambar
                        </button>
                      </div>
                      <div className="flex justify-center border border-white/10 p-1.5 rounded-lg bg-black/60 max-w-full overflow-hidden">
                        <img
                          src={qImageUrl}
                          alt="Pratinjau Gambar"
                          className="max-h-24 object-contain rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form trigger buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#0A0A0B] shadow-md cursor-pointer border-0"
                >
                  {qEditId ? 'Simpan Perubahan Soal' : 'Simpan Soal Baru'}
                </button>
                {(qEditId || qQuestion || qOptA) && (
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-white/50 font-bold text-xs hover:text-white transition cursor-pointer border border-white/5"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
                  {/* Question List display table */}
          {(() => {
            const filteredQuestions = questions.filter((q) => {
              const matchesSearch = qSearch.trim() === '' || 
                q.question_text.toLowerCase().includes(qSearch.toLowerCase()) ||
                (q.passage_text && q.passage_text.toLowerCase().includes(qSearch.toLowerCase())) ||
                q.option_a.toLowerCase().includes(qSearch.toLowerCase()) ||
                q.option_b.toLowerCase().includes(qSearch.toLowerCase()) ||
                (q.option_c && q.option_c.toLowerCase().includes(qSearch.toLowerCase())) ||
                (q.option_d && q.option_d.toLowerCase().includes(qSearch.toLowerCase())) ||
                `pola ${q.sort_order}`.toLowerCase().includes(qSearch.toLowerCase()) ||
                q.sort_order.toString().includes(qSearch) ||
                `pertemuan ${q.meeting_number}`.toLowerCase().includes(qSearch.toLowerCase());

              const matchesMeeting = qMeetingFilter === 'all' || q.meeting_number.toString() === qMeetingFilter;
              const matchesCategory = qCategoryFilter === 'all' || q.category.toLowerCase() === qCategoryFilter.toLowerCase();

              return matchesSearch && matchesMeeting && matchesCategory;
            });

            return (
              <div className="space-y-4">
                {/* Search and Filters Controls */}
                <div className="bg-[#0F0F12] p-4 sm:p-5 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                      Cari Soal
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 cursor-text" />
                      <input
                        type="text"
                        value={qSearch}
                        onChange={(e) => setQSearch(e.target.value)}
                        placeholder="Cari teks soal, bacaan, pilihan, atau pola..."
                        className="w-full pl-10 pr-10 py-3 bg-[#121217] border border-white/10 rounded-xl outline-none text-xs text-white placeholder-white/30 focus:border-[#C2A35F] transition"
                      />
                      {qSearch && (
                        <button
                          type="button"
                          onClick={() => setQSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/15 rounded-lg text-white/50 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                      Filter Pertemuan
                    </label>
                    <select
                      value={qMeetingFilter}
                      onChange={(e) => setQMeetingFilter(e.target.value)}
                      className="w-full p-3 bg-[#121217] border border-white/10 rounded-xl outline-none font-bold text-xs text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
                    >
                      <option value="all" className="bg-[#121217] text-white">Semua Pertemuan</option>
                      {Array.from({ length: 16 }, (_, idx) => (
                        <option key={idx + 1} value={idx + 1} className="bg-[#121217] text-white">
                          Pertemuan {idx + 1} {idx + 1 === 8 ? '(UTS)' : idx + 1 === 16 ? '(UAS)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1 tracking-widest leading-none">
                      Filter Kategori
                    </label>
                    <select
                      value={qCategoryFilter}
                      onChange={(e) => setQCategoryFilter(e.target.value)}
                      className="w-full p-3 bg-[#121217] border border-white/10 rounded-xl outline-none font-bold text-xs text-[#C2A35F] cursor-pointer focus:border-[#C2A35F]"
                    >
                      <option value="all" className="bg-[#121217] text-white">Semua Kategori</option>
                      <option value="Listening" className="bg-[#121217] text-white">Listening Section</option>
                      <option value="Reading" className="bg-[#121217] text-white">Reading Section</option>
                    </select>
                  </div>
                </div>

                <h3 className="font-extrabold text-lg flex items-center gap-2 text-white select-none">
                  <FileText className="w-5 h-5 text-[#C2A35F] shrink-0" /> Kode Soal & Pola yang Tersimpan (Total:{' '}
                  {filteredQuestions.length === questions.length ? questions.length : `${filteredQuestions.length} dari ${questions.length}`})
                </h3>

                <div className="bg-[#0F0F12] rounded-2xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left min-w-[750px]">
                    <thead className="bg-[#121217] border-b border-white/10 text-white/40 font-bold text-xs uppercase tracking-wider select-none">
                      <tr>
                        <th className="p-5 font-black text-center w-24">Pola Ke</th>
                        <th className="p-5 font-black text-center w-24">Pertm</th>
                        <th className="p-5 font-black w-32">Kategori</th>
                        <th className="p-5 font-black">Isi Pertanyaan (Teks Murni)</th>
                        <th className="p-5 font-black text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-semibold text-white/80">
                      {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((q) => {
                          const textStripped = q.question_text.replace(/<[^>]*>?/gm, '').substring(0, 60) + '...';
                          const isListening = q.category === 'Listening';

                          return (
                            <tr key={q.id} className="hover:bg-white/5 transition duration-150">
                              <td className="p-5 text-center font-black">
                                <span className="text-[11px] font-bold bg-[#C2A35F]/15 text-[#C2A35F] px-2.5 py-1 rounded-lg border border-[#C2A35F]/20 select-none">
                                  Pola {q.sort_order}
                                </span>
                              </td>
                              <td className="p-5 text-center font-black text-white/50 select-none">#{q.meeting_number}</td>
                              <td className="p-5 font-bold">
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg border tracking-wider select-none ${
                                    isListening
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                  }`}
                                >
                                  {q.category}
                                </span>
                              </td>
                              <td className="p-5 text-xs text-white/60 max-w-sm truncate select-all">{textStripped}</td>
                              <td className="p-5 text-right flex justify-end gap-2 shrink-0">
                                <button
                                  onClick={() => handleEditQuestion(q)}
                                  className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-[#C2A35F]/20 text-[#C2A35F] transition shrink-0 cursor-pointer"
                                  title="Edit Data Soal"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleCopyQuestionAsTemplate(q)}
                                  className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-purple-500/20 text-purple-300 transition shrink-0 cursor-pointer"
                                  title="Salin Kerangka sebagai Baru"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-rose-500/20 text-rose-450 transition shrink-0 cursor-pointer"
                                  title="Hapus Soal"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center italic text-white/30 font-medium">
                            Tidak ditemukan hasil pencarian soal yang sesuai.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}     </div>
        </div>
      )}

      {/* 4. MATERIALS TAB BOARD */}
      {activeTab === 'materials' && (
        <div className="space-y-8">
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
              {mEditId ? 'Edit Materi Pembelajaran' : 'Buat Materi Baru'}
            </h3>

            <form onSubmit={handleSaveMaterial} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">
                    Tujuan Pertemuan
                  </label>
                  <select
                    value={mMeeting}
                    onChange={(e) => setMMeeting(parseInt(e.target.value))}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-emerald-800"
                  >
                    {Array.from({ length: 16 }, (_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Pertemuan {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">
                    Judul Singkat Materi Pembelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    placeholder="Misal: Part 1 - Photographs Tips and Strategies"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 text-slate-800">
                <label className="block text-xs font-bold text-slate-600">Isi Konten Materi / Handout Pembelajaran</label>
                <RichTextEditor value={mContent} onChange={setMContent} placeholder="Tuliskan materi ajar..." height="h-64" />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-800 hover:bg-emerald-950 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md cursor-pointer border-0"
                >
                  {mEditId ? 'Update Materi' : 'Simpan Materi'}
                </button>
                {(mEditId || mTitle || mContent) && (
                  <button
                    type="button"
                    onClick={resetMaterialForm}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 font-bold text-xs hover:text-slate-700 transition cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold text-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="p-5 font-black text-center w-24">Pertm</th>
                  <th className="p-5 font-black">Judul Handout Materi</th>
                  <th className="p-5 font-black text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {materials.length > 0 ? (
                  materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-5 text-center font-black text-slate-500">#{m.meeting_number}</td>
                      <td className="p-5 font-bold">{m.title}</td>
                      <td className="p-5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleEditMaterial(m)}
                          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition"
                          title="Edit Materi"
                        >
                          <Edit3 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Hapus Materi"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-10 text-center italic text-slate-400 font-medium">
                      Materi belum ditambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MEETING SWITCHES LOCK BOARD */}
      {activeTab === 'locks' && (
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-slate-600 shrink-0" /> Pengaturan Akses Kelas
            </h3>
            <p className="text-slate-400 font-semibold text-xs leading-relaxed">
              Membuka sakelar membuka akses ke kuis pertemuan & materi ajar tersebut di dasbor mahasiswa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5 pt-4">
            {Array.from({ length: 16 }, (_, idx) => {
              const num = idx + 1;
              const open = meetingLocks[num] || false;
              const isExam = num === 8 || num === 16;

              return (
                <div
                  key={num}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-slate-200/50 transition-all shadow-sm"
                >
                  <div className="space-y-0.5 select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                      P{num}
                    </span>
                    <strong className="text-sm block font-bold text-slate-800 leading-tight">
                      {isExam ? (num === 8 ? 'UTS Board' : 'UAS Board') : 'Ujian Latihan'}
                    </strong>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={open}
                      onChange={(e) => handleToggleMeetingLock(num, e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. SYSTEM ANNOUNCEMENTS BOARD */}
      {activeTab === 'announcements' && (
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-emerald-800 shrink-0" /> Set Pengumuman Pop-up Akademik
              </h3>
              <p className="text-slate-400 font-semibold text-xs leading-relaxed">
                Pengumuman di bawah akan ditampilkan sebagai pop-up dialog saat mahasiswa membuka portal dasbor mereka.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 p-2 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-wider leading-none">
                Pop-up Aktif:
              </span>
              <label className="switch shrink-0">
                <input type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-slate-800">
              <label className="block text-xs font-bold text-slate-600">Isi Pengumuman Akademik</label>
              <RichTextEditor value={annContent} onChange={setAnnContent} placeholder="Tulis pengumuman..." height="h-44" />
            </div>

            <button
              onClick={handleSaveAnnouncement}
              className="w-full py-4 bg-emerald-800 hover:bg-emerald-950 text-white rounded-2xl font-black text-base shadow-lg hover:shadow-xl transition select-none tracking-widest uppercase cursor-pointer border-0"
            >
              Simpan Pengumuman Popup
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL MODALS IN ACTION */}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-modal relative">
            <h3 className="text-2xl font-black text-slate-800 mb-6 leading-tight">Edit Data Mahasiswa</h3>
            <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs font-bold uppercase text-slate-400">
              <div>
                <label className="block mb-1.5 ml-1 leading-none">Username</label>
                <input
                  type="text"
                  required
                  value={editingStudent.username}
                  onChange={(e) => setEditingStudent({ ...editingStudent, username: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 text-sm focus:border-emerald-800"
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-1 leading-none">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingStudent.full_name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 text-sm focus:border-emerald-800"
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-1 leading-none">Email Registrasi</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 text-sm focus:border-emerald-800"
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-1 leading-none">Program Studi (Prodi)</label>
                <select
                  value={editingStudent.study_program || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, study_program: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 text-sm cursor-pointer focus:border-emerald-800"
                >
                  <option value="">Pilih Program Studi</option>
                  <option value="S1 TTL-A">S1 TTL-A</option>
                  <option value="S1 TTL-B">S1 TTL-B</option>
                  <option value="S1 Keselamatan">S1 Keselamatan</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-4.5 rounded-xl text-slate-500 font-bold transition font-black uppercase text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-800 hover:bg-emerald-950 py-4.5 rounded-xl font-black text-white transition shadow-md uppercase border-0 text-xs cursor-pointer"
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MANUAL SCORE OVERRIDE */}
      {editingScore && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-modal relative">
            <h3 className="text-xl font-black text-slate-800 mb-6 leading-tight">Ubah Skor Mahasiswa</h3>
            <form onSubmit={handleUpdateScore} className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-55 select-none space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Nama Mahasiswa</span>
                <p className="font-extrabold text-sm text-slate-700">{editingScore.student_name}</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-55 select-none space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Pertemuan Kecepatan</span>
                <p className="font-extrabold text-sm text-slate-700">Pertemuan {editingScore.meeting_number}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1 tracking-wider leading-none">Skor TOEIC Baru (0-990)</label>
                <input
                  type="number"
                  min="0"
                  max="990"
                  required
                  value={editingScoreValue}
                  onChange={(e) => setEditingScoreValue(e.target.value)}
                  className="w-full text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-800 font-black text-3xl shrink-0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold text-slate-550 transition uppercase text-xs text-slate-500 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 py-3 rounded-xl font-black text-white transition shadow-md uppercase border-0 text-xs cursor-pointer"
                >
                  Update Skor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT PASTE JSON MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-modal flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-2xl font-black text-slate-800 leading-none">Tempel Kode JSON</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold mb-3">
              Silakan salin dan tempel array list pertanyaan berformat JSON di bawah ini untuk impor massal:
            </p>
            <textarea
              value={pasteJsonText}
              onChange={(e) => setPasteJsonText(e.target.value)}
              placeholder={`[\n  {\n    "question_text": "Choose the best synonym...",\n    "option_a": "High",\n    "option_b": "Low",\n    "meeting_number": 1,\n    "pola": 1,\n    "category": "Reading"\n  }\n]`}
              className="w-full flex-1 min-h-[220px] p-4 bg-slate-50 hover:bg-slate-55 border-2 border-slate-200/80 rounded-2xl outline-none font-mono text-xs focus:border-emerald-800 select-all"
            />
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setPasteJsonText('');
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 transition uppercase text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                className="flex-1 bg-emerald-800 hover:bg-emerald-900 py-3 rounded-xl font-bold text-white transition shadow-md uppercase tracking-wider text-xs border-0"
              >
                Impor Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE SCORE MODAL */}
      {scoreToDelete && (() => {
        const scoreDetails = scores.find(s => s.id === scoreToDelete);
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[600] p-4 backdrop-blur-md">
            <div className="bg-[#121217] text-white w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8 animate-modal relative text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-500/15 border border-rose-500/30 mb-4">
                <Trash2 className="h-7 w-7 text-rose-500 animate-pulse" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Konfirmasi Hapus Skor</h3>
              
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus data nilai mahasiswa berikut?
              </p>

              {scoreDetails && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Nama Mahasiswa:</span>
                    <span className="font-bold text-white">{scoreDetails.student_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Pertemuan:</span>
                    <span className="font-bold text-[#C2A35F]">Pertemuan {scoreDetails.meeting_number}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Skor Ujian:</span>
                    <span className="font-black text-rose-400">{scoreDetails.total_score} pts</span>
                  </div>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 text-left">
                <p className="text-[11px] text-amber-300 font-medium leading-relaxed">
                  ⚠️ <strong className="text-amber-200">Perhatian:</strong> Tindakan ini juga akan otomatis men-reset batasan maksimal <strong className="text-amber-200">3x percobaan</strong> pengerjaan mahasiswa terkait, sehingga mahasiswa dapat kembali melakukan ujian pengulangan.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScoreToDelete(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 font-bold text-xs hover:text-white transition cursor-pointer border border-white/5 uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => scoreToDelete && handleDeleteScore(scoreToDelete)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-95 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md cursor-pointer border-0 transition"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
