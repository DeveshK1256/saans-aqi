/**
 * Saans Auth & Session Types (`GS-02`)
 */

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
  role: 'household_owner' | 'member';
  issuedAt: number;
  expiresAt: number;
}

export interface GoogleAuthProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  verifiedEmail: boolean;
}
