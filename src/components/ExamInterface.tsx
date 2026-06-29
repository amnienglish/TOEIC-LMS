import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, ArrowLeft, ArrowRight, ShieldCheck, Headphones, BookOpen, Volume2, 
  AlertTriangle, Award, CheckCircle2, XCircle, ArrowLeftRight, LogOut 
} from 'lucide-react';
import { Question, EvaluationSettings } from '../types';

interface ExamInterfaceProps {
  meetingNumber: number;
  questions: Question[];
  onFinishExam: (answers: Record<number, string | null>) => Promise<number | null>;
  onCancelExam: () => void;
  onExitExam: () => void;
  evalSettings: EvaluationSettings;
}

export default function ExamInterface({
  meetingNumber,
  questions,
  onFinishExam,
  onCancelExam,
  onExitExam,
  evalSettings,
}: ExamInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  // Post-submit review states
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [isSubmittingLoader, setIsSubmittingLoader] = useState<boolean>(false);

  // Dynamic state for timer
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    let seconds = 0;
    questions.forEach((q) => {
      // 27s for listening, 45s for reading
      seconds += q.category.includes('Listening') ? 27 : 45;
    });
    return Math.max(seconds, 120); // Mimic at least 2 minutes
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and handle timer
  useEffect(() => {
    // If exam is completed or we entered review mode, stop timer
    if (isSubmitted || isReviewMode) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto submit when timeout
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, isReviewMode]);

  const handleAutoSubmit = async () => {
    setIsSubmittingLoader(true);
    try {
      let matchesCount = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) {
          matchesCount++;
        }
      });
      setCorrectCount(matchesCount);

      const score = await onFinishExam(answers);
      if (score !== null) {
        setSubmittedScore(score);
        setIsSubmitted(true);
      } else {
        onExitExam();
      }
    } catch (e) {
      console.error(e);
      onExitExam();
    } finally {
      setIsSubmittingLoader(false);
    }
  };

  const currentQuestion = questions[currentIdx];

  const handleSelectAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    // Lock response when validation is active (such as review mode or per_soal explanation is open)
    const canChange = !isReviewMode && !(evalSettings.show_explanation && evalSettings.reveal_mode === 'per_soal' && answers[currentIdx] !== undefined);
    if (!canChange) return;

    setAnswers((prev) => ({ ...prev, [currentIdx]: option }));
  };

  const handleNext = () => {
    if (isTransitioning) {
      setIsTransitioning(false);
      return;
    }

    if (currentIdx === questions.length - 1) {
      if (isReviewMode) {
        onExitExam();
        return;
      }
      // Prompt final submit confirmation modal
      setShowConfirmSubmit(true);
      return;
    }

    // Evaluate transition breaks
    const nextQ = questions[currentIdx + 1];
    if (currentQuestion.category !== nextQ.category) {
      setIsTransitioning(true);
      setCurrentIdx(currentIdx + 1);
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (isTransitioning) {
      setIsTransitioning(false);
      // Stay on same target questions but cancel screen
      return;
    }

    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleConfirmFinalSubmit = async () => {
    setShowConfirmSubmit(false);
    setIsSubmittingLoader(true);
    try {
      let matchesCount = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) {
          matchesCount++;
        }
      });
      setCorrectCount(matchesCount);

      const score = await onFinishExam(answers);
      if (score !== null) {
        setSubmittedScore(score);
        setIsSubmitted(true);
      } else {
        onExitExam();
      }
    } catch (err) {
      console.error(err);
      onExitExam();
    } finally {
      setIsSubmittingLoader(false);
    }
  };

  // Humanize timer string
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours > 0 ? String(hours).padStart(2, '0') + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Explanation status flags
  const showValidation = isReviewMode || (
    evalSettings.show_explanation && 
    evalSettings.reveal_mode === 'per_soal' && 
    answers[currentIdx] !== undefined
  );

  // Render Post-Exam results page first when submitted and not reviewing
  if (isSubmitted && !isReviewMode) {
    const percentage = Math.round((correctCount / questions.length) * 100) || 0;
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-fade-in select-none">
        <div className="bg-[#0F0F12] border border-white/5 shadow-2xl rounded-3xl p-8 text-center relative overflow-hidden">
          {/* Glowing Accents */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#C2A35F] to-yellow-600" />
          
          <div className="w-20 h-20 bg-[#C2A35F]/10 border border-[#C2A35F]/20 text-[#C2A35F] rounded-full flex items-center justify-center mx-auto mb-6 p-1">
            <Award className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1 leading-tight">Evaluasi Selesai!</h2>
          <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mb-6">
            Skor Berhasil Disimpan Di Cloud
          </p>

          <div className="p-6 bg-white/5 border border-white/5 rounded-2.5xl mb-8 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Skor TOEIC Anda</p>
              <div className="text-5xl font-black text-white tracking-tighter">
                {submittedScore} <span className="text-xs font-semibold text-white/40">/ 990</span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-white/40 font-bold uppercase mb-1">Akurasi Soal</p>
                <p className="text-white font-extrabold text-sm">{correctCount} / {questions.length} Benar</p>
              </div>
              <div>
                <p className="text-white/40 font-bold uppercase mb-1">Persentase</p>
                <p className="text-white font-extrabold text-sm">{percentage}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {evalSettings.show_explanation ? (
              <button
                type="button"
                onClick={() => setIsReviewMode(true)}
                className="w-full bg-[#C2A35F] hover:bg-[#C2A35F]/95 py-3.5 rounded-2xl font-black text-[#0A0A0B] transition cursor-pointer text-xs uppercase tracking-widest border-0 shadow-lg"
              >
                Lihat Pembahasan & Soal
              </button>
            ) : (
              <div className="text-[11px] text-white/40 font-semibold italic bg-white/5 p-3 rounded-xl mb-2">
                ✍️ Pembahasan kunci jawaban sedang dinonaktifkan oleh administrator.
              </div>
            )}

            <button
              type="button"
              onClick={onExitExam}
              className="w-full bg-white/5 hover:bg-white/10 py-3.5 rounded-2xl font-bold text-white/80 transition cursor-pointer text-xs uppercase tracking-widest border border-white/10"
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Quiz Window */}
      <div className="bg-[#0F0F12] rounded-3xl border border-white/5 overflow-hidden flex flex-col relative">
        {/* Loading Spinner during submit */}
        {isSubmittingLoader && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-[600] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-[#C2A35F] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-bold text-sm uppercase tracking-wider">Menyimpan lembar evaluasi siswa...</p>
          </div>
        )}

        {/* Testing Header Banner */}
        <div className="bg-[#121217] p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 select-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
              {isReviewMode ? (
                <BookOpen className="w-6 h-6 text-emerald-400" />
              ) : (
                <Clock className="w-6 h-6 text-[#C2A35F]" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-tight">
                {isReviewMode ? 'Penjelasan & Pembahasan Kunci Jawaban' : 'Pengerjaan Soal Diacak'}
              </p>
              <h3 className={`font-extrabold text-lg sm:text-xl ${isReviewMode ? 'text-emerald-400' : 'text-[#C2A35F]'}`}>
                {meetingNumber === 8 || meetingNumber === 16 ? (
                  meetingNumber === 8 ? 'UTS - Midterm Exam' : 'UAS - Final Exam'
                ) : (
                  `Latihan Pertemuan ${meetingNumber}`
                )}
                {isReviewMode && ' — Hasil'}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto shrink-0">
            {isReviewMode ? (
              <div className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-lg rounded-2xl text-center min-w-[110px] tracking-widest">
                SKOR: {submittedScore}
              </div>
            ) : (
              <span
                className={`px-5 py-2 font-mono font-bold border text-lg rounded-2xl min-w-[110px] text-center tracking-widest block transition-all ${
                  timeLeft < 60
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                    : 'bg-white/5 text-[#C2A35F] border-[#C2A35F]/20 shadow-inner'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            )}
            <p className="text-[9px] font-bold uppercase mt-1 tracking-wider text-white/40">
              {isReviewMode ? 'Skor Ujian Latihan' : timeLeft < 60 ? 'WAKTU HAMPIR HABIS!' : 'Sisa Waktu Anda'}
            </p>
          </div>
        </div>

        {/* Dynamic testing view */}
        <div className="p-6 sm:p-10 flex-1">
          {isTransitioning ? (
            /* TRANSITION SCREEN */
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mb-6 shadow-inner animate-bounce">
                {currentQuestion.category.includes('Listening') ? (
                  <Headphones className="w-10 h-10" />
                ) : (
                  <BookOpen className="w-10 h-10" />
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                Pergantian Sesi Baru
              </h2>
              <p className="text-base font-black text-rose-450 uppercase tracking-widest mb-6">
                SESI {currentQuestion.category.toUpperCase()}
              </p>
              <div className="max-w-md mx-auto p-5 bg-white/5 border border-white/10 rounded-2xl select-none text-sm text-white/70 space-y-3 leading-relaxed">
                <p>
                  Sesi soal sebelumnya telah selesai. Anda akan dialihkan untuk masuk ke sesi{' '}
                  <strong className="text-white font-extrabold">{currentQuestion.category}</strong>.
                </p>
                {!isReviewMode && (
                  <p className="font-semibold text-rose-400 text-xs text-center border-t border-white/5 pt-2">
                    PERINGATAN: Timer pengerjaan tetap berjalan di latar belakang!
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsTransitioning(false)}
                className="mt-8 px-10 py-3.5 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 text-[#0A0A0B] rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md cursor-pointer"
              >
                Mulai Sesi Ini
              </button>
            </div>
          ) : (
            /* ACTIVE QUESTION VIEW */
            <div className="space-y-6">
              {/* Question progress and category label */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 select-none">
                <span className="text-[10px] font-bold px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/60 uppercase tracking-wider">
                  Soal {currentIdx + 1} / {questions.length}
                </span>
                
                {/* Question Navigator Drawer in Review mode */}
                {isReviewMode && (
                  <div className="flex gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-sm px-1.5 py-1 bg-[#151518] border border-white/5 rounded-xl scrollbar-none">
                    {questions.map((_, qIdx) => {
                      const isCorrect = answers[qIdx] === questions[qIdx].correct_answer;
                      const hasAns = answers[qIdx] !== undefined && answers[qIdx] !== null;
                      return (
                        <button
                          key={qIdx}
                          onClick={() => setCurrentIdx(qIdx)}
                          className={`w-6 h-6 rounded-md text-[9px] font-extrabold select-none transition border flex items-center justify-center cursor-pointer shrink-0 ${
                            qIdx === currentIdx
                              ? 'bg-[#C2A35F] border-[#C2A35F] text-[#0A0A0B] scale-110 shadow-lg'
                              : hasAns
                                ? isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-450'
                                : 'bg-white/5 border-white/10 text-white/40'
                          }`}
                        >
                          {qIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                )}

                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-wider ${
                    currentQuestion.category === 'Listening'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  }`}
                >
                  Sesi: {currentQuestion.category}
                </span>
              </div>

              {/* PDF/Passage header description if Reading passage exists */}
              {currentQuestion.passage_text && (
                <div className="bg-[#151518] border border-[#C2A35F]/20 p-6 sm:p-8 rounded-2xl max-h-96 overflow-y-auto text-white tracking-wide leading-relaxed scrollbar-thin">
                  <div
                    className="passage-content font-serif text-white/90 max-w-none text-sm sm:text-base whitespace-pre-wrap leading-loose"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.passage_text }}
                  />
                </div>
              )}

              {/* Listening Audio Player Area */}
              {currentQuestion.audio_url && (
                <div className="bg-[#151518] border border-white/5 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C2A35F] text-[#0A0A0B] flex items-center justify-center animate-pulse">
                      <Volume2 className="w-4 h-4 text-[#0A0A0B]" />
                    </div>
                    <span className="text-xs font-semibold text-[#C2A35F] select-none">
                      Listening Audio Player — Klik Play jika tidak berputar otomatis
                    </span>
                  </div>
                  <audio
                    src={currentQuestion.audio_url}
                    controls
                    autoPlay
                    className="w-full h-11 pointer-events-auto rounded-lg focus:outline-none"
                  />
                </div>
              )}

              {/* Question Illustration Image */}
              {currentQuestion.image_url && (
                <div className="flex justify-center bg-white/5 border border-white/5 rounded-2xl p-2 max-w-lg mx-auto overflow-hidden">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question visual helper"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-auto object-contain rounded-xl hover:scale-105 transition duration-300"
                  />
                </div>
              )}

              {/* Text Question Body */}
              <div className="mt-4">
                <div
                  className="text-base sm:text-lg font-bold text-white leading-relaxed max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
                />
              </div>

              {/* Selecting MC/Option Grid */}
              <div className="grid grid-cols-1 gap-3.5 pt-4">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const check = answers[currentIdx] === opt;
                  const labelKey = `option_${opt.toLowerCase()}` as keyof Question;
                  const optionLabel = (currentQuestion[labelKey] as string) || '';

                  // Evaluate if we are showing correctness highlights
                  const isCorrectOpt = opt === currentQuestion.correct_answer;
                  const isWrongChosen = check && !isCorrectOpt;

                  let buttonStyle = 'border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10 text-white/80';
                  let badgeStyle = 'bg-white/5 text-white/40';
                  let textStyle = 'text-white/80';

                  if (showValidation) {
                    if (isCorrectOpt) {
                      buttonStyle = 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400 font-bold';
                      badgeStyle = 'bg-emerald-500 text-slate-950 font-black';
                      textStyle = 'text-emerald-400';
                    } else if (isWrongChosen) {
                      buttonStyle = 'border-rose-500/50 bg-rose-500/5 text-rose-450 font-bold opacity-90';
                      badgeStyle = 'bg-rose-500 text-white font-black';
                      textStyle = 'text-rose-450';
                    } else {
                      buttonStyle = 'border-white/5 bg-white/5 opacity-40 hover:border-white/5 hover:bg-white/5 cursor-not-allowed';
                      badgeStyle = 'bg-white/5 text-white/20';
                      textStyle = 'text-white/40';
                    }
                  } else {
                    // Normal, interactive test state
                    if (check) {
                      buttonStyle = 'border-[#C2A35F] bg-[#C2A35F]/5 text-[#C2A35F] shadow-sm font-bold';
                      badgeStyle = 'bg-[#C2A35F] text-[#0A0A0B]';
                      textStyle = 'text-[#C2A35F]';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(opt)}
                      type="button"
                      disabled={showValidation}
                      className={`flex items-center p-4.5 border rounded-2xl transition text-left select-none outline-none ${buttonStyle} ${
                        !showValidation && 'active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl mr-4 font-black transition ${badgeStyle}`}
                      >
                        {opt}
                      </span>
                      <span className={`font-semibold text-sm sm:text-base leading-snug ${textStyle}`}>
                        {optionLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic explanations cards rendering */}
              {showValidation && (
                <div className="mt-8 p-6 bg-[#121217] border border-white/5 rounded-2.5xl space-y-4 animate-fade-in select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      {answers[currentIdx] === currentQuestion.correct_answer ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Benar!
                        </span>
                      ) : answers[currentIdx] ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" /> Kurang Tepat
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1 bg-white/5 text-white/50 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          Tidak Dijawab
                        </span>
                      )}
                      <h4 className="font-extrabold text-xs sm:text-sm text-white">Pembahasan & Penjelasan Soal</h4>
                    </div>

                    <span className="text-[10px] sm:text-[11px] font-black font-mono text-[#C2A35F] uppercase bg-[#C2A35F]/10 px-2.5 py-1 rounded-lg border border-[#C2A35F]/20 leading-none">
                      Kunci Jawaban Unggulan: {currentQuestion.correct_answer}
                    </span>
                  </div>

                  {currentQuestion.explanation && currentQuestion.explanation.trim() !== '' ? (
                    <div 
                      className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans prose prose-invert prose-sm"
                      dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                    />
                  ) : (
                    <p className="text-xs text-white/40 font-semibold italic">
                      Dosen Pembimbing belum melampirkan keterangan pembahasan tertulis untuk soal slot ini.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nav buttons footer */}
          <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between select-none">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIdx === 0 && !isTransitioning}
              className="px-6 py-3 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-xl font-bold text-white/70 text-xs uppercase tracking-widest cursor-pointer flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Kembali
            </button>

            {isReviewMode ? (
              <button
                type="button"
                onClick={onExitExam}
                className="px-4 py-2 hover:bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Keluar Review
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancelExam}
                className="px-4 py-2 hover:bg-rose-500/10 text-rose-450 text-xs font-semibold rounded-xl hover:text-rose-400 transition cursor-pointer"
              >
                Batalkan Tes
              </button>
            )}

            {currentIdx === questions.length - 1 && !isTransitioning ? (
              isReviewMode ? (
                <button
                  type="button"
                  onClick={onExitExam}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md rounded-xl font-black text-xs uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shrink-0 border-0"
                >
                  Selesai Review <ShieldCheck className="w-4 h-4 shrink-0 ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 text-[#0A0A0B] shadow-md rounded-xl font-black text-xs uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shrink-0 border-0"
                >
                  Kirim Jawaban <ShieldCheck className="w-4 h-4 shrink-0 ml-1" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3.5 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 text-[#0A0A0B] shadow-md rounded-xl font-black text-xs uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shrink-0 border-0"
              >
                {isTransitioning ? 'Mulai Sesi' : 'Lanjutkan'}{' '}
                <ArrowRight className="w-4 h-4 shrink-0 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION SUBMISSION DIALOG */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F0F12] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-8 text-center animate-modal">
            <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 p-1">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
              Kirim Jawaban Anda?
            </h3>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Apakah Anda yakin ingin menyelesaikan tes ini? Pastikan semua soal telah terjawab dengan benar. Setelah dikirim, jawaban tidak dapat diubah.
            </p>

            {/* Answer completion summary */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4.5 mb-6 text-xs text-white/50 font-bold flex justify-around">
              <div>
                Terjawab:{' '}
                <span className="text-white font-extrabold ml-1">
                  {Object.values(answers).filter(Boolean).length}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div>
                Total Soal:{' '}
                <span className="text-white font-extrabold ml-1">{questions.length}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-bold text-white/80 transition cursor-pointer text-xs"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                className="flex-1 bg-[#C2A35F] hover:bg-[#C2A35F]/90 py-3 rounded-xl font-bold text-[#0A0A0B] transition cursor-pointer shadow-md text-xs uppercase tracking-wider border-0"
              >
                Ya, Selesai & Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
