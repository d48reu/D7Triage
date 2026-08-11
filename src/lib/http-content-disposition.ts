export function inlineContentDisposition(fileName: string) {
  const safeFileName = fileName
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_")
    .slice(0, 180)
    .trim();

  return `inline; filename="${safeFileName || "attachment"}"`;
}
