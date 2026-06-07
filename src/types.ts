export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'mahasiswa';
  study_program?: string;
  created_at?: string;
}

export interface Question {
  id: string;
  question_text: string;
  passage_text: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  category: 'Listening' | 'Reading';
  meeting_number: number;
  sort_order: number; // Represents 'Pola / Question Slot Number'
  audio_url: string | null;
  image_url: string | null;
  created_at?: string;
}

export interface Score {
  id: string;
  user_id: string;
  student_name: string;
  total_score: number;
  meeting_number: number;
  created_at: string;
}

export interface Material {
  id: string;
  title: string;
  content: string;
  meeting_number: number;
  created_at?: string;
}

export interface MeetingLock {
  id?: string;
  meeting_number: number;
  is_open: boolean;
  created_at?: string;
}

export interface Announcement {
  id: number;
  content: string;
  is_active: boolean;
  updated_at?: string;
}

export interface NotificationType {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
