const subscribers = {};
const routers = new Set();
const callbacks = [];

// in-process router with IPC api
const inprocRouter = {
  // send is process -> [worker] -> send
  send: (message) => {
    routers.forEach((worker) => worker !== primeRouter && worker.send(message));
  },
  // on is register in-process subscription
  on: (message, subscriber) =>
    message === 'message' && callbacks.push(subscriber),
};

let primeRouter;
export default (worker) => {
  if (!worker) worker = primeRouter || inprocRouter;
  if (!primeRouter) primeRouter = worker;

  if (!routers.has(worker)) {
    routers.add(worker);
    worker.on('message', ({ channel, ...message }) => {
      subscribers[channel] &&
        subscribers[channel].forEach((subscriber) => subscriber(message));
    });
    worker.on('error', function (err) {
      if (err.code == 'EPIPE') {
        if (worker.connected) worker.disconnect();
        routers.delete(worker);
        routers.forEach(
          (worker) => !worker.connected && routers.delete(worker)
        );
      }
    });
  }

  const pubsub = {
    publish: (channel, message) => {
      if (!message) return pubsub.publish.bind(null, channel);
      worker.send({ channel, ...message });
    },

    subscribe: (channel, subscriber) => {
      subscribers[channel] = subscribers[channel] || [];
      subscribers[channel].push(subscriber);
      return subscriber;
    },

    once: (channel, subscriber) => {
      const once = (message) => {
        subscriber(message);
        pubsub.unsubscribe(channel, once);
      };
      return pubsub.subscribe(channel, once);
    },

    unsubscribe: (channel, unsubscribe) => {
      subscribers[channel] = subscribers[channel].filter(
        (subscriber) => subscriber !== unsubscribe
      );
      if (!subscribers[channel].length) {
        Reflect.deleteProperty(subscribers, channel);
      }
    },
  };

  return pubsub;
};
