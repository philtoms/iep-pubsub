import pubsub from '../../pubsub.js';

const port = process.argv[2];
const id = `localhost:${port}`;

const { publish, subscribe, close } = pubsub(port);

subscribe('channel', (message) => {
  console.log(id, message);
  close();
});

setTimeout(() => {
  publish('channel', `from server ${id}`);
}, 100);

process.on('exit', () => console.log('exit', id));
