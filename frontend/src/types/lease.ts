export type LeaseStatus = 'pending_payment' | 'active' | 'cancelled' | 'ended';

export interface LeaseProperty {
  id: string;
  title: string;
  photos: string[];
  address: string;
  city: string;
  monthly_rent: number;
  owner?: { id: string; name: string | null };
}

export interface LeaseTenant {
  id: string;
  name: string | null;
  email: string;
}

export interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: string;
  hold_release_at: string;
  released_at: string | null;
  created_at: string;
}

export interface Lease {
  id: string;
  user_id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  months: number;
  status: LeaseStatus;
  monthly_rent: number;
  stripe_subscription_id: string | null;
  created_at: string;
  property?: LeaseProperty;
  tenant?: LeaseTenant;
  payments?: Payment[];
}
