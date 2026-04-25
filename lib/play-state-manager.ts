// Global play state manager for previewable files
// Ensures only one file plays at a time across the entire app

let currentPlayingFile: string | null = null
const playStateListeners = new Set<(playingFileId: string | null) => void>()

export function setPlayingFile(fileId: string | null) {
  currentPlayingFile = fileId
  playStateListeners.forEach((listener) => listener(fileId))
}

export function subscribeToPlayState(listener: (playingFileId: string | null) => void) {
  playStateListeners.add(listener)
  return () => playStateListeners.delete(listener)
}

export function getCurrentPlayingFile() {
  return currentPlayingFile
}
