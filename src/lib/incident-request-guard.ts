/**
 * Guards against stale async responses by tagging every request with a
 * monotonically increasing token. Only the most recently started request is
 * considered current; callers must discard results whose token is no longer
 * current so an earlier, slower response cannot overwrite newer data.
 */
export class RequestGuard {
  private token = 0;

  /** Start a new request and return the token that identifies it. */
  begin(): number {
    this.token += 1;
    return this.token;
  }

  /** True while `token` still identifies the most recently started request. */
  isCurrent(token: number): boolean {
    return token === this.token;
  }

  /** Invalidate the in-flight request (e.g. on effect cleanup / unmount). */
  invalidate(): void {
    this.token += 1;
  }
}
