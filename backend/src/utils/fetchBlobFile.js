// Server-side fetch of a file previously uploaded straight to Vercel Blob by
// the client (bypassing Vercel's 4.5MB serverless request-body limit). The
// outbound fetch here has no such cap, so this is where large files actually
// enter the app.
async function fetchBlobFile(blobUrl, filename) {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengambil file dari penyimpanan sementara (status ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), originalname: filename };
}

module.exports = { fetchBlobFile };
