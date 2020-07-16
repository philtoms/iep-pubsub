// dynamic imports
export const load = (path, fake) =>
  import(`${path}.mjs?__fake=${fake}`).then((module) => module.default);

export const loadPubsub = () => load('../pubsub', 'reload');

export const loadConnector = () =>
  load('connector', '{id: 1, on: mock(), send: mock()}');

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
