import { describe, it, expect, beforeEach } from 'vitest';
import { HouseholdService } from '../../src/domain/household/household-service';
import { HouseholdProfileInput } from '../../src/domain/household/schema';

describe('DPDP Act 2023 Data Portability & Erasure Lifecycle Tests (SEC-18)', () => {
  let service: HouseholdService;

  const priyaInput: HouseholdProfileInput = {
    locality: 'Kothrud',
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
        nameAlias: 'Child (6yo)',
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

  beforeEach(() => {
    service = new HouseholdService();
  });

  it('exports complete user household profile with decrypted health flags and retention policies', async () => {
    await service.upsertHousehold('usr_priya_pune', priyaInput);

    const exportData = await service.exportUserData('usr_priya_pune');

    expect(exportData.complianceFramework).toBe('Digital Personal Data Protection Act (DPDP) 2023');
    expect(exportData.user).toEqual({ id: 'usr_priya_pune' });
    expect(exportData.dataRetentionPolicy).toBeDefined();

    const hh = exportData.household as any;
    expect(hh.city).toBe('Pune');
    expect(hh.members.length).toBe(2);
    // Exported member data for owner is decrypted
    expect(hh.members[1].healthFlags.hasAsthma).toBe(true);
  });

  it('permanently deletes household data under DPDP Right to Erasure', async () => {
    await service.upsertHousehold('usr_priya_pune', priyaInput);

    const deleteResult = await service.deleteUserData('usr_priya_pune');
    expect(deleteResult.deleted).toBe(true);

    // Profile lookup should now return null
    const profileAfterDelete = await service.getHouseholdByUserId('usr_priya_pune');
    expect(profileAfterDelete).toBeNull();

    // Exporting deleted user throws 404 AppError
    await expect(service.exportUserData('usr_priya_pune')).rejects.toThrow('No household profile found for export');
  });
});
