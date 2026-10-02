const { handleUpload } = require('@vercel/blob/client');

const ALLOWED_CONTENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

async function clientUpload(req, res) {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024,
      }),
    });
    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { clientUpload };
