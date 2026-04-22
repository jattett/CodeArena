export {}

declare global {
  interface PyodideInterface {
    runPythonAsync: (code: string) => Promise<unknown>
    setStdin: (opts: { stdin: () => string }) => void
    setStdout: (opts: { batched: (s: string) => void }) => void
    setStderr: (opts: { batched: (s: string) => void }) => void
  }

  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>
  }
}
