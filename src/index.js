import Actions from "@cocreate/actions";
import Observer from "@cocreate/observer";

const selector = "[wake-lock]";
const initializedElements = new WeakSet();
const elementLocks = new WeakMap();
const lockOwners = new WeakMap();
const activeLocks = new Set();
const handledReleases = new WeakSet();
let activeLock = null;

/**
 *
 * @public
 * @environment client
 */
function isSupported() {
	return typeof navigator !== "undefined" &&
		typeof navigator.wakeLock?.request === "function";
}

/**
 *
 * @public
 * @environment client
 */
async function request(type = "screen", element) {
	if (!isSupported())
		throw new Error("The Screen Wake Lock API is not supported in this browser.");

	if (element) {
		const currentLock = elementLocks.get(element);
		if (currentLock && !currentLock.released) {
			if (currentLock.type === type) return currentLock;
			await release(currentLock);
		}
	}

	const lock = await navigator.wakeLock.request(type);
	activeLocks.add(lock);
	activeLock = lock;
	lock.addEventListener("release", () => handleRelease(lock), { once: true });
	if (element) {
		lockOwners.set(lock, element);
		elementLocks.set(element, lock);
		element.wakeLock = lock;
		setElementState(element, true, lock.type);
	}
	return lock;
}

/**
 *
 * @public
 * @environment client
 */
async function release(target) {
	const lock = getLock(target);
	if (!lock || lock.released) {
		if (target && !isWakeLockSentinel(target)) setElementState(target, false);
		return false;
	}

	await lock.release();
	handleRelease(lock);
	return true;
}

function getLock(target) {
	if (isWakeLockSentinel(target)) return target;
	if (target) return elementLocks.get(target);
	if (activeLock && !activeLock.released) return activeLock;

	for (const lock of activeLocks) {
		if (!lock.released) activeLock = lock;
	}
	return activeLock;
}

function isWakeLockSentinel(value) {
	return Boolean(value && typeof value.release === "function" && "released" in value);
}

function handleRelease(lock) {
	if (handledReleases.has(lock)) return;
	handledReleases.add(lock);
	activeLocks.delete(lock);
	if (activeLock === lock) activeLock = null;

	const element = lockOwners.get(lock);
	if (!element) return;
	if (elementLocks.get(element) === lock) elementLocks.delete(element);
	setElementState(element, false, lock.type);
	element.dispatchEvent(new CustomEvent("wakeLockReleased", {
		bubbles: true,
		detail: { type: lock.type, lock }
	}));
}

function setElementState(element, active, type) {
	if (!element?.setAttribute) return;
	element.setAttribute("wake-lock", String(active));
	element.dispatchEvent(new CustomEvent("wakeLockChange", {
		bubbles: true,
		detail: { active, type, lock: element.wakeLock || null }
	}));
}

function init(root = document) {
	const elements = [];
	if (root?.matches?.(selector)) elements.push(root);
	if (root?.querySelectorAll) elements.push(...root.querySelectorAll(selector));

	for (const element of elements) {
		if (initializedElements.has(element)) continue;
		initializedElements.add(element);

		if (!elementLocks.has(element) && element.getAttribute("wake-lock") !== "false")
			element.setAttribute("wake-lock", "false");

		element.addEventListener("click", () => {
			// An explicit Actions chain owns this click and performs the transition.
			if (element.hasAttribute("actions")) return;

			const lock = elementLocks.get(element);
			const operation = lock && !lock.released
				? release(element)
				: request(element.getAttribute("wake-lock-type") || undefined, element);
			operation.catch((error) => dispatchError(element, error));
		});
	}
}

function dispatchError(element, error) {
	element?.dispatchEvent(new CustomEvent("wakeLockError", {
		bubbles: true,
		detail: { error }
	}));
	console.error("Wake Lock operation failed:", error);
}

async function runAction(action) {
	try {
		switch (action.method) {
			case "request": {
				const type = action.params || action.element.getAttribute("wake-lock-type") || undefined;
				const lock = await request(type, action.element);
				action.end({ active: !lock.released, type: lock.type, lock });
				break;
			}
			case "release": {
				const released = await release(elementLocks.get(action.element) || undefined);
				action.end({ active: false, released });
				break;
			}
			default:
				throw new Error(`Unsupported wake-lock action: ${action.method || "missing method"}.`);
		}
	} catch (error) {
		action.abort(error);
	}
}

Actions.init({ name: "wakeLock", callback: runAction });

Observer.init({
	name: "CoCreateWakeLockAddedNodes",
	types: ["addedNodes"],
	selector,
	callback: (mutation) => init(mutation.target)
});

Observer.init({
	name: "CoCreateWakeLockAttributes",
	types: ["attributes"],
	attributeFilter: ["wake-lock", "wake-lock-type"],
	selector,
	callback: (mutation) => init(mutation.target)
});

init();

export { isSupported, request, release };
export default { isSupported, request, release };

/**
 *
 * @name actions
 * @kind member
 * @attribute
 * @environment client
 */

/**
 *
 * @name wake-lock
 * @kind member
 * @attribute
 * @environment client
 */

/**
 *
 * @name wake-lock-type
 * @kind member
 * @attribute
 * @environment client
 */

/**
 * Helpers for the browser Screen Wake Lock API.
 *
 * @module wake-lock
 * @environment client
 */

/**
 * Declarative selectors recognized by this module.
 *
 * @name declarative-selectors
 * @kind member
 * @selectors
 * @environment client
 * @example
 * ```json
 * [
 *   "[wake-lock]"
 * ]
 * ```
 */

/**
 * Declarative actions supported or registered by this module.
 *
 * @name declarative-actions
 * @kind member
 * @actions
 * @environment client
 * @example
 * ```json
 * [
 *   {
 *     "name": "wakeLock"
 *   }
 * ]
 * ```
 */
