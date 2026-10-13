// Expected failures from service functions. `code` is shown to admins through en.json.
export class ServiceError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
