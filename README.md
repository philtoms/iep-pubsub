# iep-pubsub

A simple pub-sub that defaults to process IPC via `send -> on` semantics.

This pubsub can be configured to broadcast a single message to multiple subscribers across process boundaries.

## Usage (in process)

```
import pubsub from 'iep-pubsub'

const {publish, subscribe, unsubscribe, once} = pubsub()

const subscriber =  message => console.log(message)

subscribe('channel', subscriber)
once('channel', subscriber)

publish('channel', 'hello')
// 'hello'
// 'hello'

publish('channel', 'world')
// 'world'

unsubscribe('channel', subscriber)
publish('channel', 'still there?')
//
```

### using IPC

```
// master.mjs
import { fork } from 'child_process';
import pubsub from 'iep-pubsub'

const child = fork('./child.mjs')

// use the child process as the pubsub router
const {publish} = pubsub(child)
publish('channel', 'hello')
```

```
// child.mjs
import pubsub from 'iep-pubsub'

// use the child process as the pubsub router
const {subscribe} = pubsub(process)
subscribe('channel', message => console.log(message))
```

### Broadcasting (using inproc and IPC together)

```
// master.mjs
import { fork } from 'child_process';
import pubsub from 'iep-pubsub'

const {publish} = pubsub()

const addChild = () => {
  const child = fork('./child.mjs')
  const {subscribe} = pubsub(child)

  // broadcast this received message to all other subscribers
  subscribe('channel', publish)
  return child;
}

addChild()
addChild()

publish('channel', 'hello')
// hello
// hello
```
