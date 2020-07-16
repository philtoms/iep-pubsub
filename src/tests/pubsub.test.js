import test from 'ava';
import {
  loadConnector,
  loadPubsub,
  connector,
  mock,
  asyncMock,
} from './fakes.js';

test.serial('connector bootstrap', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();
  const { connection } = pubsub(connector);

  await connection;

  t.is(connector.on.calls, 1);
  t.is(connector.on.values.pop()[0], 'message');
});

test.serial('connector subscribe request', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();

  const { subscribe } = pubsub(connector);
  const subscriber = () => {};

  await subscribe('channel', subscriber);

  t.deepEqual(connector.send.values.pop()[0], {
    channel: 'channel',
    subscribe: true,
  });
});

test.serial('connector unsubscribe request', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();

  const { subscribe, unsubscribe } = pubsub(connector);
  const subscriber = () => {};

  await subscribe('channel', subscriber);
  await unsubscribe('channel', subscriber);

  t.deepEqual(connector.send.values.pop()[0], {
    channel: 'channel',
    unsubscribe: true,
  });
});

test.serial('connector close request', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();

  await pubsub(connector).close();

  t.deepEqual(connector.send.values.pop()[0], {
    close: true,
  });
});

test.serial('publish -> subscribe', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  pubsub(connector()).subscribe('channel', mock);

  await pubsub().publish('channel', 123);

  t.is(mock.values.pop()[0], 123);
});

test.serial('publish -> wait for remote subscriber', async (t) => {
  const pubsub = await loadPubsub();
  const { done, send } = asyncMock(({ message }) => message);

  await pubsub().publish('channel', 123);
  await pubsub(connector('id', send)).subscribe('channel', 'id');

  const received = await done;

  t.deepEqual(received, { channel: 'channel', message: 123 });
});

test.serial('publish as factory', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  const publish = pubsub().publish('channel');

  await pubsub(connector()).subscribe('channel', mock);
  await publish(123);
  await publish(456);

  t.is(mock.values.pop()[0], 456);
  t.is(mock.values.pop()[0], 123);
});

test.serial('subscribe wait for publish', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  const subscriber = pubsub(connector()).subscribe('channel');
  pubsub().publish('channel', 123);

  const message = await subscriber;
  t.is(message, 123);
});

test.serial('publish -> ignore subscribe to self', async (t) => {
  const pubsub = await loadPubsub();

  const { publish, subscribe } = pubsub();

  mock.reset();
  subscribe('channel', mock);
  publish('channel', 123);

  t.is(mock.calls, 0);
});

test.serial('unsubscribe', async (t) => {
  const pubsub = await loadPubsub();

  const { publish } = pubsub();

  mock.reset();
  await pubsub(connector()).subscribe('channel', mock);
  await publish('channel', 123);

  await pubsub(connector()).unsubscribe('channel', mock);
  await publish('channel', 123);

  t.is(mock.calls, 1);
});

test.serial('once', async (t) => {
  const pubsub = await loadPubsub();

  const { publish } = pubsub();

  mock.reset();
  await pubsub(connector()).once('channel', mock);
  await publish('channel', 123);
  await publish('channel', 123);

  t.is(mock.calls, 1);
});

test.serial('broadcast to multiple connectors', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  pubsub(connector()).subscribe('channel', mock);
  pubsub(connector()).subscribe('channel', mock);

  await pubsub().publish('channel', 123);

  t.is(mock.calls, 2);
});

test.serial('custom connection', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  pubsub(mock);

  t.is(mock.calls, 1);
});

test.serial('custom connection with passthrough options', async (t) => {
  const pubsub = await loadPubsub();

  mock.reset();
  pubsub(mock, 1, 2, 3);

  t.deepEqual(mock.values.pop(), [1, 2, 3]);
});

test.serial('async custom connection', async (t) => {
  const pubsub = await loadPubsub();
  const mock = asyncMock();

  pubsub(mock);

  const received = await mock.done;

  t.is(received, 'message');
});
