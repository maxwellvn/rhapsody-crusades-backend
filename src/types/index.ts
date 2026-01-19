export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  country: string;
  city?: string;
  zone?: string;
  church?: string;
  group?: string;
  kingschat_username?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  country?: string;
  city?: string;
  category: string;
  image?: string;
  capacity?: number;
  featured: boolean;
  created_by: string;
  created_at: string;
  registration_count?: number;
  user_registered?: boolean;
}

export interface Ticket {
  id: string;
  user_id: string;
  event_id: number;
  qr_code: string;
  registration_date: string;
  status: 'active' | 'used' | 'cancelled';
  checked_in_at?: string;
  checked_in_by?: string;
  created_at: string;
}

export interface Testimony {
  id: string;
  user_id: string;
  title: string;
  text: string;
  event_id?: number;
  category_id?: number;
  image?: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: string[];
  created_at: string;
  updated_at: string;
}

export interface TestimonyCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  active: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'system' | 'event' | 'registration' | 'testimony' | 'ticket';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_by: string[];
  created_at: string;
}

export interface EventStaff {
  id: string;
  event_id: number;
  user_id: string;
  role: 'checker' | 'coordinator' | 'usher' | 'other';
  added_at: string;
  added_by: string;
}

export interface PasswordReset {
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
  created_at: string;
}
