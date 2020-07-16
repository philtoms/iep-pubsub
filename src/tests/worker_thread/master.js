import { loadPubsub } from '../fakes.js';
import { setup, test } from '../runner.js';
import connection from './connection.js';

setup(loadPubsub);

test('child -> siblings', (pubsub) => {
  return Promise.all(
    [connection(), connection()].map((child) => {
      return new Promise((resolve) => {
        pubsub(child);
        resolve(child.id);
      });
    })
  );
});

test('parent -> child', (pubsub, title) => {
  return new Promise((resolve) => {
    const child = connection();
    pubsub(child).publish('channel', `from ${title}`);
    resolve(child.id);
  });
});

test('child -> parent', async (pubsub) => {
  return new Promise((resolve) => {
    const child = connection();
    // register and pub/sub on child connection
    const { publish, subscribe } = pubsub(child);
    subscribe('channel', (message) => {
      publish('channel', `from ${message}`);
      resolve(child.id);
    });
  });
});

test('broadcast across connections', (pubsub) => {
  const child = connection();

  // register child connection
  pubsub(child);

  return new Promise((resolve) => {
    // broadcast on default (parent) connection
    pubsub().subscribe('channel', (message) => {
      pubsub().publish('channel', `from ${message}`);
      resolve(child.id);
    });
  });
});
