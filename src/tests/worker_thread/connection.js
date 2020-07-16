import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __worker = path.resolve(__dirname, 'worker.js');

export default (worker = new Worker(__worker), threadId = worker.threadId) => {
  return {
    id: `${process.pid}.${threadId}`,
    send: (message) => worker.postMessage(message),
    on: (event, subscriber) => worker.on(event, subscriber),
  };
};
