import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    // req.path excludes the query string, so sensitive values in URLs (e.g.
    // Stripe Connect codes, OAuth states, reset tokens) are never logged.
    const { method, path } = req;
    const t0 = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - t0;
        if (ms > 500) {
          this.logger.warn(`${method} ${path} ${ms}ms`);
        } else {
          this.logger.log(`${method} ${path} ${ms}ms`);
        }
      }),
    );
  }
}
