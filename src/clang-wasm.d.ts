declare module "@live-codes/clang-wasm" {
  export function createCompiler(language: string, options: {baseUrl: URL; std?: string; onProgress?: (value: number) => void}): Promise<{run(code: string, input?: string, options?: {std?: string}): Promise<{stdout: string; stderr: string; output: string; errors: string[]; exitCode: number | null; compileMs: number; runMs: number | null}>;dispose(): void}>;
}
