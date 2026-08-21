export type Role = 'owner' | 'member';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface Source {
  id: string;
  title: string;
  content: string;
  source_type: string;
  page: string | null;
  created_at: string;
  updated_at: string;
}

export type CaptureStatus =
  | 'pending'
  | 'transcribing'
  | 'extracting'
  | 'retrieving'
  | 'review'
  | 'assignable'
  | 'assigned'
  | 'failed';

export interface Capture {
  id: string;
  user_id: string;
  speaker_name: string | null;
  initials: string | null;
  transcript: string | null;
  audio_path: string | null;
  status: CaptureStatus;
  confidence: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'open' | 'assigned' | 'done' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  capture_id: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export type ReviewType =
  | 'conflict'
  | 'missing_assignee'
  | 'low_confidence'
  | 'ambiguous'
  | 'policy_check';

export interface ReviewItem {
  id: string;
  capture_id: string;
  type: ReviewType;
  reason: string | null;
  status: 'open' | 'resolved';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExtractedTask {
  title: string;
  assignee: string | null;
  deadline: string | null;
  priority: TaskPriority;
  entities: string[];
}

export interface VerificationResult {
  needs_review: boolean;
  reason: string;
  confidence: number;
  conflicts: Array<{
    source_id: string;
    source_title: string;
    quote: string;
    contradicts: string;
  }>;
  citations: Array<{ source_id: string; source_title: string; quote: string }>;
}
