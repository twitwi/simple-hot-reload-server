'use strict';

/**
 * Created by moyu on 2017/3/28.
 */

var chokidar = require('chokidar');
var util = require('util');

function FileWatcher(filename, options) {
    this.options = Object.assign({ ignoreInitial: true, cwd: filename }, options);
    this.filename = filename;
    this.__watch = chokidar.watch(filename, this.options);
    return this;
}

FileWatcher.prototype = {
    constructor: FileWatcher,
    unwatch: function unwatch() {
        this.__watch.close();
        delete this;
    },
    close: function close() {
        return this.unwatch();
    },
    on: function on(type, func) {
        func = func.bind(this);
        arguments[1] = func;
        return this.__watch.on.apply(this.__watch, arguments);
    },
    once: function once(type, func) {
        func = func.bind(this);
        arguments[1] = func;
        return this.__watch.once.apply(this.__watch, arguments);
    }
};

module.exports = FileWatcher;