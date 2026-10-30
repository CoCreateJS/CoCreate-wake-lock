# CoCreate Wake Lock

Declarative and programmatic access to the browser Screen Wake Lock API.

## Install

```sh
yarn add @cocreate/wake-lock
```

## JavaScript API

`request(type = "screen", element?)` passes the requested type to `navigator.wakeLock.request(type)` and defaults to `"screen"` in JavaScript when no type is supplied. It returns the native `WakeLockSentinel`, including its `type`, `released`, `release()`, and `release` event. If an element is supplied, the module tracks the sentinel on that element and reflects its active state in `wake-lock`. `release()` releases the latest module-managed lock; pass a sentinel or its owning element to release that specific lock.

```js
const lock = await CoCreate.wakeLock.request();
console.log(lock.type, lock.released);
await CoCreate.wakeLock.release(lock);
```

The current Screen Wake Lock API defines only `"screen"`. The type is passed through without CoCreate-specific remapping; future types supported by the browser can be passed the same way.

## Attribute toggle

Add `wake-lock` to a clickable element to make it toggle a screen wake lock. The component updates the attribute to `"true"` only after the native request succeeds, and to `"false"` when the sentinel is released. `wake-lock-type` supplies the native type; when omitted, the JavaScript request function defaults to `"screen"`.

```html
<button wake-lock="false" wake-lock-type="screen">
    Keep screen awake
</button>
```

Use CSS selectors such as `[wake-lock="true"]` and `[wake-lock="false"]` to reflect the actual state. A browser or operating system release updates the attribute too.

## Actions

Use the explicit Actions methods when the request or release belongs in an action chain. An action parameter takes precedence over `wake-lock-type`; with neither supplied, JavaScript defaults to `"screen"`.

```html
<button actions="wakeLock.request(screen)">Keep screen awake</button>
<button actions="wakeLock.release">Allow screen to sleep</button>
```

If an element has an `actions` attribute, its click is controlled by that action chain rather than the attribute toggle listener. The request action stores its sentinel on the action element, and a release action without its own sentinel releases the latest active module-managed lock.

The API requires a secure context and a visible, active document. The browser may release a lock when the page becomes hidden or when system conditions require it. See the [demo](demo/index.html) and [documentation](docs/index.html).
