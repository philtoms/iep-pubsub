const connect = (dispatcher, connection, ...options) =>
  typeof connection === 'function'
    ? Promise.resolve(connection(...options))
    : connection instanceof Promise
    ? connection.then((connection) =>
        connect(dispatcher, connection, ...options)
      )
    : Promise.all([
        import('./child_process.js').then((module) => module.default),
        import('./worker_thread.js').then((module) => module.default),
        import('./net.js').then((module) => module.default),
      ]).then(
        ([worker_thread, child_process, net]) =>
          worker_thread(connection, ...options) ||
          child_process(connection, ...options) ||
          net(connection, ...options) ||
          dispatcher
      );

export default connect;
