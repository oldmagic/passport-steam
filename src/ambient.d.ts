declare module 'passport-strategy' {
  /** Minimal typings for passport-strategy base class used by Passport strategies. */
  export class Strategy {
    name: string;
    success(user: any, info?: any): void;
    fail(challenge?: any, status?: number): void;
    redirect(url: string, status?: number): void;
    pass(): void;
    error(err: any): void;
    authenticate(req: any, options?: any): void;
  }
  export { Strategy as default };
}
