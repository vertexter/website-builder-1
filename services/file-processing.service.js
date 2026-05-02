async function extractTextFromUpload({ mimeType, base64 }) {
  const raw = Buffer.from(base64, 'base64');
  if (mimeType === 'text/plain') return raw.toString('utf8');
  if (mimeType === 'application/pdf' || mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return raw.toString('utf8');
  }
  throw new Error('Unsupported file type. Use PDF, DOC, or TXT.');
}
module.exports = { extractTextFromUpload };
