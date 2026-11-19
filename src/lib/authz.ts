/**
 * Saans Authorization Matrix & Tenant Isolation Guard
 * Enforces SEC-03 (Household authz matrix 100% isolation) and IDOR prevention.
 */

import { AppError } from './errors';
import { UserSession } from '../domain/auth/types';

export type Action = 'read' | 'update' | 'export' | 'delete';

export class AuthorizationMatrix {
  /**
   * Asserts that a user has permission to perform an action on a household resource.
   * Enforces strict single-tenant household privacy: User A cannot read, update, export,
   * or delete User B's household under any circumstance.
   */
  public static canAccessHousehold(
    session: UserSession | null,
    resourceOwnerUserId: string,
    action: Action
  ): boolean {
    if (!session || !session.userId) {
      return false;
    }

    // A user can only access their own household profile
    if (session.userId === resourceOwnerUserId) {
      return true;
    }

    return false;
  }

  /**
   * Strict assertion that throws 401 or 403 AppError if permission check fails.
   */
  public static assertHouseholdAccess(
    session: UserSession | null,
    resourceOwnerUserId: string,
    action: Action = 'read'
  ): void {
    if (!session || !session.userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required to access household data', 401);
    }

    if (!this.canAccessHousehold(session, resourceOwnerUserId, action)) {
      throw new AppError(
        'FORBIDDEN',
        `Tenant isolation violation: User '${session.userId}' is not permitted to ${action} household of '${resourceOwnerUserId}'`,
        403
      );
    }
  }

  /**
   * Asserts valid DPDP Act 2023 consent before storing health risk attributes.
   */
  public static assertConsentGranted(dataProcessingAgreed: boolean): void {
    if (!dataProcessingAgreed) {
      throw new AppError(
        'CONSENT_REQUIRED',
        'Explicit consent under the Digital Personal Data Protection (DPDP) Act 2023 is required',
        400
      );
    }
  }
}
