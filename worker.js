const fs = require('fs').promises;
const thumbnail = require('image-thumbnail');
const Queue = require('bull');
const Documents = require('./utils/Documents');

const fileQueue = new Queue('file', {
  redis: { host: '127.0.0.1', port: 6379 },
});

fileQueue.process(async (job) => {
  if (!job.data.fieldId) throw new Error('Missing fileId');
  if (!job.data.userId) throw new Error('Missing userId');
  const { fieldId, userId } = job.data;
  const docObj = await Documents.findDoc(fieldId, userId);
  if (!docObj) throw new Error('File not found');

  const thumb500 = await thumbnail(docObj.localPath, { width: 500 });
  const thumb500FileName = `${docObj.localPath}_500`;
  const thumb250 = await thumbnail(docObj.localPath, { width: 250 });
  const thumb250FileName = `${docObj.localPath}_250`;
  const thumb100 = await thumbnail(docObj.localPath, { width: 100 });
  const thumb100FileName = `${docObj.localPath}_100`;

  await fs.writeFile(thumb500FileName, thumb500);
  await fs.writeFile(thumb250FileName, thumb250);
  await fs.writeFile(thumb100FileName, thumb100);
});

module.exports = fileQueue;
