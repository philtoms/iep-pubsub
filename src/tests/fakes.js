import mock from 'mock?__fake=mock(()=>({on: mock(), send: mock()}))';
// dynamic imports
export const load = (path, fake) =>
  import(`${path}.js?__fake=${fake}`).then((module) => module.default);

export const loadPubsub = () => load('../pubsub', 'reload');

export const loadConnector = () =>
  load('connector', '{id: 1, on: mock(), send: mock()}');

export { mock };

export const asyncMock = (test) => {
  let resolved;
  const done = new Promise((resolve) => {
    resolved = resolve;
  });
  return {
    done,
    send: (...args) => {
      if (!test || test(...args)) {
        resolved(...args);
      }
    },
    on: (...args) => {
      if (!test || test(...args)) {
        resolved(...args);
      }
    },
  };
};

export const connector = (id = 'fake', remote) => {
  const handlers = {};
  const send = remote || ((message) => {});
  return {
    id,
    // outgoing message to remote handler
    send,
    // incoming message to pubsub dispatcher
    on: (event, handler) => (handlers[event] = handler),
  };
};
