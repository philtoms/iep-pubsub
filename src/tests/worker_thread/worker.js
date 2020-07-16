import { parentPort, threadId } from 'worker_threads';
import pubsub from '../../pubsub.js';

const { publish, subscribe, close } = pubsub();

const id = `${process.pid}.${threadId}`;

subscribe('channel', (message) => {
  console.log(id, message);
  setTimeout(() => {
    close();
  }, 10);
});

setTimeout(() => {
  publish('channel', `from child ${id}`);
}, 10);

parentPort.on('close', () => console.log('disconnect', id));
