let activeLock = null;

function isSupported() {
    return typeof navigator.wakeLock?.request === "function";
}

async function request(type = "screen") {
    if (!isSupported())
        throw new Error("The Screen Wake Lock API is not supported in this browser.");
    activeLock = await navigator.wakeLock.request(type);
    const lock = activeLock;
    lock.addEventListener("release", () => {
        if (activeLock === lock) activeLock = null;
    }, { once: true });
    return lock;
}

async function release() {
    if (!activeLock) return false;
    const lock = activeLock;
    activeLock = null;
    await lock.release();
    return true;
}

export default { isSupported, request, release };
