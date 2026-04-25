import type { IpcMainInvokeEvent } from "electron"

export type IpcErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "DB_ERROR"
  | "FS_ERROR"
  | "INTEGRITY_ERROR"
  | "INVALID_INPUT"
  | "LIBRARY_MISSING"
  | "UNKNOWN"

export interface IpcError {
  code: IpcErrorCode
  message: string
  details?: Record<string, unknown>
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

type IpcHandler<T, A extends unknown[]> = (
  event: IpcMainInvokeEvent,
  ...args: A
) => Promise<T>

export function wrapIpc<T, A extends unknown[] = []>(
  handler: IpcHandler<T, A>,
): (event: IpcMainInvokeEvent, ...args: A) => Promise<IpcResult<T>> {
  return async (event, ...args) => {
    try {
      const data = await handler(event, ...args)
      return { ok: true, data }
    } catch (err) {
      const code = ((err as { code?: IpcErrorCode })?.code ?? "UNKNOWN") as IpcErrorCode
      return {
        ok: false,
        error: {
          code,
          message: (err as Error)?.message ?? "unknown error",
        },
      }
    }
  }
}
