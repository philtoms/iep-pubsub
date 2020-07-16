# Tests

To run tests

```
yarn run tests
```

## Example connector tests

This folder contains working examples of the following supported connector types

- child_process
- worker_thread
- net (ipc)
- net (tcp)

The tests are the same across all connector types with the exception of the tcp tests in which only one of the tests is enabled at a time. The supporting test runner is not sophisticated enough to ensure that the tcp ports (default 8081 and 8082) are available for successive tests.

Run each of the tests in its own folder with the command

```
node  --loader esm-fake-loader ./master.js

```

Or with node debugger

```
node  --inspect-brk --loader esm-fake-loader ./master.js

```

If you need to debug the client code you can uncomment the `--inspect-brk` argument in the connection.js file.
