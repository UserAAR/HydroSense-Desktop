export {}

declare global {
  interface Window {
    api: {
      openFile: () => Promise<{ path: string; text: string } | null>
      saveFile: (payload: { path?: string; text: string }) => Promise<string | null>
      fetchWindow: (seconds: number) => Promise<any[]>
      aiGenerate: (payload: { system: string; messages: { role: 'user'|'model'; content: string }[] }) => Promise<string>
    }
  }
} 