import test from 'ava';
import { loadConnector, loadPubsub, connector } from './fakes.mjs';

import receiver from 'receiver?__fake=mock()';

test.serial('connector bootstrap', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();

  pubsub(connector);

  t.is(connector.on.calls, 2);
  t.is(connector.on.values.pop()[0], 'error');
  t.is(connector.on.values.pop()[0], 'message');
});

test.serial('connector subscribe request', async (t) => {
  const pubsub = await loadPubsub();
  const connector = await loadConnector();

  const { subscribe } = pubsub(connector);
  const subscriber = () => {};
  subscribe('channel', subscriber);

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
  subscribe('channel', subscriber);
  unsubscribe('channel', subscriber);
  t.deepEqual(connector.send.values.pop()[0], {
    channel: 'channel',
    unsubscribe: true,
  });
});

test.serial('publish -> subscribe', async (t) => {
  const pubsub = await loadPubsub();

  receiver.reset();
  pubsub(connector()).subscribe('channel', receiver);
  pubsub().publish('channel', 123);

  t.is(receiver.values.pop()[0], 123);
});

test.serial('publish -> wait for subscriber', async (t) => {
  const pubsub = await loadPubsub();

  receiver.reset();
  const done = pubsub().publish('channel', 123);
  pubsub(connector()).subscribe('channel', receiver);

  await done;
  t.is(receiver.values.pop()[0], 123);
});

test.serial('publish as factory', async (t) => {
  const pubsub = await loadPubsub();

  receiver.reset();
  const publish = pubsub().publish('channel');
  pubsub(connector()).subscribe('channel', receiver);
  publish(123);
  publish(456);
  t.is(receiver.values.pop()[0], 456);
  t.is(receiver.values.pop()[0], 123);
});

test.serial('subscribe wait for publish', async (t) => {
  const pubsub = await loadPubsub();

  receiver.reset();
  const subscribe = pubsub(connector()).subscribe('channel');
  pubsub().publish('channel', 123);

  const message = await subscribe;
  t.is(message, 123);
});

test.serial('publish -> subscribe to self is ignored', async (t) => {
  const pubsub = await loadPubsub();

  const { publish, subscribe } = pubsub();

  receiver.reset();
  subscribe('channel', receiver);
  publish('channel', 123);

  t.is(receiver.calls, 0);
});

test.serial('unsubscribe', async (t) => {
  const pubsub = await loadPubsub();

  const { publish } = pubsub();

  receiver.reset();
  pubsub(connector()).subscribe('channel', receiver);
  publish('channel', 123);

  pubsub(connector()).unsubscribe('channel', receiver);
  publish('channel', 123);

  t.is(receiver.calls, 1);
});

test.serial('once', async (t) => {
  const pubsub = await loadPubsub();

  const { publish } = pubsub();

  receiver.reset();
  pubsub(connector()).once('channel', receiver);
  publish('channel', 123);
  publish('channel', 123);

  t.is(receiver.calls, 1);
});

test.serial('broadcast to multiple connectors', async (t) => {
  const pubsub = await loadPubsub();

  receiver.reset();
  pubsub(connector()).subscribe('channel', receiver);
  pubsub(connector()).subscribe('channel', receiver);

  pubsub().publish('channel', 123);

  t.is(receiver.calls, 2);
});
