import { parentPort, threadId } from 'worker_threads';

export default (connection) => {
  // new worker connection
  if (!connection && threadId) {
    return {
      id: `${process.pid}.${threadId}`,
      send: (message) => parentPort.postMessage(message),
      on: (event, subscriber) => parentPort.on(event, subscriber),
      close: () => parentPort.close(),
    };
  }
  // worker connection already established
  else if (connection && connection.id === threadId) return connection;
  else return false;
};
