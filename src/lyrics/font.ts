// Set lyric typeface as DotGothic16 (with system fallbacks)
export const LYRIC_FONT_FAMILY =
  '"DotGothic16", "Hiragino Maru Gothic ProN", "Yu Gothic UI", system-ui, sans-serif';

const FONT_NAME = 'DotGothic16';

// Make sure all characters a song uses are downloaded before lyric card rasterization
export async function ensureLyricFont(text: string): Promise<void> {
  if (!('fonts' in document)) return;
  try {
    await document.fonts.load(`16px "${FONT_NAME}"`, text || 'あ');
    await document.fonts.ready;
  } catch {
    // Ignore load failures (rendering continues with fallback font)
  }
}
