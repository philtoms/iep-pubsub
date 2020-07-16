const subscribers = {};
const connections = {};

const dispatcher = {
  id: Symbol('dispatcher-id'),
  send: (payload, resolve) => {
    const { channel, id, message } = payload;
    // wait for first subscriber
    if (!subscribers[channel]) {
      return new Promise((resolve) => {
        setTimeout(() => dispatcher.send(payload, resolve), 100);
      });
    }

    subscribers[channel]
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
    if (resolve) resolve(true);
  },
  on: (payload) => {
    const { channel, id, message } = payload;
    subscribers[channel].forEach(({ subscriber, sid }) => {
      if (id === sid) {
        if (typeof subscriber === 'function') {
          subscriber(message);
        }
      } else {
        if (typeof subscriber === 'function') {
          subscriber(message);
        } else if (connections[sid]) {
          connections[sid].send({ channel, message });
        }
      }
    });
  },
};

export default (worker = dispatcher) => {
  const id = worker.pid || worker.id;

  if (worker !== dispatcher && !connections[id]) {
    connections[id] = worker;

    worker.on('message', (payload) => {
      const { channel, subscribe, unsubscribe, message } = payload;
      if (subscribe) {
        pubsub.subscribe(channel, id);
      } else if (unsubscribe) {
        pubsub.unsubscribe(channel, id);
      } else {
        dispatcher.on({ channel, id, message });
      }
    });

    worker.on('error', function (err) {
      console.log(process.pid, 'error', err);
      if (err.code == 'EPIPE') {
        if (worker.connected) worker.disconnect();
        Reflect.deleteProperty(connections, id);
      }
    });
  }

  const pubsub = {
    publish: (channel, message) => {
      if (message === undefined) return pubsub.publish.bind(null, channel);
      return dispatcher.send({ channel, id, message });
    },

    subscribe: (channel, subscriber) => {
      if (subscriber === undefined) {
        return new Promise((resolve) =>
          pubsub.subscribe(channel, (message) => {
            resolve(message);
          })
        );
      }
      subscribers[channel] = subscribers[channel] || [];
      if (typeof subscriber === 'function') {
        subscribers[channel].push({ sid: id, subscriber });
        if (worker !== dispatcher) {
          worker.send({
            channel,
            subscribe: true,
          });
        }
      } else {
        subscribers[channel].push({ sid: subscriber });
      }
      return subscriber;
    },

    once: (channel, subscribe) => {
      const once = (message) => {
        subscribe(message);
        pubsub.unsubscribe(channel, once);
      };
      return pubsub.subscribe(channel, once);
    },

    unsubscribe: (channel, subscriber) => {
      subscribers[channel] = subscribers[channel].filter((entry) => {
        if (entry.subscriber === subscriber || entry.sid === subscriber) {
          if (typeof subscriber === 'function') {
            if (worker !== dispatcher) {
              worker.send({
                channel,
                unsubscribe: true,
              });
            }
          }
          return false;
        }
        return true;
      });
      if (!subscribers[channel].length) {
        Reflect.deleteProperty(subscribers, channel);
      }
    },
  };

  return pubsub;
};
