import { describe, it, expect, beforeEach } from 'vitest';
import { KmsEnvelopeEncryption, kmsEnvelope } from '../../src/lib/kms';
import { HealthFlags } from '../../src/domain/household/types';
import { HouseholdService } from '../../src/domain/household/household-service';
import { HouseholdProfileInput } from '../../src/domain/household/schema';

describe('Cloud KMS Envelope Encryption Tests (GS-12 & SEC-20)', () => {
  const priyaChildHealthFlags: HealthFlags = {
    hasAsthma: true,
    isPregnant: false,
    hasCardiovascularCondition: false,
    hasRespiratoryCondition: true,
  };

  it('encrypts health flags into authenticated KMS envelope format', async () => {
    const envelope = await kmsEnvelope.encryptHealthFlags(priyaChildHealthFlags);

    expect(typeof envelope).toBe('string');
    expect(envelope.startsWith('kms:v1:')).toBe(true);

    const parts = envelope.split(':');
    expect(parts.length).toBe(5); // prefix, version, iv, ciphertext, authTag

    // Verify ciphertext does not leak plaintext health flags
    expect(envelope).not.toContain('hasAsthma');
    expect(envelope).not.toContain('true');
  });

  it('successfully decrypts envelope back to original health flags', async () => {
    const envelope = await kmsEnvelope.encryptHealthFlags(priyaChildHealthFlags);
    const decrypted = await kmsEnvelope.decryptHealthFlags(envelope);

    expect(decrypted).toEqual(priyaChildHealthFlags);
    expect(decrypted.hasAsthma).toBe(true);
    expect(decrypted.isPregnant).toBe(false);
  });

  it('fails decryption and detects tampering when ciphertext is modified', async () => {
    const envelope = await kmsEnvelope.encryptHealthFlags(priyaChildHealthFlags);
    const parts = envelope.split(':');

    // Flip the first character of the ciphertext segment
    const tamperedCiphertext = (parts[3][0] === 'a' ? 'b' : 'a') + parts[3].slice(1);
    const tamperedEnvelope = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}:${parts[4]}`;

    await expect(kmsEnvelope.decryptHealthFlags(tamperedEnvelope)).rejects.toThrow('Integrity check failed');
  });

  it('fails decryption if auth tag is forged or modified', async () => {
    const envelope = await kmsEnvelope.encryptHealthFlags(priyaChildHealthFlags);
    const parts = envelope.split(':');

    // Tamper with the authTag segment
    const tamperedTag = '00000000000000000000000000000000';
    const tamperedEnvelope = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${tamperedTag}`;

    await expect(kmsEnvelope.decryptHealthFlags(tamperedEnvelope)).rejects.toThrow('Integrity check failed');
  });

  it('rejects malformed envelopes missing prefix or segments', async () => {
    await expect(kmsEnvelope.decryptHealthFlags('plain-text-payload')).rejects.toThrow('Invalid KMS envelope header');
    await expect(kmsEnvelope.decryptHealthFlags('kms:v1:incomplete')).rejects.toThrow('Malformed KMS envelope format');
  });

  it('verifies that stored DB profile holds ciphertext, not plaintext health flags (Track A requirement)', async () => {
    const service = new HouseholdService();

    const priyaInput: HouseholdProfileInput = {
      locality: 'Shivajinagar',
      city: 'Pune',
      gridCell: '18.52,73.86',
      homeType: 'apartment',
      floor: 3,
      windowSealing: 'standard',
      ventilationHabit: 'morning_open',
      hasAc: true,
      hasPurifier: false,
      purifierCount: 0,
      purifierRoom: 'none',
      kitchenFuel: 'lpg_piped',
      hasKitchenChimney: true,
      hasIncenseOrCoils: false,
      hasPets: false,
      hasSmokers: false,
      members: [
        {
          nameAlias: 'Priya',
          ageGroup: 'adult',
          ageYears: 34,
          healthFlags: { hasAsthma: false, isPregnant: false, hasCardiovascularCondition: false, hasRespiratoryCondition: false },
          activityPattern: 'hybrid',
          commuteMode: 'bike_scooter',
          commuteDurationMinutes: 30,
        },
        {
          nameAlias: 'Aarav (Child)',
          ageGroup: 'child',
          ageYears: 6,
          healthFlags: { hasAsthma: true, isPregnant: false, hasCardiovascularCondition: false, hasRespiratoryCondition: true },
          activityPattern: 'mostly_indoor',
          commuteMode: 'bike_scooter',
          commuteDurationMinutes: 15,
        },
      ],
      consent: {
        grantedAt: new Date().toISOString(),
        dataProcessingAgreed: true,
        dpdpVersion: '2023',
        analyticsOptIn: false,
        alertNotificationsOptIn: true,
      },
    };

    const saved = await service.upsertHousehold('usr_priya_pune', priyaInput);
    const stored = service.getStoredProfile(saved.id);

    expect(stored).not.toBeNull();
    // Verify stored child member has encryptedHealthFlags starting with kms:
    const storedChild = stored!.members.find((m) => m.nameAlias === 'Aarav (Child)');
    expect(storedChild).toBeDefined();
    expect(storedChild!.encryptedHealthFlags.startsWith('kms:v1:')).toBe(true);

    // Verify raw serialized record in storage does not contain plaintext health flags
    const serializedDbRecord = JSON.stringify(stored);
    expect(serializedDbRecord).not.toContain('"hasAsthma":true');
    expect(serializedDbRecord).toContain('kms:v1:');
  });
});
