import React, { useState, useEffect, useRef } from 'react';
import { Clock, HelpCircle, ArrowLeft, ArrowRight, ShieldCheck, Headphones, BookOpen, Volume2, AlertTriangle } from 'lucide-react';
import { Question } from '../types';

interface ExamInterfaceProps {
  meetingNumber: number;
  questions: Question[];
  onFinishExam: (answers: Record<number, string | null>) => Promise<void>;
  onCancelExam: () => void;
}

export default function ExamInterface({
  meetingNumber,
  questions,
  onFinishExam,
  onCancelExam,
}: ExamInterfaceProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

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

  // Initialize timer
  useEffect(() => {
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
  }, []);

  const handleAutoSubmit = () => {
    onFinishExam(answers);
  };

  const currentQuestion = questions[currentIdx];

  const handleSelectAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: option }));
  };

  const handleNext = () => {
    if (isTransitioning) {
      setIsTransitioning(false);
      return;
    }

    if (currentIdx === questions.length - 1) {
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

  const handleConfirmFinalSubmit = () => {
    setShowConfirmSubmit(false);
    onFinishExam(answers);
  };

  // Humanize timer string
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours > 0 ? String(hours).padStart(2, '0') + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Quiz Window */}
      <div className="bg-[#0F0F12] rounded-3xl border border-white/5 overflow-hidden flex flex-col">
        {/* Testing Banner */}
        <div className="bg-[#121217] p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 select-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
              <Clock className="w-6 h-6 text-[#C2A35F]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-tight">
                Pengerjaan Soal Diacak
              </p>
              <h3 className="font-extrabold text-[#C2A35F] text-lg sm:text-xl">
                {meetingNumber === 8 || meetingNumber === 16 ? (
                  meetingNumber === 8 ? 'UTS - Midterm Exam' : 'UAS - Final Exam'
                ) : (
                  `Latihan Pertemuan ${meetingNumber}`
                )}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto shrink-0">
            <span
              className={`px-5 py-2 font-mono font-bold border text-lg rounded-2xl min-w-[110px] text-center tracking-widest block transition-all ${
                timeLeft < 60
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-white/5 text-[#C2A35F] border-[#C2A35F]/20 shadow-inner'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
            <p className="text-[9px] font-bold uppercase mt-1 tracking-wider text-[#C2A35F]">
              {timeLeft < 60 ? 'WAKTU HAMPIR HABIS!' : 'Sisa Waktu Anda'}
            </p>
          </div>
        </div>

        {/* Dynamic testing view */}
        <div className="p-6 sm:p-10 flex-1">
          {isTransitioning ? (
            /* TRANSITION SCREEN */
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
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
                <p className="font-semibold text-rose-400 text-xs text-center border-t border-white/5 pt-2">
                  PERINGATAN: Timer pengerjaan tetap berjalan di latar belakang!
                </p>
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

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(opt)}
                      type="button"
                      className={`flex items-center p-4.5 border rounded-2xl transition text-left cursor-pointer active:scale-[0.99] select-none ${
                        check
                          ? 'border-[#C2A35F] bg-[#C2A35F]/5 text-[#C2A35F] shadow-sm'
                          : 'border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl mr-4 font-black transition ${
                          check
                            ? 'bg-[#C2A35F] text-[#0A0A0B]'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {opt}
                      </span>
                      <span className={`font-semibold text-sm sm:text-base leading-snug ${check ? 'text-[#C2A35F]' : 'text-white/80'}`}>
                        {optionLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
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

            <button
              type="button"
              onClick={onCancelExam}
              className="px-4 py-2 hover:bg-rose-500/10 text-rose-450 text-xs font-semibold rounded-xl hover:text-rose-400 transition cursor-pointer"
            >
              Batalkan Tes
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3.5 bg-[#C2A35F] hover:bg-[#C2A35F]/90 active:scale-95 text-[#0A0A0B] shadow-md rounded-xl font-black text-xs uppercase tracking-widest transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              {currentIdx === questions.length - 1 && !isTransitioning ? (
                <>
                  Kirim Jawaban <ShieldCheck className="w-4 h-4 shrink-0 ml-1" />
                </>
              ) : (
                <>
                  {isTransitioning ? 'Mulai Sesi' : 'Lanjutkan'}{' '}
                  <ArrowRight className="w-4 h-4 shrink-0 ml-1" />
                </>
              )}
            </button>
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
                className="flex-1 bg-[#C2A35F] hover:bg-[#C2A35F]/90 py-3 rounded-xl font-bold text-[#0A0A0B] transition cursor-pointer shadow-md text-xs uppercase tracking-wider"
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
