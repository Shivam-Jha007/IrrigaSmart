/**
 * Shared data models for IrrigaSmart.
 *
 * These entities mirror docs/03_Data_Models.md and are the single vocabulary
 * used across the presentation, application, and storage layers
 * (docs/09_AI_Implementation_Guide.md: "Shared models must follow the Data
 * Models document").
 */
export * from './enums';
export * from './farmer';
export * from './farm';
export * from './crop';
export * from './soil';
export * from './weather';
export * from './recommendation';
export * from './history';
export * from './settings';
export * from './irrigationSchedule';
export * from './appNotification';
