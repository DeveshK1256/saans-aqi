/**
 * Saans Household Profile Service
 * Coordinates validation, field-level KMS envelope encryption, authorization, and DPDP lifecycle.
 */

import crypto from 'crypto';
import { HouseholdProfile, StoredHouseholdMember, StoredHouseholdProfile } from './types';
import { HouseholdProfileInput, HouseholdProfileInputSchema } from './schema';
import { kmsEnvelope } from '../../lib/kms';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export class HouseholdService {
  // In-memory backing store for user households (keyed by householdId and indexed by userId)
  private households = new Map<string, StoredHouseholdProfile>();
  private userToHousehold = new Map<string, string>(); // userId -> householdId

  /**
   * Creates or updates a household profile.
   * Encrypts all member health flags with Cloud KMS envelope encryption prior to persistence.
   */
  public async upsertHousehold(userId: string, input: HouseholdProfileInput): Promise<HouseholdProfile> {
    const validated = HouseholdProfileInputSchema.parse(input);

    const existingHouseholdId = this.userToHousehold.get(userId);
    const householdId = existingHouseholdId || `hh_${crypto.randomUUID()}`;

    // Encrypt member health flags via KMS envelope
    const storedMembers: StoredHouseholdMember[] = await Promise.all(
      validated.members.map(async (m) => {
        const memberId = m.id || `mem_${crypto.randomUUID()}`;
        const encryptedHealthFlags = await kmsEnvelope.encryptHealthFlags(m.healthFlags);
        return {
          id: memberId,
          nameAlias: m.nameAlias,
          ageGroup: m.ageGroup,
          ageYears: m.ageYears,
          encryptedHealthFlags,
          activityPattern: m.activityPattern,
          commuteMode: m.commuteMode,
          commuteDurationMinutes: m.commuteDurationMinutes,
        };
      })
    );

    const now = new Date().toISOString();
    const storedProfile: StoredHouseholdProfile = {
      id: householdId,
      userId,
      locality: validated.locality,
      city: validated.city,
      gridCell: validated.gridCell,
      homeType: validated.homeType,
      floor: validated.floor,
      windowSealing: validated.windowSealing,
      ventilationHabit: validated.ventilationHabit,
      hasAc: validated.hasAc,
      hasPurifier: validated.hasPurifier,
      purifierCount: validated.purifierCount,
      purifierRoom: validated.purifierRoom,
      kitchenFuel: validated.kitchenFuel,
      hasKitchenChimney: validated.hasKitchenChimney,
      hasIncenseOrCoils: validated.hasIncenseOrCoils,
      hasPets: validated.hasPets,
      hasSmokers: validated.hasSmokers,
      members: storedMembers,
      consent: validated.consent,
      createdAt: this.households.get(householdId)?.createdAt || now,
      updatedAt: now,
    };

    this.households.set(householdId, storedProfile);
    this.userToHousehold.set(userId, householdId);

    logger.info('Household profile upserted with encrypted health flags', {
      householdId,
      memberCount: storedMembers.length,
      gridCell: validated.gridCell,
    });

    return this.decryptProfile(storedProfile);
  }

  /**
   * Retrieves the household profile for an authenticated user.
   * Decrypts member health flags on the fly.
   */
  public async getHouseholdByUserId(userId: string): Promise<HouseholdProfile | null> {
    const householdId = this.userToHousehold.get(userId);
    if (!householdId) {
      return null;
    }
    const stored = this.households.get(householdId);
    if (!stored) {
      return null;
    }
    return this.decryptProfile(stored);
  }

  /**
   * Raw lookup returning stored record with ciphertext for verification tests.
   */
  public getStoredProfile(householdId: string): StoredHouseholdProfile | null {
    return this.households.get(householdId) || null;
  }

  /**
   * Export all user data under India DPDP Act 2023 (Right to Data Portability).
   */
  public async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.getHouseholdByUserId(userId);
    if (!profile) {
      throw new AppError('NOT_FOUND', 'No household profile found for export', 404);
    }

    return {
      schema: 'https://saans.app/schemas/dpdp-export-v1.json',
      complianceFramework: 'Digital Personal Data Protection Act (DPDP) 2023',
      exportedAt: new Date().toISOString(),
      user: {
        id: userId,
      },
      household: profile,
      dataRetentionPolicy: {
        healthFlagsRetention: 'Retained until explicitly deleted by user',
        auditLogRetention: '30 days',
        roomPhotosRetention: 'Maximum 24 hours (automatic lifecycle deletion)',
      },
    };
  }

  /**
   * Permanently delete user data under DPDP Act 2023 (Right to Erasure / Forgotten).
   */
  public async deleteUserData(userId: string): Promise<{ deleted: boolean; householdId: string }> {
    const householdId = this.userToHousehold.get(userId);
    if (!householdId) {
      throw new AppError('NOT_FOUND', 'No household data associated with this user', 404);
    }

    this.households.delete(householdId);
    this.userToHousehold.delete(userId);

    logger.info('Household profile and health flags permanently purged', { householdId });

    return { deleted: true, householdId };
  }

  /**
   * Internal helper to decrypt stored ciphertext into plain HealthFlags.
   */
  private async decryptProfile(stored: StoredHouseholdProfile): Promise<HouseholdProfile> {
    const decryptedMembers = await Promise.all(
      stored.members.map(async (m) => {
        const healthFlags = await kmsEnvelope.decryptHealthFlags(m.encryptedHealthFlags);
        return {
          id: m.id,
          nameAlias: m.nameAlias,
          ageGroup: m.ageGroup,
          ageYears: m.ageYears,
          healthFlags,
          activityPattern: m.activityPattern,
          commuteMode: m.commuteMode,
          commuteDurationMinutes: m.commuteDurationMinutes,
        };
      })
    );

    return {
      ...stored,
      members: decryptedMembers,
    };
  }

  public clear(): void {
    this.households.clear();
    this.userToHousehold.clear();
  }
}

// Global household service instance
export const householdService = new HouseholdService();
