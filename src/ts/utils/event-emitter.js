class EventEmitter {
  constructor() {
    this.events = {};
  }
  /**
   * Subscribe to an event
   * @param event - Event name
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }
  /**
   * Emit an event
   * @param event - Event name
   * @param args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(...args));
    }
  }
  /**
   * Remove all listeners for an event (or all events)
   * @param event - Event name (omit to clear all)
   */
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
  /**
   * Get listener count for an event
   * @param event - Event name
   */
  listenerCount(event) {
    return this.events[event]?.length ?? 0;
  }
}
function debounce(func, wait) {
  let timeout = null;
  return ((...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  });
}
export {
  EventEmitter,
  debounce
};
//# sourceMappingURL=event-emitter.js.map
