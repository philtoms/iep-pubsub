import pubsub from '../../pubsub.js';

const id = `${process.pid}\\${process.argv[2]}`;

const { publish, subscribe, close } = pubsub(id);

subscribe('channel', (message) => {
  console.log(id, message);
  close();
});

setTimeout(() => {
  publish('channel', `from server ${id}`);
}, 100);

process.on('exit', () => console.log('exit', process.pid));
