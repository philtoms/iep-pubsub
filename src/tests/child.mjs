import pubsub from '../pubsub.mjs';

const { publish, subscribe } = pubsub(process);

subscribe('channel', (message) => {
  console.log(process.pid, message);
  setTimeout(() => {
    process.disconnect();
  }, 10);
});
setTimeout(() => {
  publish('channel', `from child ${process.pid}`);
}, 10);

process.on('disconnect', () => console.log('disconnect', process.pid));
