import { describe, it, expect } from 'vitest';
import { AuthorizationMatrix } from '../../src/lib/authz';
import { UserSession } from '../../src/domain/auth/types';

describe('Household Authorization Matrix & Tenant Isolation Tests (SEC-03)', () => {
  const sessionUserA: UserSession = {
    userId: 'usr_priya_pune',
    email: 'priya@example.com',
    name: 'Priya Sharma',
    provider: 'google',
    role: 'household_owner',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };

  const sessionUserB: UserSession = {
    userId: 'usr_dadaji_delhi',
    email: 'dadaji@example.com',
    name: 'Dadaji',
    provider: 'google',
    role: 'household_owner',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };

  describe('Single-Tenant Privacy Assertions', () => {
    it('allows User A full access (read, update, export, delete) to User A household', () => {
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserA, 'usr_priya_pune', 'read')).toBe(true);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserA, 'usr_priya_pune', 'update')).toBe(true);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserA, 'usr_priya_pune', 'export')).toBe(true);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserA, 'usr_priya_pune', 'delete')).toBe(true);

      expect(() => AuthorizationMatrix.assertHouseholdAccess(sessionUserA, 'usr_priya_pune', 'read')).not.toThrow();
    });

    it('denies User B any access to User A household (IDOR prevention)', () => {
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserB, 'usr_priya_pune', 'read')).toBe(false);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserB, 'usr_priya_pune', 'update')).toBe(false);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserB, 'usr_priya_pune', 'export')).toBe(false);
      expect(AuthorizationMatrix.canAccessHousehold(sessionUserB, 'usr_priya_pune', 'delete')).toBe(false);

      expect(() => AuthorizationMatrix.assertHouseholdAccess(sessionUserB, 'usr_priya_pune', 'read')).toThrowError(
        /Tenant isolation violation/
      );
    });

    it('denies unauthenticated requests with 401 Unauthorized', () => {
      expect(AuthorizationMatrix.canAccessHousehold(null, 'usr_priya_pune', 'read')).toBe(false);
      expect(() => AuthorizationMatrix.assertHouseholdAccess(null, 'usr_priya_pune', 'read')).toThrowError(
        /Authentication required/
      );
    });
  });

  describe('DPDP Consent Enforcement', () => {
    it('allows processing when explicit consent is agreed', () => {
      expect(() => AuthorizationMatrix.assertConsentGranted(true)).not.toThrow();
    });

    it('throws error when explicit consent is false or missing', () => {
      expect(() => AuthorizationMatrix.assertConsentGranted(false)).toThrowError(
        /Explicit consent under the Digital Personal Data Protection \(DPDP\) Act 2023 is required/
      );
    });
  });
});
