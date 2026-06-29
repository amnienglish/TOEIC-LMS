import { createClient } from '@supabase/supabase-js';

const SB_URL = "https://nzrrqahkwggtqlviuoth.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cnJxYWhrd2dndHFsdml1b3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjA0NjEsImV4cCI6MjA4NzkzNjQ2MX0.a2GglJ311PEGV7kWk7vNBU1FCHlUlurgEddxlwqA0FQ";

// Real Supabase Instantiation
export const realSupabase = createClient(SB_URL, SB_KEY);

// Helper for Database Mode
export function getDbMode(): 'supabase' | 'local' {
  const mode = localStorage.getItem('toeic_lms_db_mode');
  if (mode === 'local') return 'local';
  return 'supabase';
}

export function setDbMode(mode: 'supabase' | 'local') {
  localStorage.setItem('toeic_lms_db_mode', mode);
  window.dispatchEvent(new Event('db-mode-changed'));
}

// Global hook registry to notify UI of remote database reachability warnings
export function triggerFallbackNotice(message: string) {
  window.dispatchEvent(new CustomEvent('supabase-error', { detail: { message } }));
}

// PRE-SEEDED MOCK DATASETS
const DEFAULT_MEETING_LOCKS = Array.from({ length: 16 }, (_, idx) => {
  const num = idx + 1;
  // By default, open Meetings 1, 2, 3, UTS (8), UAS (16)
  const isDefaultOpen = [1, 2, 3, 8, 16].includes(num);
  return { meeting_number: num, is_open: isDefaultOpen };
});

const DEFAULT_ANNOUNCEMENT = {
  id: 1,
  content: `<p><b>Selamat datang mahasiswa di portal pembelajaran mandiri TOEIC LMS!</b></p>
  <p>Di sini Anda dapat mengakses materi pembelajaran interaktif pada bagian menu materi pertemuan, serta melakukan latihan soal yang diacak dengan pola terstandarisasi.</p>
  <p>Silakan berkonsultasi dengan Dosen Pembimbing apabila ada latihan yang belum terbuka aksesnya.</p>`,
  is_active: true
};

const DEFAULT_EVAL_SETTINGS_ROW = {
  id: 2,
  content: '{"show_explanation":true,"reveal_mode":"setelah_selesai"}',
  is_active: true
};

const DEFAULT_MATERIALS = [
  {
    id: "mat-1",
    meeting_number: 1,
    title: "TOEIC Listening Part 1 - Photographs Strategy",
    content: `<h3><b>Strategi Menjawab Pertanyaan Berdasarkan Foto (Photographs)</b></h3>
    <p>Pada bagian pertama dari tes Listening TOEIC, Anda akan melihat beberapa foto di dalam lembar ujian dan mendengarkan 4 pilihan pernyataan singkat tentang foto tersebut.</p>
    <p><b>Langkah-langkah Kunci dalam Penguasaan Materi:</b></p>
    <ul>
      <li><b>Analisis Foto Sebelum Mendengar:</b> Perhatikan objek, posisi orang, aksi, dan latar belakang foto secara cepat dalam waktu 5 detik pertama.</li>
      <li><b>Fokus Pada Kata Kerja & Kata Benda:</b> Kebanyakan jawaban benar mendeskripsikan secara tepat aksi yang sedang berlangsung atau keberadaan suatu objek di lokasi foto.</li>
      <li><b>Waspadai Distraksi Bunyi:</b> Hati-hati terhadap homofon (kata dengan bunyi sama tapi makna berbeda) yang sering dipakai sebagai jebakan maut pada pilihan salah.</li>
    </ul>`
  },
  {
    id: "mat-2",
    meeting_number: 2,
    title: "TOEIC Reading Part 5 - Incomplete Sentences Grammar & Vocabulary",
    content: `<h3><b>Menguasai Tata Bahasa & Kosakata di Bagian Pertanyaan Rumpang</b></h3>
    <p>Bagian 5 dari tes Reading menguji pemahaman Anda tentang tata bahasa Inggris bisnis dasar dan penempatan kosakata yang tepat.</p>
    <p><b>Topik Utama Tata Bahasa yang Sering Keluar:</b></p>
    <ol>
      <li><b>Word Forms (Bentuk Kata):</b> Memisahkan noun, verb, adjective, dan adverb (contoh: <i>decision</i>, <i>decide</i>, <i>decisive</i>, <i>decisively</i>).</li>
      <li><b>Prepositions & Conjunctions:</b> Menggunakan kata penghubung seperti <i>although</i>, <i>despite</i>, <i>because of</i>, dan <i>due to</i> secara tepat.</li>
      <li><b>Tenses & Subject-Verb Agreement:</b> Menyesuaikan waktu kegiatan dan keselarasan subjek dengan kata kerjanya.</li>
    </ol>`
  },
  {
    id: "mat-8",
    meeting_number: 8,
    title: "Panduan Ujian Tengah Semester (UTS) TOEIC Latihan",
    content: `<h3><b>Panduan Belajar untuk Menghadapi Ujian Tengah Semester</b></h3>
    <p>Ujian Tengah Semester ini dirancang untuk mensimulasikan lingkungan tes TOEIC yang sesungguhnya. Soal-soal UTS mencakup materi dari Pertemuan 1 hingga Pertemuan 7.</p>
    <p><b>Catatan Penting:</b> Peraturan ujian UTS membatasi pengerjaan Anda maksimal <b>1 KALI COBA</b>. Pastikan koneksi internet stabil dan cari tempat tenang sebelum memulai ujian.</p>`
  },
  {
    id: "mat-16",
    meeting_number: 16,
    title: "Panduan Ujian Akhir Semester (UAS) Simulasi Lengkap",
    content: `<h3><b>Simulasi Evaluasi Akhir (UAS) TOEIC 990</b></h3>
    <p>Ujian Akhir Semester adalah puncak evaluasi pembelajaran Anda pada portal ini. Uji kemampuan listening dan reading Anda secara menyeluruh.</p>
    <p><b>Ketentuan UAS:</b> Hanya diberikan 1 kali pengerjaan. Skor Anda akan langsung tercatat sebagai nilai akhir yang dapat dipantau oleh dosen pembimbing.</p>`
  }
];

const DEFAULT_QUESTIONS = [
  // Meeting 1 - Listening
  {
    id: "q-101",
    question_text: "<b>Where is the marketing department office located?</b>",
    passage_text: null,
    option_a: "On the ground floor lobby",
    option_b: "Next to the elevator on the second floor",
    option_c: "Across the street near the bank",
    option_d: "It has been closed permanently",
    correct_answer: "B",
    category: "Listening",
    meeting_number: 1,
    sort_order: 1,
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    image_url: null
  },
  {
    id: "q-102",
    question_text: "<b>What time does the presentation start?</b>",
    passage_text: null,
    option_a: "Exactly at 9:00 AM after registration",
    option_b: "Around noon in the restaurant",
    option_c: "At 2:30 PM",
    option_d: "It was postponed to tomorrow afternoon",
    correct_answer: "A",
    category: "Listening",
    meeting_number: 1,
    sort_order: 2,
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    image_url: null
  },
  // Meeting 1 - Reading
  {
    id: "q-103",
    question_text: "<b>What are external visitors required to do?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Company Guideline: Visitor Passes</b></h3>
      <p>All external visitors must register at the front desk and obtain a temporary visitor pass. This pass must be displayed prominently on your shirt pocket at all times while inside the office building.</p>
    </div>`,
    option_a: "Sign in and wear a visible visitor pass at all times",
    option_b: "Remain in the main entrance lobby",
    option_c: "Schedule an appointment online first",
    option_d: "Submit their physical identification cards to security",
    correct_answer: "A",
    category: "Reading",
    meeting_number: 1,
    sort_order: 3,
    audio_url: null,
    image_url: null
  },
  {
    id: "q-104",
    question_text: "<b>How far in advance must employees submit vacation requests?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Vacation Request Policy</b></h3>
      <p>Employees wishing to take more than three consecutive days of annual leave must submit a written request to their direct supervisor at least two weeks in advance.</p>
    </div>`,
    option_a: "Three days in advance",
    option_b: "Two weeks in advance",
    option_c: "One month in advance",
    option_d: "At least 48 hours in advance",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 1,
    sort_order: 4,
    audio_url: null,
    image_url: null
  },
  {
    id: "q-105",
    question_text: "The general manager praised Mr. Jenkins for completing the quarterly financial audit report so ______.",
    passage_text: null,
    option_a: "efficient",
    option_b: "efficiently",
    option_c: "efficiency",
    option_d: "more efficient",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 1,
    sort_order: 5,
    audio_url: null,
    image_url: null
  },

  // Meeting 2
  {
    id: "q-201",
    question_text: "<b>How often does the firm conduct external inventory audits?</b>",
    passage_text: null,
    option_a: "Once a month on Fridays",
    option_b: "Every six months",
    option_c: "Only when explicitly requested by our board",
    option_d: "Yes, we did last quarter",
    correct_answer: "B",
    category: "Listening",
    meeting_number: 2,
    sort_order: 1,
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    image_url: null
  },
  {
    id: "q-202",
    question_text: "<b>What is advised for project managers in the memo?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Attention Project Managers</b></h3>
      <p>Please review the budget spreadsheet by Tuesday afternoon. Do not make any edits before discussing potential changes with our financial coordinator, Ms. Larson.</p>
    </div>`,
    option_a: "Edit the budget immediately",
    option_b: "Discuss changes prior to modifying the spreadsheet",
    option_c: "Submit all billing receipt files directly to Larson",
    option_d: "Cancel the schedule discussion until next week",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 2,
    sort_order: 2,
    audio_url: null,
    image_url: null
  },
  {
    id: "q-203",
    question_text: "Because of the severe monsoon storm, the corporate board meeting will be postponed ______ standard business hours resume.",
    passage_text: null,
    option_a: "although",
    option_b: "until",
    option_c: "unless",
    option_d: "because",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 2,
    sort_order: 3,
    audio_url: null,
    image_url: null
  },

  // Meeting 8 (UTS)
  {
    id: "q-801",
    question_text: "<b>What must a staff member do regarding corporate travel reimbursement?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Travel Reimbursement Rules</b></h3>
      <p>To receive full refunds for transit, please keep all physical receipts and submit them to the finance dept within 5 working days upon returning.</p>
    </div>`,
    option_a: "Submit receipts within 5 days of returning",
    option_b: "Hand in travel plans prior to boarding",
    option_c: "Pay everything out of personal credit limits without refunds",
    option_d: "Travel reports are entirely optional",
    correct_answer: "A",
    category: "Reading",
    meeting_number: 8,
    sort_order: 1,
    audio_url: null,
    image_url: null
  },
  {
    id: "q-802",
    question_text: "<b>What does this midterm test assess?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Midterm Evaluation Standards</b></h3>
      <p>This exam carefully measures your reading comprehension. Analyze the email, notice or chart thoroughly before placing answers.</p>
    </div>`,
    option_a: "Spoken language level",
    option_b: "Reading comprehension proficiency",
    option_c: "Academic essay writing speed",
    option_d: "Social communication skills",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 8,
    sort_order: 2,
    audio_url: null,
    image_url: null
  },

  // Meeting 16 (UAS)
  {
    id: "q-1601",
    question_text: "Ms. Alisya was selected for the position because her leadership skills are highly ______ to the new marketing campaign.",
    passage_text: null,
    option_a: "relevant",
    option_b: "relevantly",
    option_c: "relevance",
    option_d: "more relevance",
    correct_answer: "A",
    category: "Reading",
    meeting_number: 16,
    sort_order: 1,
    audio_url: null,
    image_url: null
  },
  {
    id: "q-1602",
    question_text: "<b>What is recorded upon submitting the evaluation?</b>",
    passage_text: `<div class="passage-box">
      <h3><b>Final Evaluation Reporting</b></h3>
      <p>Once you lodge the final test, your scaled TOEIC score will be immediately synchronized to the academic records portal for lecturer approval.</p>
    </div>`,
    option_a: "Your attendance logs across 16 weeks",
    option_b: "Your final evaluation score",
    option_c: "A payment receipt invoice",
    option_d: "Total time spent scrolling the page",
    correct_answer: "B",
    category: "Reading",
    meeting_number: 16,
    sort_order: 2,
    audio_url: null,
    image_url: null
  }
];

// Helper to interact with LocalStorage Databases
export function loadLocalTable(tableName: string): any[] {
  const data = localStorage.getItem(`toeic_lms_${tableName}`);
  if (!data) {
    let initial: any[] = [];
    if (tableName === 'meeting_locks') initial = DEFAULT_MEETING_LOCKS;
    else if (tableName === 'announcements') initial = [DEFAULT_ANNOUNCEMENT, DEFAULT_EVAL_SETTINGS_ROW];
    else if (tableName === 'materials') initial = DEFAULT_MATERIALS;
    else if (tableName === 'questions') initial = DEFAULT_QUESTIONS;
    else if (tableName === 'profiles') {
      initial = [
        {
          id: 'mock-admin-id',
          username: 'admin',
          full_name: 'Dosen Pembimbing',
          email: 'admin@toeiclms.ac.id',
          role: 'admin'
        }
      ];
    }
    else if (tableName === 'scores') {
      initial = [
        {
          id: 'score-1',
          user_id: 'local-student-id',
          student_name: 'Budi Santoso',
          total_score: 820,
          meeting_number: 1,
          created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
        },
        {
          id: 'score-2',
          user_id: 'local-student-id',
          student_name: 'Siti Rahma',
          total_score: 510,
          meeting_number: 1,
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        }
      ];
    }
    
    localStorage.setItem(`toeic_lms_${tableName}`, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function saveLocalTable(tableName: string, data: any[]) {
  localStorage.setItem(`toeic_lms_${tableName}`, JSON.stringify(data));
}

function loadLocalSession() {
  const sess = localStorage.getItem('toeic_lms_session');
  return sess ? JSON.parse(sess) : null;
}

function saveLocalSession(sess: any) {
  if (sess) {
    localStorage.setItem('toeic_lms_session', JSON.stringify(sess));
  } else {
    localStorage.removeItem('toeic_lms_session');
  }
}

// Authentication listeners for Mock Auth
const authListeners = new Set<(event: string, session: any) => void>();

// UNIVERSAL QUERY BUILDER COMPATIBLE WITH SUPABASE TRANS-LOGS
class UniversalQueryBuilder {
  private tableName: string;
  private isInsert: boolean = false;
  private isUpdate: boolean = false;
  private isDelete: boolean = false;
  private insertPayload: any[] | null = null;
  private updatePayload: any = null;
  private filters: { col: string; val: any; type: 'eq' | 'neq' }[] = [];
  private orderings: { col: string; ascending: boolean }[] = [];
  private singleRequested: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, type: 'eq' });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, val, type: 'neq' });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderings.push({ col, ascending: options?.ascending !== false });
    return this;
  }

  maybeSingle() {
    this.singleRequested = true;
    return this;
  }

  insert(payload: any[]) {
    this.isInsert = true;
    this.insertPayload = payload;
    return this;
  }

  update(payload: any) {
    this.isUpdate = true;
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  // Thenable trigger - allows seamlessly awaiting builder chains
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const dbMode = getDbMode();
      let response: { data: any; error: any };

      if (dbMode === 'supabase') {
        response = await this.executeSupabase();
      } else {
        response = await this.executeLocal();
      }

      if (onfulfilled) return onfulfilled(response);
      return response;
    } catch (err: any) {
      console.error('Error on universal builder query execution: ', err);
      const errResponse = { data: null, error: err };
      if (onfulfilled) return onfulfilled(errResponse);
      return errResponse;
    }
  }

  // 1. SUPABASE MODE
  private async executeSupabase(): Promise<{ data: any; error: any }> {
    try {
      let chain: any = realSupabase.from(this.tableName);

      if (this.isInsert && this.insertPayload) {
        chain = chain.insert(this.insertPayload);
      } else if (this.isUpdate && this.updatePayload) {
        chain = chain.update(this.updatePayload);
      } else if (this.isDelete) {
        chain = chain.delete();
      } else {
        chain = chain.select('*');
      }

      // Apply Filters
      for (const f of this.filters) {
        if (f.type === 'eq') {
          chain = chain.eq(f.col, f.val);
        } else if (f.type === 'neq') {
          chain = chain.neq(f.col, f.val);
        }
      }

      // Apply Sorters
      for (const o of this.orderings) {
        chain = chain.order(o.col, { ascending: o.ascending });
      }

      if (this.singleRequested) {
        chain = chain.maybeSingle();
      }

      // Prevent indefinite loading by racing the query with a 5-second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Supabase Cloud membutuhkan waktu respon yang terlalu lama (Proyek mungkin sedang dijeda atau koneksi internet lambat).")), 5000)
      );

      const res = await Promise.race([chain, timeoutPromise]) as any;

      if (res.error) {
        const msg = res.error.message || '';
        // If tables are missing or request failed completely, notify of local mode recommendation
        if (res.error.code === '42P01' || msg.includes('relation') || msg.includes('fetch') || res.error.code === 'PGRST116') {
          triggerFallbackNotice(msg);
        }
      }
      return { data: res.data, error: res.error };
    } catch (supErr: any) {
      triggerFallbackNotice(supErr.message || 'Koneksi ke Supabase terganggu.');
      return { data: null, error: supErr };
    }
  }

  // 2. HIGH-FIDELITY LOCAL STORAGE MODE
  private async executeLocal(): Promise<{ data: any; error: any }> {
    let table = loadLocalTable(tableNameMapper(this.tableName));

    // Handle Deletions
    if (this.isDelete) {
      const matchFilters = (item: any) => {
        return this.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'neq') return item[f.col] !== f.val;
          return true;
        });
      };
      const remaining = table.filter(item => !matchFilters(item));
      saveLocalTable(tableNameMapper(this.tableName), remaining);
      return { data: [], error: null };
    }

    // Handle Updates
    if (this.isUpdate && this.updatePayload) {
      let updatedCount = 0;
      const updatedTable = table.map(item => {
        const matchesAll = this.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'neq') return item[f.col] !== f.val;
          return true;
        });
        if (matchesAll) {
          updatedCount++;
          return { ...item, ...this.updatePayload };
        }
        return item;
      });
      saveLocalTable(tableNameMapper(this.tableName), updatedTable);
      return { data: updatedTable.filter(item => {
        return this.filters.every(f => {
          if (f.type === 'eq') return item[f.col] === f.val;
          if (f.type === 'neq') return item[f.col] !== f.val;
          return true;
        });
      }), error: null };
    }

    // Handle Insertions
    if (this.isInsert && this.insertPayload) {
      const formattedInsertions = this.insertPayload.map(row => {
        return {
          id: row.id || `loc-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: row.created_at || new Date().toISOString(),
          ...row
        };
      });
      const newTable = [...table, ...formattedInsertions];
      saveLocalTable(tableNameMapper(this.tableName), newTable);
      return { data: formattedInsertions, error: null };
    }

    // Handle Standard Select lists/record
    let resultRows = [...table];

    // Filter list
    for (const f of this.filters) {
      resultRows = resultRows.filter(item => {
        if (f.type === 'eq') return String(item[f.col]) === String(f.val);
        if (f.type === 'neq') return String(item[f.col]) !== String(f.val);
        return true;
      });
    }

    // Sort list
    for (const o of this.orderings) {
      resultRows.sort((a, b) => {
        const valA = a[o.col];
        const valB = b[o.col];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return o.ascending ? valA - valB : valB - valA;
        }
        const strA = String(valA || '');
        const strB = String(valB || '');
        return o.ascending ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    // Request Single or list wrapper
    if (this.singleRequested) {
      return { data: resultRows[0] || null, error: null };
    }

    return { data: resultRows, error: null };
  }
}

// Map exact db tables to mock equivalents
function tableNameMapper(name: string): string {
  const clean = name.toLowerCase().trim();
  return clean;
}

// MAIN DATABASE ACCESS OBJECT DESIGNED TO BE TRANSPARENT
export const supabase = {
  from(tableName: string) {
    return new UniversalQueryBuilder(tableName);
  },

  auth: {
    onAuthStateChange(callback: (event: string, session: any) => void) {
      const dbMode = getDbMode();
      if (dbMode === 'supabase') {
        const { data } = realSupabase.auth.onAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                if (data && data.subscription) {
                  data.subscription.unsubscribe();
                }
              }
            }
          }
        };
      }

      authListeners.add(callback);
      // Retrieve locally simulated session
      const sess = loadLocalSession();
      setTimeout(() => {
        callback(sess ? 'SIGNED_IN' : 'SIGNED_OUT', sess);
      }, 50);

      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signInWithPassword({ email, password }: any) {
      const dbMode = getDbMode();
      if (dbMode === 'supabase') {
        return await realSupabase.auth.signInWithPassword({ email, password });
      }

      // Local Authenticator Flow
      const emailVal = String(email || '').trim().toLowerCase();
      const passVal = String(password || '');

      // Check master credentials override
      if (emailVal === 'admin' && passVal === 'guru123') {
        const mockAdmin = {
          id: 'mock-admin-id',
          username: 'admin',
          full_name: 'Dosen Pembimbing',
          email: 'admin@toeiclms.ac.id',
          role: 'admin'
        };
        const session = { user: mockAdmin, session: { access_token: 'fake-token' } };
        saveLocalSession(session);
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: session, error: null };
      }

      const profiles = loadLocalTable('profiles');
      const matched = profiles.find(p => p.email.toLowerCase() === emailVal || p.username.toLowerCase() === emailVal);

      if (!matched) {
        return { data: { user: null }, error: { message: 'Nama pengguna (Username) atau alamat email tidak ditemukan di database lokal.' } };
      }

      // Simple password check simulation - since password is typed, we assume correct pass for testing/prototyping locally
      const session = {
        user: {
          id: matched.id,
          email: matched.email,
          user_metadata: { full_name: matched.full_name }
        },
        session: { access_token: `fake-token-${matched.id}` }
      };

      saveLocalSession(session);
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: session, error: null };
    },

    async signUp({ email, password, options }: any) {
      const dbMode = getDbMode();
      if (dbMode === 'supabase') {
        return await realSupabase.auth.signUp({ email, password, options });
      }

      const emailVal = String(email || '').trim().toLowerCase();
      const profiles = loadLocalTable('profiles');

      if (profiles.some(p => p.email.toLowerCase() === emailVal)) {
        return { data: { user: null }, error: { message: 'Alamat email sudah terdaftar di sistem lokal.' } };
      }

      const usernameVal = emailVal.split('@')[0];
      const newUserId = `usr-${Date.now()}`;
      const newProfile = {
        id: newUserId,
        username: usernameVal,
        full_name: options?.data?.full_name || 'Siswa Baru',
        email: emailVal,
        role: 'mahasiswa'
      };

      // Store local profile
      profiles.push(newProfile);
      saveLocalTable('profiles', profiles);

      // Setup session
      const session = {
        user: {
          id: newUserId,
          email: emailVal,
          user_metadata: { full_name: newProfile.full_name }
        },
        session: { access_token: `fake-token-${newUserId}` }
      };

      saveLocalSession(session);
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: session, error: null };
    },

    async signOut() {
      const dbMode = getDbMode();
      if (dbMode === 'supabase') {
        return await realSupabase.auth.signOut();
      }

      saveLocalSession(null);
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    async updateUser({ password }: any) {
      const dbMode = getDbMode();
      if (dbMode === 'supabase') {
        return await realSupabase.auth.updateUser({ password });
      }

      const sess = loadLocalSession();
      return { data: { user: sess?.user || null }, error: null };
    }
  }
};
