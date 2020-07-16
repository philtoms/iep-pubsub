import { loadPubsub } from '../fakes.js';
import { setup, test } from '../runner.js';
import connection from './connection.js';

setup(loadPubsub);

test('child -> siblings', (pubsub) => {
  return Promise.all(
    [connection(8081), connection(8082)].map((child) => {
      return new Promise((resolve) => {
        pubsub(child, true);
        resolve(child);
      });
    })
  );
});

test('parent -> child', (pubsub) => {
  return new Promise((resolve) => {
    const child = connection();
    pubsub(child, true).publish('channel', `from master`);
    resolve(child);
  });
});

test('child -> parent', async (pubsub) => {
  return new Promise((resolve) => {
    // register and pub/sub on child connection
    const child = connection();
    const { publish, subscribe } = pubsub(child, true);
    subscribe('channel', (message) => {
      publish('channel', `from ${message}`);
      resolve(child);
    });
  });
});

test.only('broadcast across connector types', (pubsub) => {
  // register child connection
  const child = connection();
  pubsub(child, true);

  return new Promise((resolve) => {
    // broadcast on default (parent) connection
    pubsub().subscribe('channel', (message) => {
      pubsub().publish('channel', `from ${message}`);
      resolve(child);
    });
  });
});
