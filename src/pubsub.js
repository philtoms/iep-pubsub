import connect from './connectors/index.js';

const subscribers = {};
const connections = {};

const subscribed = (channel) => {
  subscribers[channel] = subscribers[channel] || [];
  return subscribers[channel];
};

const dispatcher = {
  id: Symbol('dispatcher-id'),
  send: (payload, resolve) => {
    const { channel, id, message } = payload;
    // wait for first subscriber
    if (!subscribers[channel]) {
      setTimeout(() => dispatcher.send(payload, resolve), 100);
    } else {
      subscribed(channel)
        .reduce((acc, { subscriber, sid }) => {
          if (id === sid) {
            if (connections[sid] && sid !== dispatcher.id) {
              acc.add(sid);
            }
          } else {
            if (typeof subscriber === 'function') {
              subscriber(message);
            } else if (connections[sid]) {
              acc.add(sid);
            }
          }
          return acc;
        }, new Set())
        .forEach((sid) => connections[sid].send({ channel, message }));
    }
  },
  on: (payload) => {
    const { channel, id, message } = payload;
    subscribed(channel).forEach(async ({ subscriber, sid }) => {
      if (id === sid) {
        if (typeof subscriber === 'function') {
          subscriber(message);
        }
      } else {
        if (typeof subscriber === 'function') {
          subscriber(message);
        } else if (connections[sid]) {
          (await connections[sid]).send({ channel, message });
        }
      }
    });
  },
};

export default (...options) => {
  const worker = connect(dispatcher, ...options).then((worker) => {
    const id = worker.id;

    if (worker !== dispatcher && !connections[id]) {
      worker.on('message', (payload) => {
        const { channel, subscribe, unsubscribe, message, close } = payload;
        if (subscribe) {
          pubsub.subscribe(channel, id);
        } else if (unsubscribe) {
          pubsub.unsubscribe(channel, id);
        } else if (close) {
          Reflect.deleteProperty(connections, id);
        } else {
          dispatcher.on({ channel, id, message });
        }
      });
    }

    return (connections[id] = worker);
  });

  const pubsub = {
    connection: worker,
    publish: (channel, message) => {
      if (message === undefined) return pubsub.publish.bind(null, channel);
      return worker.then(async (connection) => {
        const id = connection.id;
        dispatcher.send({ channel, id, message });
      });
    },

    subscribe: async (channel, subscriber) => {
      if (subscriber === undefined) {
        return new Promise((resolve) =>
          pubsub.subscribe(channel, (message) => {
            resolve(message);
          })
        );
      }
      if (typeof subscriber === 'function') {
        const connection = await worker;
        const id = connection.id;
        subscribed(channel).push({ sid: id, subscriber });
        if (connection !== dispatcher) {
          connection.send({
            channel,
            subscribe: true,
          });
        }
      } else {
        subscribed(channel).push({ sid: subscriber });
      }
      return subscriber;
    },

    once: (channel, subscriber) => {
      const once = (message) => {
        subscriber(message);
        pubsub.unsubscribe(channel, once);
      };
      return pubsub.subscribe(channel, once);
    },

    unsubscribe: async (channel, subscriber) => {
      const connection = await worker;
      subscribers[channel] = subscribed(channel).filter((entry) => {
        if (
          entry.subscriber === subscriber ||
          entry.sid === subscriber ||
          !subscriber
        ) {
          if (!subscriber || typeof subscriber === 'function') {
            if (connection !== dispatcher) {
              connection.send({
                channel,
                unsubscribe: true,
              });
            }
          }
          return false;
        }
        return true;
      });
      if (!subscribed(channel).length) {
        Reflect.deleteProperty(subscribers, channel);
      }
    },

    close: async () => {
      const connection = await worker;
      connection.send({ close: true });
      if (connection.close) {
        connection.close();
      }
    },
  };

  return pubsub;
};
