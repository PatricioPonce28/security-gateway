const { EventEmitter } = require("events");

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  emitRequest(data) {
    this.emit("request", {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

module.exports = new EventBus();