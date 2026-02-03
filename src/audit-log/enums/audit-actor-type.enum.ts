export enum AuditActorType {
  USER = 'USER', // Regular voter
  ADMIN = 'ADMIN', // System administrator
  SYSTEM = 'SYSTEM', // Automated system action
  ANONYMOUS = 'ANONYMOUS', // Unauthenticated action
}
