import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { AuditLogRequestContext } from './interfaces/audit-log-request-context.interface';

@Injectable()
export class AuditLogRequestContextService {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<AuditLogRequestContext>();

  /**
   * Run callback with request context
   */
  run<T>(context: AuditLogRequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Get current request context
   */
  getContext(): AuditLogRequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Set context for current async execution
   */
  setContext(context: AuditLogRequestContext): void {
    const currentStore = this.asyncLocalStorage.getStore();
    if (currentStore) {
      Object.assign(currentStore, context);
    }
  }
}
