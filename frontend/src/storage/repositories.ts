import { createRepository } from './repository';

/**
 * Entity repositories (docs/06_Development_Roadmap.md Phase 2).
 *
 * Each is a thin, fully-typed instance of the generic repository. Farm-scoped
 * lookups use the indexes declared in db.ts.
 */

export const farmerRepository = createRepository('farmers');
export const farmRepository = createRepository('farms');
export const cropRepository = createRepository('crops');
export const soilRepository = createRepository('soils');
export const recommendationRepository = createRepository('recommendations');
export const historyRepository = createRepository('history');
export const notificationRepository = createRepository('notifications');
export const waterLedgerRepository = createRepository('waterLedger');
export const depletionStateRepository = createRepository('depletionState');

/** Farms belonging to a given farmer (uses the `byFarmer` index). */
export function getFarmsByFarmer(farmerId: string) {
  return farmRepository.getAllByIndex('byFarmer', farmerId);
}

/** Recommendations generated for a given farm (uses the `byFarm` index). */
export function getRecommendationsByFarm(farmId: string) {
  return recommendationRepository.getAllByIndex('byFarm', farmId);
}

/** History records for a given farm (uses the `byFarm` index). */
export function getHistoryByFarm(farmId: string) {
  return historyRepository.getAllByIndex('byFarm', farmId);
}

/** Notifications for a given farm (uses the `byFarm` index). */
export function getNotificationsByFarm(farmId: string) {
  return notificationRepository.getAllByIndex('byFarm', farmId);
}

/** Water ledger rows for a given farm (uses the `byFarm` index). */
export function getLedgerByFarm(farmId: string) {
  return waterLedgerRepository.getAllByIndex('byFarm', farmId);
}
