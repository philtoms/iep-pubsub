export default (connection) => {
  // new child connection
  if (!connection && process.send) {
    return {
      id: process.pid,
      send: (message) => process.send(message),
      on: (event, subscriber) => process.on(event, subscriber),
      close: () => process.disconnect(),
    };
  }
  // connection already established
  else if (connection && connection.id) {
    return connection;
  } // wrap process
  else if (connection && connection.send) {
    return {
      id: connection.pid,
      send: (message) => connection.send(message),
      on: (event, subscriber) => connection.on(event, subscriber),
    };
  } else return false;
};
