import pubsub from '../../pubsub.js';

const { publish, subscribe, close } = pubsub();

subscribe('channel', (message) => {
  console.log(process.pid, message);
  setTimeout(() => {
    close();
  }, 10);
});

setTimeout(() => {
  publish('channel', `from child ${process.pid}`);
}, 10);

process.on('disconnect', () => console.log('disconnect', process.pid));
