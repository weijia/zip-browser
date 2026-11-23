(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from3, except, desc) => {
    if (from3 && typeof from3 === "object" || typeof from3 === "function") {
      for (let key of __getOwnPropNames(from3))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from3[key], enumerable: !(desc = __getOwnPropDesc(from3, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });

  // node_modules/eventemitter3/index.js
  var require_eventemitter3 = __commonJS({
    "node_modules/eventemitter3/index.js"(exports, module) {
      "use strict";
      var has = Object.prototype.hasOwnProperty;
      var prefix = "~";
      function Events() {
      }
      if (Object.create) {
        Events.prototype = /* @__PURE__ */ Object.create(null);
        if (!new Events().__proto__) prefix = false;
      }
      function EE(fn, context, once2) {
        this.fn = fn;
        this.context = context;
        this.once = once2 || false;
      }
      function addListener(emitter, event, fn, context, once2) {
        if (typeof fn !== "function") {
          throw new TypeError("The listener must be a function");
        }
        var listener = new EE(fn, context || emitter, once2), evt = prefix ? prefix + event : event;
        if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
        else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
        else emitter._events[evt] = [emitter._events[evt], listener];
        return emitter;
      }
      function clearEvent(emitter, evt) {
        if (--emitter._eventsCount === 0) emitter._events = new Events();
        else delete emitter._events[evt];
      }
      function EventEmitter3() {
        this._events = new Events();
        this._eventsCount = 0;
      }
      EventEmitter3.prototype.eventNames = function eventNames() {
        var names = [], events, name;
        if (this._eventsCount === 0) return names;
        for (name in events = this._events) {
          if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
        }
        if (Object.getOwnPropertySymbols) {
          return names.concat(Object.getOwnPropertySymbols(events));
        }
        return names;
      };
      EventEmitter3.prototype.listeners = function listeners(event) {
        var evt = prefix ? prefix + event : event, handlers = this._events[evt];
        if (!handlers) return [];
        if (handlers.fn) return [handlers.fn];
        for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
          ee[i] = handlers[i].fn;
        }
        return ee;
      };
      EventEmitter3.prototype.listenerCount = function listenerCount(event) {
        var evt = prefix ? prefix + event : event, listeners = this._events[evt];
        if (!listeners) return 0;
        if (listeners.fn) return 1;
        return listeners.length;
      };
      EventEmitter3.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
        var evt = prefix ? prefix + event : event;
        if (!this._events[evt]) return false;
        var listeners = this._events[evt], len = arguments.length, args, i;
        if (listeners.fn) {
          if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
          switch (len) {
            case 1:
              return listeners.fn.call(listeners.context), true;
            case 2:
              return listeners.fn.call(listeners.context, a1), true;
            case 3:
              return listeners.fn.call(listeners.context, a1, a2), true;
            case 4:
              return listeners.fn.call(listeners.context, a1, a2, a3), true;
            case 5:
              return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
            case 6:
              return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
          }
          for (i = 1, args = new Array(len - 1); i < len; i++) {
            args[i - 1] = arguments[i];
          }
          listeners.fn.apply(listeners.context, args);
        } else {
          var length = listeners.length, j;
          for (i = 0; i < length; i++) {
            if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
            switch (len) {
              case 1:
                listeners[i].fn.call(listeners[i].context);
                break;
              case 2:
                listeners[i].fn.call(listeners[i].context, a1);
                break;
              case 3:
                listeners[i].fn.call(listeners[i].context, a1, a2);
                break;
              case 4:
                listeners[i].fn.call(listeners[i].context, a1, a2, a3);
                break;
              default:
                if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                  args[j - 1] = arguments[j];
                }
                listeners[i].fn.apply(listeners[i].context, args);
            }
          }
        }
        return true;
      };
      EventEmitter3.prototype.on = function on(event, fn, context) {
        return addListener(this, event, fn, context, false);
      };
      EventEmitter3.prototype.once = function once2(event, fn, context) {
        return addListener(this, event, fn, context, true);
      };
      EventEmitter3.prototype.removeListener = function removeListener(event, fn, context, once2) {
        var evt = prefix ? prefix + event : event;
        if (!this._events[evt]) return this;
        if (!fn) {
          clearEvent(this, evt);
          return this;
        }
        var listeners = this._events[evt];
        if (listeners.fn) {
          if (listeners.fn === fn && (!once2 || listeners.once) && (!context || listeners.context === context)) {
            clearEvent(this, evt);
          }
        } else {
          for (var i = 0, events = [], length = listeners.length; i < length; i++) {
            if (listeners[i].fn !== fn || once2 && !listeners[i].once || context && listeners[i].context !== context) {
              events.push(listeners[i]);
            }
          }
          if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
          else clearEvent(this, evt);
        }
        return this;
      };
      EventEmitter3.prototype.removeAllListeners = function removeAllListeners(event) {
        var evt;
        if (event) {
          evt = prefix ? prefix + event : event;
          if (this._events[evt]) clearEvent(this, evt);
        } else {
          this._events = new Events();
          this._eventsCount = 0;
        }
        return this;
      };
      EventEmitter3.prototype.off = EventEmitter3.prototype.removeListener;
      EventEmitter3.prototype.addListener = EventEmitter3.prototype.on;
      EventEmitter3.prefixed = prefix;
      EventEmitter3.EventEmitter = EventEmitter3;
      if ("undefined" !== typeof module) {
        module.exports = EventEmitter3;
      }
    }
  });

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint82, start, end) {
        var tmp;
        var output2 = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint82[i2] << 16 & 16711680) + (uint82[i2 + 1] << 8 & 65280) + (uint82[i2 + 2] & 255);
          output2.push(tripletToBase64(tmp));
        }
        return output2.join("");
      }
      function fromByteArray(uint82) {
        var tmp;
        var len2 = uint82.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint82, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint82[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint82[len2 - 2] << 8) + uint82[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer13;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer13.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer13.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer13.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer13.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer13.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer13.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer13.prototype);
        return buf;
      }
      function Buffer13(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from3(arg, encodingOrOffset, length);
      }
      Buffer13.poolSize = 8192;
      function from3(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer13.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer13.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer13.from = function(value, encodingOrOffset, length) {
        return from3(value, encodingOrOffset, length);
      };
      Object.setPrototypeOf(Buffer13.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer13, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer13.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer13.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer13.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer13.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = byteLength(string, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array2) {
        const length = array2.length < 0 ? 0 : checked(array2.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
          buf[i] = array2[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array2, byteOffset, length) {
        if (byteOffset < 0 || array2.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array2.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array2);
        } else if (length === void 0) {
          buf = new Uint8Array(array2, byteOffset);
        } else {
          buf = new Uint8Array(array2, byteOffset, length);
        }
        Object.setPrototypeOf(buf, Buffer13.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer13.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer13.alloc(+length);
      }
      Buffer13.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer13.prototype;
      };
      Buffer13.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer13.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer13.from(b, b.offset, b.byteLength);
        if (!Buffer13.isBuffer(a) || !Buffer13.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer13.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer13.concat = function concat(list3, length) {
        if (!Array.isArray(list3)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list3.length === 0) {
          return Buffer13.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list3.length; ++i) {
            length += list3[i].length;
          }
        }
        const buffer = Buffer13.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list3.length; ++i) {
          let buf = list3[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer13.isBuffer(buf)) buf = Buffer13.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer13.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer13.isBuffer(string)) {
          return string.length;
        }
        if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
          return string.byteLength;
        }
        if (typeof string !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
          );
        }
        const len = string.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer13.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer13.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer13.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer13.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer13.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer13.prototype.toString = function toString() {
        const length = this.length;
        if (length === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer13.prototype.toLocaleString = Buffer13.prototype.toString;
      Buffer13.prototype.equals = function equals(b) {
        if (!Buffer13.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer13.compare(this, b) === 0;
      };
      Buffer13.prototype.inspect = function inspect2() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer13.prototype[customInspectSymbol] = Buffer13.prototype.inspect;
      }
      Buffer13.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer13.from(target, target.offset, target.byteLength);
        }
        if (!Buffer13.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer13.from(val, encoding);
        }
        if (Buffer13.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read2(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read2(arr, i) === read2(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read2(arr, i + j) !== read2(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer13.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer13.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer13.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer13.prototype.write = function write2(string, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining) length = remaining;
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string, offset, length);
            case "base64":
              return base64Write(this, string, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string, offset, length);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer13.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer13.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer13.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer13.prototype.readUintLE = Buffer13.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer13.prototype.readUintBE = Buffer13.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer13.prototype.readUint8 = Buffer13.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer13.prototype.readUint16LE = Buffer13.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer13.prototype.readUint16BE = Buffer13.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer13.prototype.readUint32LE = Buffer13.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer13.prototype.readUint32BE = Buffer13.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer13.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer13.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer13.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer13.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer13.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer13.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer13.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer13.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer13.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer13.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer13.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer13.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer13.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer13.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer13.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer13.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer13.prototype.writeUintLE = Buffer13.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer13.prototype.writeUintBE = Buffer13.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer13.prototype.writeUint8 = Buffer13.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer13.prototype.writeUint16LE = Buffer13.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer13.prototype.writeUint16BE = Buffer13.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer13.prototype.writeUint32LE = Buffer13.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer13.prototype.writeUint32BE = Buffer13.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer13.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer13.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer13.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer13.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer13.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer13.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer13.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer13.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer13.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer13.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer13.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer13.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer13.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer13.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer13.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer13.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer13.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer13.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer13.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer13.isBuffer(val) ? val : Buffer13.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length}`,
          value
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        let codePoint;
        const length = string.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      }();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // node_modules/utilium/dist/buffer.js
  function extendBuffer(buffer, newByteLength) {
    if (buffer.byteLength >= newByteLength)
      return buffer;
    if (ArrayBuffer.isView(buffer)) {
      const newBuffer = extendBuffer(buffer.buffer, newByteLength);
      return new buffer.constructor(newBuffer, buffer.byteOffset, newByteLength);
    }
    const isShared = typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer;
    if (buffer.maxByteLength > newByteLength) {
      isShared ? buffer.grow(newByteLength) : buffer.resize(newByteLength);
      return buffer;
    }
    if (isShared) {
      const newBuffer = new SharedArrayBuffer(newByteLength);
      new Uint8Array(newBuffer).set(new Uint8Array(buffer));
      return newBuffer;
    }
    try {
      return buffer.transfer(newByteLength);
    } catch {
      const newBuffer = new ArrayBuffer(newByteLength);
      new Uint8Array(newBuffer).set(new Uint8Array(buffer));
      return newBuffer;
    }
  }
  var BufferView = class extends DataView {
    constructor(_buffer, _byteOffset, _byteLength) {
      const { buffer, byteOffset, byteLength } = new Uint8Array(_buffer, _byteOffset, _byteLength);
      super(buffer, byteOffset, byteLength);
    }
  };
  for (const key of Object.getOwnPropertyNames(DataView.prototype)) {
    if (!key.startsWith("get") && !key.startsWith("set"))
      continue;
    Object.defineProperty(BufferView.prototype, key, {
      value: () => {
        throw new ReferenceError("Do not use DataView methods on a BufferView.");
      },
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  // node_modules/utilium/dist/cache.js
  function addRange(ranges, start, end) {
    let i = ranges.length;
    while (i > 0 && ranges[i - 1].start > start)
      i--;
    const prev = ranges[i - 1];
    if (prev && prev.end >= start) {
      if (prev.end >= end)
        return;
      prev.end = end;
    } else {
      ranges.splice(i, 0, { start, end });
      i++;
    }
    const merged = ranges[i - 1];
    let j = i;
    while (j < ranges.length && ranges[j].start <= merged.end) {
      merged.end = Math.max(merged.end, ranges[j].end);
      j++;
    }
    if (j > i)
      ranges.splice(i, j - i);
  }
  var Resource = class {
    constructor(id, _size, options, resources) {
      __publicField(this, "id");
      __publicField(this, "_size");
      __publicField(this, "options");
      /** Regions used to reduce unneeded allocations. Think of sparse arrays. */
      __publicField(this, "regions", []);
      this.id = id;
      this._size = _size;
      this.options = options;
      options.sparse ?? (options.sparse = true);
      if (!options.growFactor || !Number.isFinite(options.growFactor) || options.growFactor < 1 || options.growFactor > 100)
        options.growFactor = 2;
      if (!options.sparse)
        this.regions.push({ offset: 0, data: new Uint8Array(_size), ranges: [] });
      resources?.set(id, this);
    }
    /** The full size of the resource */
    get size() {
      return this._size;
    }
    set size(value) {
      if (value >= this._size) {
        this._size = value;
        return;
      }
      this._size = value;
      for (let i = this.regions.length - 1; i >= 0; i--) {
        const region = this.regions[i];
        if (region.offset >= value) {
          this.regions.splice(i, 1);
          continue;
        }
        const maxLength = value - region.offset;
        if (region.data.byteLength > maxLength) {
          region.data = region.data.subarray(0, maxLength);
        }
        region.ranges = region.ranges.filter((range) => range.start < value).map((range) => {
          if (range.end > value) {
            return { start: range.start, end: value };
          }
          return range;
        });
      }
    }
    /**
     * Resize `region.data` to `length` bytes.
     * Capacity can be over-allocated geometrically so appending to a region repeatedly stays amortized O(1).
     */
    resizeRegion(region, length) {
      const { buffer, byteOffset } = region.data;
      if (buffer.byteLength - byteOffset >= length) {
        region.data = new Uint8Array(buffer, byteOffset, length);
        return;
      }
      const grown = new Uint8Array(Math.max(length, (buffer.byteLength - byteOffset) * this.options.growFactor));
      grown.set(region.data);
      region.data = grown.subarray(0, length);
    }
    /** Merge the region after `index` into the one at `index`, if the gap between them is small enough */
    mergeAt(index) {
      const current = this.regions[index];
      const next = this.regions[index + 1];
      if (!current || !next)
        return false;
      const { regionGapThreshold = 4095 } = this.options;
      if (next.offset - (current.offset + current.data.byteLength) > regionGapThreshold)
        return false;
      for (const range of next.ranges)
        addRange(current.ranges, range.start, range.end);
      const length = next.offset + next.data.byteLength - current.offset;
      if (length > current.data.byteLength)
        this.resizeRegion(current, length);
      current.data.set(next.data, next.offset - current.offset);
      this.regions.splice(index + 1, 1);
      return true;
    }
    /** Combines adjacent regions and combines adjacent ranges within a region */
    collect() {
      if (!this.options.sparse)
        return;
      for (let i = 0; i < this.regions.length - 1; )
        if (!this.mergeAt(i))
          i++;
    }
    /**
     * Combine the region at `index` with the neighbors it now reaches.
     * Only that region can have changed, so this does not re-walk the whole list the way `collect` does.
     */
    collectAt(index) {
      if (!this.options.sparse)
        return;
      if (index > 0 && this.mergeAt(index - 1))
        index--;
      while (this.mergeAt(index))
        ;
    }
    /** Takes an initial range and finds the sub-ranges that are not in the cache */
    missing(start, end) {
      const missingRanges = [];
      for (const region of this.regionsIn(start, end)) {
        for (const range of region.ranges) {
          if (range.end <= start)
            continue;
          if (range.start >= end)
            break;
          if (range.start > start) {
            missingRanges.push({ start, end: Math.min(range.start, end) });
          }
          if (range.end > start)
            start = Math.max(start, range.end);
          if (start >= end)
            break;
        }
        if (start >= end)
          break;
      }
      if (start < end)
        missingRanges.push({ start, end });
      return missingRanges;
    }
    /**
     * Get the cached sub-ranges of an initial range.
     * This is conceptually the inverse of `missing`.
     */
    cached(start, end) {
      const cachedRanges = [];
      for (const region of this.regionsIn(start, end)) {
        for (const range of region.ranges) {
          if (range.end <= start)
            continue;
          if (range.start >= end)
            break;
          cachedRanges.push({
            start: Math.max(start, range.start),
            end: Math.min(end, range.end)
          });
        }
      }
      cachedRanges.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const curr of cachedRanges) {
        const last = merged.at(-1);
        if (last && curr.start <= last.end) {
          last.end = Math.max(last.end, curr.end);
        } else {
          merged.push(curr);
        }
      }
      return merged;
    }
    /** Index of the first region positioned after `offset`. Regions are kept sorted, so this is a binary search. */
    indexAfter(offset) {
      let low = 0, high = this.regions.length;
      while (low < high) {
        const mid = low + high >> 1;
        if (this.regions[mid].offset > offset)
          high = mid;
        else
          low = mid + 1;
      }
      return low;
    }
    /** Get the region who's ranges include an offset */
    regionAt(offset) {
      const region = this.regions[this.indexAfter(offset) - 1];
      if (region && offset < region.offset + region.data.byteLength)
        return region;
    }
    /** The regions overlapping `[start, end)`, in order. Seeks to the first one rather than scanning from the start. */
    *regionsIn(start, end) {
      for (let i = Math.max(0, this.indexAfter(start) - 1); i < this.regions.length; i++) {
        const region = this.regions[i];
        if (region.offset >= end)
          return;
        if (region.offset + region.data.byteLength > start)
          yield region;
      }
    }
    /** Add new data to the cache at given specified offset */
    add(data, offset) {
      const end = offset + data.byteLength;
      const index = this.indexAfter(offset) - 1;
      const region = this.regions[index];
      if (region && offset < region.offset + region.data.byteLength) {
        if (end - region.offset > region.data.byteLength)
          this.resizeRegion(region, end - region.offset);
        region.data.set(data, offset - region.offset);
        addRange(region.ranges, offset, end);
        this.collectAt(index);
        return this;
      }
      this.regions.splice(index + 1, 0, { data, offset, ranges: [{ start: offset, end }] });
      this.collectAt(index + 1);
      return this;
    }
  };

  // node_modules/utilium/dist/checksum.js
  var crc32cTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let j = 0; j < 8; j++) {
      value = value & 1 ? 2197175160 ^ value >>> 1 : value >>> 1;
    }
    crc32cTable[i] = value;
  }
  function crc32c(data) {
    let crc = 4294967295;
    for (let i = 0; i < data.length; i++) {
      crc = crc >>> 8 ^ crc32cTable[(crc ^ data[i]) & 255];
    }
    return (crc ^ 4294967295) >>> 0;
  }

  // node_modules/eventemitter3/index.mjs
  var import_index = __toESM(require_eventemitter3(), 1);

  // node_modules/utilium/dist/list.js
  var _a;
  var List = class extends import_index.default {
    constructor(values) {
      super();
      __publicField(this, _a, "List");
      __publicField(this, "data", /* @__PURE__ */ new Set());
      if (values) {
        this.push(...values);
      }
    }
    toSet() {
      return new Set(this.data);
    }
    toArray() {
      return Array.from(this.data);
    }
    toJSON() {
      return Array.from(this.data);
    }
    toString() {
      return this.join(",");
    }
    _set(index, value, _delete = false) {
      if (Math.abs(index) > this.data.size) {
        throw new ReferenceError("Can not set an element outside the bounds of the list");
      }
      const data = Array.from(this.data);
      data.splice(index, +_delete, value);
      this.data = new Set(data);
      this.emit("update");
    }
    set(index, value) {
      this._set(index, value, true);
    }
    deleteAt(index) {
      if (Math.abs(index) > this.data.size) {
        throw new ReferenceError("Can not delete an element outside the bounds of the list");
      }
      this.delete(Array.from(this.data).at(index));
    }
    insert(value, index = this.data.size) {
      this._set(index, value, false);
    }
    // Array methods
    at(index) {
      if (Math.abs(index) > this.data.size) {
        throw new ReferenceError("Can not access an element outside the bounds of the list");
      }
      return Array.from(this.data).at(index);
    }
    pop() {
      const item = Array.from(this.data).pop();
      if (item !== void 0) {
        this.delete(item);
      }
      return item;
    }
    push(...items) {
      for (const item of items) {
        this.add(item);
      }
      return this.data.size;
    }
    join(separator) {
      return Array.from(this.data).join(separator);
    }
    splice(start, deleteCount, ...items) {
      if (Math.abs(start) > this.data.size) {
        throw new ReferenceError("Can not splice elements outside the bounds of the list");
      }
      const data = Array.from(this.data);
      const deleted = data.splice(start, deleteCount, ...items);
      this.data = new Set(data);
      this.emit("update");
      return deleted;
    }
    // Set methods
    add(value) {
      this.data.add(value);
      this.emit("update");
      this.emit("add", value);
      return this;
    }
    clear() {
      this.data.clear();
      this.emit("update");
    }
    delete(value) {
      const success = this.data.delete(value);
      this.emit("update");
      return success;
    }
    has(value) {
      return this.data.has(value);
    }
    get size() {
      return this.data.size;
    }
    // Iteration
    entries() {
      return this.toArray().entries();
    }
    keys() {
      return this.toArray().keys();
    }
    values() {
      return this.data.values();
    }
    [(_a = Symbol.toStringTag, Symbol.iterator)]() {
      return this.data[Symbol.iterator]();
    }
  };

  // node_modules/utilium/dist/objects.js
  function filterObject(object, predicate) {
    const entries2 = Object.entries(object);
    return Object.fromEntries(entries2.filter(([key, value]) => predicate(key, value)));
  }
  function pick(object, ...keys) {
    const picked = {};
    for (const key of keys.flat()) {
      picked[key] = object[key];
    }
    return picked;
  }
  function omit(object, ...keys) {
    return filterObject(object, (key) => !keys.flat().includes(key));
  }
  function isJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  function resolveConstructors(object) {
    const constructors = [];
    for (let prototype = object; prototype && !["Function", "Object"].includes(prototype.constructor.name); prototype = Object.getPrototypeOf(prototype)) {
      constructors.push(prototype.constructor.name);
    }
    return constructors;
  }
  function bindFunctions(fns, thisValue) {
    return Object.fromEntries(Object.entries(fns).map(([k, v]) => [k, typeof v == "function" ? v.bind(thisValue) : v]));
  }

  // node_modules/utilium/dist/misc.js
  function canary(error2 = new Error()) {
    const timeout = setTimeout(() => {
      throw error2;
    }, 5e3);
    return () => clearTimeout(timeout);
  }
  function _throw(e) {
    if (e && typeof e == "object" && resolveConstructors(e).includes("Error"))
      Error?.captureStackTrace(e, _throw);
    throw e;
  }
  function memoize(value, context) {
    if (!["getter", "accessor"].includes(context.kind))
      throw new Error("@memoize can only be used on getters and auto-accessors");
    const cache = /* @__PURE__ */ new WeakMap();
    function get3() {
      if (cache.has(this))
        return cache.get(this);
      const result = typeof value === "function" ? value.call(this) : value.get.call(this);
      cache.set(this, result);
      return result;
    }
    switch (context.kind) {
      case "getter":
        return get3;
      case "accessor":
        return { ...value, get: get3 };
    }
  }

  // node_modules/utilium/dist/random.js
  function randomInt(min = 0, max = 1) {
    return Math.round(Math.random() * (max - min) + min);
  }

  // node_modules/utilium/dist/string.js
  function capitalize(value) {
    return value.at(0).toUpperCase() + value.slice(1);
  }
  var encoder = new TextEncoder();
  function encodeUTF8(input) {
    return encoder.encode(input);
  }
  var decoder = new TextDecoder();
  function decodeUTF8(input) {
    if (!input)
      return "";
    if (input.buffer instanceof ArrayBuffer && !input.buffer.resizable)
      return decoder.decode(input);
    const buffer = new Uint8Array(input.byteLength);
    buffer.set(input);
    return decoder.decode(buffer);
  }
  function encodeUUID(uuid) {
    const hex3 = uuid.replace(/-/g, "");
    const data = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      data[i] = parseInt(hex3.slice(i * 2, i * 2 + 2), 16);
    }
    return data;
  }

  // node_modules/kerium/dist/error.js
  var Errno;
  (function(Errno2) {
    Errno2[Errno2["EPERM"] = 1] = "EPERM";
    Errno2[Errno2["ENOENT"] = 2] = "ENOENT";
    Errno2[Errno2["ESRCH"] = 3] = "ESRCH";
    Errno2[Errno2["EINTR"] = 4] = "EINTR";
    Errno2[Errno2["EIO"] = 5] = "EIO";
    Errno2[Errno2["ENXIO"] = 6] = "ENXIO";
    Errno2[Errno2["E2BIG"] = 7] = "E2BIG";
    Errno2[Errno2["ENOEXEC"] = 8] = "ENOEXEC";
    Errno2[Errno2["EBADF"] = 9] = "EBADF";
    Errno2[Errno2["ECHILD"] = 10] = "ECHILD";
    Errno2[Errno2["EAGAIN"] = 11] = "EAGAIN";
    Errno2[Errno2["ENOMEM"] = 12] = "ENOMEM";
    Errno2[Errno2["EACCES"] = 13] = "EACCES";
    Errno2[Errno2["EFAULT"] = 14] = "EFAULT";
    Errno2[Errno2["ENOTBLK"] = 15] = "ENOTBLK";
    Errno2[Errno2["EBUSY"] = 16] = "EBUSY";
    Errno2[Errno2["EEXIST"] = 17] = "EEXIST";
    Errno2[Errno2["EXDEV"] = 18] = "EXDEV";
    Errno2[Errno2["ENODEV"] = 19] = "ENODEV";
    Errno2[Errno2["ENOTDIR"] = 20] = "ENOTDIR";
    Errno2[Errno2["EISDIR"] = 21] = "EISDIR";
    Errno2[Errno2["EINVAL"] = 22] = "EINVAL";
    Errno2[Errno2["ENFILE"] = 23] = "ENFILE";
    Errno2[Errno2["EMFILE"] = 24] = "EMFILE";
    Errno2[Errno2["ENOTTY"] = 25] = "ENOTTY";
    Errno2[Errno2["ETXTBSY"] = 26] = "ETXTBSY";
    Errno2[Errno2["EFBIG"] = 27] = "EFBIG";
    Errno2[Errno2["ENOSPC"] = 28] = "ENOSPC";
    Errno2[Errno2["ESPIPE"] = 29] = "ESPIPE";
    Errno2[Errno2["EROFS"] = 30] = "EROFS";
    Errno2[Errno2["EMLINK"] = 31] = "EMLINK";
    Errno2[Errno2["EPIPE"] = 32] = "EPIPE";
    Errno2[Errno2["EDOM"] = 33] = "EDOM";
    Errno2[Errno2["ERANGE"] = 34] = "ERANGE";
    Errno2[Errno2["EDEADLK"] = 35] = "EDEADLK";
    Errno2[Errno2["ENAMETOOLONG"] = 36] = "ENAMETOOLONG";
    Errno2[Errno2["ENOLCK"] = 37] = "ENOLCK";
    Errno2[Errno2["ENOSYS"] = 38] = "ENOSYS";
    Errno2[Errno2["ENOTEMPTY"] = 39] = "ENOTEMPTY";
    Errno2[Errno2["ELOOP"] = 40] = "ELOOP";
    Errno2[Errno2["ENOMSG"] = 42] = "ENOMSG";
    Errno2[Errno2["EIDRM"] = 43] = "EIDRM";
    Errno2[Errno2["ECHRNG"] = 44] = "ECHRNG";
    Errno2[Errno2["EL2NSYNC"] = 45] = "EL2NSYNC";
    Errno2[Errno2["EL3HLT"] = 46] = "EL3HLT";
    Errno2[Errno2["EL3RST"] = 47] = "EL3RST";
    Errno2[Errno2["ENRNG"] = 48] = "ENRNG";
    Errno2[Errno2["EUNATCH"] = 49] = "EUNATCH";
    Errno2[Errno2["ECSI"] = 50] = "ECSI";
    Errno2[Errno2["EL2HLT"] = 51] = "EL2HLT";
    Errno2[Errno2["EBADE"] = 52] = "EBADE";
    Errno2[Errno2["EBADR"] = 53] = "EBADR";
    Errno2[Errno2["EXFULL"] = 54] = "EXFULL";
    Errno2[Errno2["ENOANO"] = 55] = "ENOANO";
    Errno2[Errno2["EBADRQC"] = 56] = "EBADRQC";
    Errno2[Errno2["EBADSLT"] = 57] = "EBADSLT";
    Errno2[Errno2["EBFONT"] = 59] = "EBFONT";
    Errno2[Errno2["ENOSTR"] = 60] = "ENOSTR";
    Errno2[Errno2["ENODATA"] = 61] = "ENODATA";
    Errno2[Errno2["ETIME"] = 62] = "ETIME";
    Errno2[Errno2["ENOSR"] = 63] = "ENOSR";
    Errno2[Errno2["ENONET"] = 64] = "ENONET";
    Errno2[Errno2["ENOPKG"] = 65] = "ENOPKG";
    Errno2[Errno2["EREMOTE"] = 66] = "EREMOTE";
    Errno2[Errno2["ENOLINK"] = 67] = "ENOLINK";
    Errno2[Errno2["EADV"] = 68] = "EADV";
    Errno2[Errno2["ESRMNT"] = 69] = "ESRMNT";
    Errno2[Errno2["ECOMM"] = 70] = "ECOMM";
    Errno2[Errno2["EPROTO"] = 71] = "EPROTO";
    Errno2[Errno2["EMULTIHOP"] = 72] = "EMULTIHOP";
    Errno2[Errno2["EDOTDOT"] = 73] = "EDOTDOT";
    Errno2[Errno2["EBADMSG"] = 74] = "EBADMSG";
    Errno2[Errno2["EOVERFLOW"] = 75] = "EOVERFLOW";
    Errno2[Errno2["ENOTUNIQ"] = 76] = "ENOTUNIQ";
    Errno2[Errno2["EBADFD"] = 77] = "EBADFD";
    Errno2[Errno2["EREMCHG"] = 78] = "EREMCHG";
    Errno2[Errno2["ELIBACC"] = 79] = "ELIBACC";
    Errno2[Errno2["ELIBBAD"] = 80] = "ELIBBAD";
    Errno2[Errno2["ELIBSCN"] = 81] = "ELIBSCN";
    Errno2[Errno2["ELIBMAX"] = 82] = "ELIBMAX";
    Errno2[Errno2["ELIBEXEC"] = 83] = "ELIBEXEC";
    Errno2[Errno2["EILSEQ"] = 84] = "EILSEQ";
    Errno2[Errno2["ERESTART"] = 85] = "ERESTART";
    Errno2[Errno2["ESTRPIPE"] = 86] = "ESTRPIPE";
    Errno2[Errno2["EUSERS"] = 87] = "EUSERS";
    Errno2[Errno2["ENOTSOCK"] = 88] = "ENOTSOCK";
    Errno2[Errno2["EDESTADDRREQ"] = 89] = "EDESTADDRREQ";
    Errno2[Errno2["EMSGSIZE"] = 90] = "EMSGSIZE";
    Errno2[Errno2["EPROTOTYPE"] = 91] = "EPROTOTYPE";
    Errno2[Errno2["ENOPROTOOPT"] = 92] = "ENOPROTOOPT";
    Errno2[Errno2["EPROTONOSUPPORT"] = 93] = "EPROTONOSUPPORT";
    Errno2[Errno2["ESOCKTNOSUPPORT"] = 94] = "ESOCKTNOSUPPORT";
    Errno2[Errno2["ENOTSUP"] = 95] = "ENOTSUP";
    Errno2[Errno2["EPFNOSUPPORT"] = 96] = "EPFNOSUPPORT";
    Errno2[Errno2["EAFNOSUPPORT"] = 97] = "EAFNOSUPPORT";
    Errno2[Errno2["EADDRINUSE"] = 98] = "EADDRINUSE";
    Errno2[Errno2["EADDRNOTAVAIL"] = 99] = "EADDRNOTAVAIL";
    Errno2[Errno2["ENETDOWN"] = 100] = "ENETDOWN";
    Errno2[Errno2["ENETUNREACH"] = 101] = "ENETUNREACH";
    Errno2[Errno2["ENETRESET"] = 102] = "ENETRESET";
    Errno2[Errno2["ECONNABORTED"] = 103] = "ECONNABORTED";
    Errno2[Errno2["ECONNRESET"] = 104] = "ECONNRESET";
    Errno2[Errno2["ENOBUFS"] = 105] = "ENOBUFS";
    Errno2[Errno2["EISCONN"] = 106] = "EISCONN";
    Errno2[Errno2["ENOTCONN"] = 107] = "ENOTCONN";
    Errno2[Errno2["ESHUTDOWN"] = 108] = "ESHUTDOWN";
    Errno2[Errno2["ETOOMANYREFS"] = 109] = "ETOOMANYREFS";
    Errno2[Errno2["ETIMEDOUT"] = 110] = "ETIMEDOUT";
    Errno2[Errno2["ECONNREFUSED"] = 111] = "ECONNREFUSED";
    Errno2[Errno2["EHOSTDOWN"] = 112] = "EHOSTDOWN";
    Errno2[Errno2["EHOSTUNREACH"] = 113] = "EHOSTUNREACH";
    Errno2[Errno2["EALREADY"] = 114] = "EALREADY";
    Errno2[Errno2["EINPROGRESS"] = 115] = "EINPROGRESS";
    Errno2[Errno2["ESTALE"] = 116] = "ESTALE";
    Errno2[Errno2["EEUCLEAN"] = 117] = "EEUCLEAN";
    Errno2[Errno2["ENOTNAM"] = 118] = "ENOTNAM";
    Errno2[Errno2["ENAVAIL"] = 119] = "ENAVAIL";
    Errno2[Errno2["EISNAM"] = 120] = "EISNAM";
    Errno2[Errno2["EREMOTEIO"] = 121] = "EREMOTEIO";
    Errno2[Errno2["EDQUOT"] = 122] = "EDQUOT";
    Errno2[Errno2["ENOMEDIUM"] = 123] = "ENOMEDIUM";
    Errno2[Errno2["EMEDIUMTYPE"] = 124] = "EMEDIUMTYPE";
    Errno2[Errno2["ECANCELED"] = 125] = "ECANCELED";
    Errno2[Errno2["ENOKEY"] = 126] = "ENOKEY";
    Errno2[Errno2["EKEYEXPIRED"] = 127] = "EKEYEXPIRED";
    Errno2[Errno2["EKEYREVOKED"] = 128] = "EKEYREVOKED";
    Errno2[Errno2["EKEYREJECTED"] = 129] = "EKEYREJECTED";
    Errno2[Errno2["EOWNERDEAD"] = 130] = "EOWNERDEAD";
    Errno2[Errno2["ENOTRECOVERABLE"] = 131] = "ENOTRECOVERABLE";
    Errno2[Errno2["ERFKILL"] = 132] = "ERFKILL";
    Errno2[Errno2["EHWPOISON"] = 133] = "EHWPOISON";
  })(Errno || (Errno = {}));
  var errnoMessages = {
    [Errno.EPERM]: "operation not permitted",
    [Errno.ENOENT]: "no such file or directory",
    [Errno.ESRCH]: "no such process",
    [Errno.EINTR]: "interrupted system call",
    [Errno.EIO]: "i/o error",
    [Errno.ENXIO]: "no such device or address",
    [Errno.E2BIG]: "argument list too long",
    [Errno.ENOEXEC]: "exec format error",
    [Errno.EBADF]: "bad file descriptor",
    [Errno.ECHILD]: "no child processes",
    [Errno.EAGAIN]: "resource temporarily unavailable",
    [Errno.ENOMEM]: "not enough memory",
    [Errno.EACCES]: "permission denied",
    [Errno.EFAULT]: "bad address in system call argument",
    [Errno.ENOTBLK]: "block device required",
    [Errno.EBUSY]: "resource busy or locked",
    [Errno.EEXIST]: "file already exists",
    [Errno.EXDEV]: "cross-device link not permitted",
    [Errno.ENODEV]: "no such device",
    [Errno.ENOTDIR]: "not a directory",
    [Errno.EISDIR]: "illegal operation on a directory",
    [Errno.EINVAL]: "invalid argument",
    [Errno.ENFILE]: "file table overflow",
    [Errno.EMFILE]: "too many open files",
    [Errno.ENOTTY]: "inappropriate ioctl for device",
    [Errno.ETXTBSY]: "text file is busy",
    [Errno.EFBIG]: "file too large",
    [Errno.ENOSPC]: "no space left on device",
    [Errno.ESPIPE]: "invalid seek",
    [Errno.EROFS]: "read-only file system",
    [Errno.EMLINK]: "too many links",
    [Errno.EPIPE]: "broken pipe",
    [Errno.EDOM]: "numerical argument out of domain",
    [Errno.ERANGE]: "result too large",
    [Errno.EDEADLK]: "resource deadlock would occur",
    [Errno.ENAMETOOLONG]: "name too long",
    [Errno.ENOLCK]: "no locks available",
    [Errno.ENOSYS]: "function not implemented",
    [Errno.ENOTEMPTY]: "directory not empty",
    [Errno.ELOOP]: "too many symbolic links encountered",
    [Errno.ENOMSG]: "no message of desired type",
    [Errno.EIDRM]: "identifier removed",
    [Errno.ECHRNG]: "channel number out of range",
    [Errno.EL2NSYNC]: "level 2 not synchronized",
    [Errno.EL3HLT]: "level 3 halted",
    [Errno.EL3RST]: "level 3 reset",
    [Errno.ENRNG]: "link number out of range",
    [Errno.EUNATCH]: "protocol driver not attached",
    [Errno.ECSI]: "no CSI structure available",
    [Errno.EL2HLT]: "level 2 halted",
    [Errno.EBADE]: "invalid exchange",
    [Errno.EBADR]: "invalid request descriptor",
    [Errno.EXFULL]: "exchange full",
    [Errno.ENOANO]: "no anode",
    [Errno.EBADRQC]: "invalid request code",
    [Errno.EBADSLT]: "invalid slot",
    [Errno.EBFONT]: "bad font file format",
    [Errno.ENOSTR]: "device not a stream",
    [Errno.ENODATA]: "no data available",
    [Errno.ETIME]: "timer expired",
    [Errno.ENOSR]: "out of streams resources",
    [Errno.ENONET]: "machine is not on the network",
    [Errno.ENOPKG]: "package not installed",
    [Errno.EREMOTE]: "object is remote",
    [Errno.ENOLINK]: "link has been severed",
    [Errno.EADV]: "advertise error",
    [Errno.ESRMNT]: "srmount error",
    [Errno.ECOMM]: "communication error on send",
    [Errno.EPROTO]: "protocol error",
    [Errno.EMULTIHOP]: "multihop attempted",
    [Errno.EDOTDOT]: "rFS specific error",
    [Errno.EBADMSG]: "bad message",
    [Errno.EOVERFLOW]: "value too large for defined data type",
    [Errno.ENOTUNIQ]: "name not unique on network",
    [Errno.EBADFD]: "file descriptor in bad state",
    [Errno.EREMCHG]: "remote address changed",
    [Errno.ELIBACC]: "can not access a needed shared library",
    [Errno.ELIBBAD]: "accessing a corrupted shared library",
    [Errno.ELIBSCN]: ".lib section in a.out corrupted",
    [Errno.ELIBMAX]: "attempting to link in too many shared libraries",
    [Errno.ELIBEXEC]: "cannot exec a shared library directly",
    [Errno.EILSEQ]: "illegal byte sequence",
    [Errno.ERESTART]: "interrupted system call should be restarted",
    [Errno.ESTRPIPE]: "streams pipe error",
    [Errno.EUSERS]: "too many users",
    [Errno.ENOTSOCK]: "socket operation on non-socket",
    [Errno.EDESTADDRREQ]: "destination address required",
    [Errno.EMSGSIZE]: "message too long",
    [Errno.EPROTOTYPE]: "protocol wrong type for socket",
    [Errno.ENOPROTOOPT]: "protocol not available",
    [Errno.EPROTONOSUPPORT]: "protocol not supported",
    [Errno.ESOCKTNOSUPPORT]: "socket type not supported",
    [Errno.ENOTSUP]: "operation not supported on socket",
    [Errno.EPFNOSUPPORT]: "protocol family not supported",
    [Errno.EAFNOSUPPORT]: "address family not supported",
    [Errno.EADDRINUSE]: "address already in use",
    [Errno.EADDRNOTAVAIL]: "address not available",
    [Errno.ENETDOWN]: "network is down",
    [Errno.ENETUNREACH]: "network is unreachable",
    [Errno.ENETRESET]: "network dropped connection on reset",
    [Errno.ECONNABORTED]: "software caused connection abort",
    [Errno.ECONNRESET]: "connection reset by peer",
    [Errno.ENOBUFS]: "no buffer space available",
    [Errno.EISCONN]: "socket is already connected",
    [Errno.ENOTCONN]: "socket is not connected",
    [Errno.ESHUTDOWN]: "cannot send after transport endpoint shutdown",
    [Errno.ETOOMANYREFS]: "too many references: cannot splice",
    [Errno.ETIMEDOUT]: "connection timed out",
    [Errno.ECONNREFUSED]: "connection refused",
    [Errno.EHOSTDOWN]: "host is down",
    [Errno.EHOSTUNREACH]: "host is unreachable",
    [Errno.EALREADY]: "connection already in progress",
    [Errno.EINPROGRESS]: "operation now in progress",
    [Errno.ESTALE]: "stale file handle",
    [Errno.EEUCLEAN]: "structure needs cleaning",
    [Errno.ENOTNAM]: "not a XENIX named type file",
    [Errno.ENAVAIL]: "no XENIX semaphores available",
    [Errno.EISNAM]: "is a named type file",
    [Errno.EREMOTEIO]: "remote I/O error",
    [Errno.EDQUOT]: "disk quota exceeded",
    [Errno.ENOMEDIUM]: "no medium found",
    [Errno.EMEDIUMTYPE]: "wrong medium type",
    [Errno.ECANCELED]: "operation canceled",
    [Errno.ENOKEY]: "required key not available",
    [Errno.EKEYEXPIRED]: "key has expired",
    [Errno.EKEYREVOKED]: "key has been revoked",
    [Errno.EKEYREJECTED]: "key was rejected by service",
    [Errno.EOWNERDEAD]: "owner died",
    [Errno.ENOTRECOVERABLE]: "state not recoverable",
    [Errno.ERFKILL]: "operation not possible due to RF-kill",
    [Errno.EHWPOISON]: "memory page has hardware error"
  };
  function setUVMessage(ex) {
    let message = `${ex.code}: ${errnoMessages[ex.errno]}, ${ex.syscall}`;
    if (ex.path)
      message += ` '${ex.path}'`;
    if (ex.dest)
      message += ` -> '${ex.dest}'`;
    const isDefault = ex.message.startsWith(errnoMessages[ex.errno]) || /^E[A-Z0-9]+: /.test(ex.message);
    if (ex.message && !isDefault)
      message += ` (${ex.message})`;
    ex.message = message;
    return ex;
  }
  var Exception = class _Exception extends Error {
    constructor(errno, message, ctx = {}) {
      const code = Errno[errno];
      super(message || "");
      __publicField(this, "errno");
      __publicField(this, "code");
      __publicField(this, "path");
      __publicField(this, "dest");
      __publicField(this, "syscall");
      this.errno = errno;
      this.code = code;
      Object.assign(this, omit(ctx, "message"));
      if (!message)
        setUVMessage(this);
      Error.captureStackTrace?.(this, this.constructor);
    }
    toString() {
      return this.message;
    }
    toJSON() {
      const json = {
        errno: this.errno,
        code: this.code,
        stack: this.stack,
        message: this.message
      };
      if (this.path)
        json.path = this.path;
      if (this.dest)
        json.dest = this.dest;
      if (this.syscall)
        json.syscall = this.syscall;
      return json;
    }
    static fromJSON(json) {
      const err2 = json.syscall ? new _Exception(json.errno, false, json) : new _Exception(json.errno, json.message);
      err2.stack = json.stack;
      return err2;
    }
  };
  function UV(code, context, path, dest) {
    if (typeof context === "string")
      context = { syscall: context, path, dest };
    const err2 = new Exception(Errno[code], false, context ?? {});
    Error.captureStackTrace?.(err2, UV);
    return err2;
  }
  function withErrno(code, message) {
    const err2 = new Exception(Errno[code], message ?? errnoMessages[Errno[code]]);
    Error.captureStackTrace?.(err2, withErrno);
    return err2;
  }
  function rethrow(extra, path, dest) {
    const ctx = typeof extra === "string" ? { syscall: extra } : extra;
    if (path)
      ctx.path = path;
    if (dest)
      ctx.dest = dest;
    return function(e) {
      Object.assign(e, ctx);
      setUVMessage(e);
      throw e;
    };
  }

  // node_modules/kerium/dist/log.js
  var Level;
  (function(Level2) {
    Level2[Level2["EMERG"] = 0] = "EMERG";
    Level2[Level2["ALERT"] = 1] = "ALERT";
    Level2[Level2["CRIT"] = 2] = "CRIT";
    Level2[Level2["ERR"] = 3] = "ERR";
    Level2[Level2["WARN"] = 4] = "WARN";
    Level2[Level2["NOTICE"] = 5] = "NOTICE";
    Level2[Level2["INFO"] = 6] = "INFO";
    Level2[Level2["DEBUG"] = 7] = "DEBUG";
  })(Level || (Level = {}));
  var entries = new List();
  function log(level, message) {
    if (!isEnabled)
      return;
    const entry = {
      level,
      message,
      timestamp: /* @__PURE__ */ new Date(),
      elapsedMs: performance.now()
    };
    entries.add(entry);
    output(entry);
  }
  function _shortcut(level) {
    return function(message) {
      log(level, message.toString());
      return message;
    };
  }
  var emerg = _shortcut(Level.EMERG);
  var alert = _shortcut(Level.ALERT);
  var crit = _shortcut(Level.CRIT);
  var err = _shortcut(Level.ERR);
  var warn = _shortcut(Level.WARN);
  var notice = _shortcut(Level.NOTICE);
  var info = _shortcut(Level.INFO);
  var debug = _shortcut(Level.DEBUG);
  function timestamp(entry) {
    return "[" + (entry.elapsedMs / 1e3).toFixed(3).padStart(10) + "] ";
  }
  var levelColor = {
    ansi: {
      [Level.EMERG]: "1;4;37;41",
      [Level.ALERT]: "1;37;41",
      [Level.CRIT]: "1;35",
      [Level.ERR]: "1;31",
      [Level.WARN]: "1;33",
      [Level.NOTICE]: "1;36",
      [Level.INFO]: "1;37",
      [Level.DEBUG]: "0;2;37"
    },
    css: {
      [Level.EMERG]: "font-weight: bold; text-decoration: underline; color: white; background-color: red;",
      [Level.ALERT]: "font-weight: bold; color: white; background-color: red;",
      [Level.CRIT]: "font-weight: bold; color: magenta;",
      [Level.ERR]: "font-weight: bold; color: red;",
      [Level.WARN]: "font-weight: bold; color: yellow;",
      [Level.NOTICE]: "font-weight: bold; color: cyan;",
      [Level.INFO]: "font-weight: bold; color: white;",
      [Level.DEBUG]: "opacity: 0.8; color: white;"
    }
  };
  var messageColor = {
    ansi: {
      [Level.EMERG]: "1;31",
      [Level.ALERT]: "1;31",
      [Level.CRIT]: "1;31",
      [Level.ERR]: "31",
      [Level.WARN]: "33",
      [Level.NOTICE]: "1;37",
      [Level.INFO]: "37",
      [Level.DEBUG]: "2;37"
    },
    css: {
      [Level.EMERG]: "font-weight: bold; color: red;",
      [Level.ALERT]: "font-weight: bold; color: red;",
      [Level.CRIT]: "font-weight: bold; color: red;",
      [Level.ERR]: "color: red;",
      [Level.WARN]: "color: yellow;",
      [Level.NOTICE]: "font-weight: bold; color: white;",
      [Level.INFO]: "color: white;",
      [Level.DEBUG]: "opacity: 0.8; color: white;"
    }
  };
  var _format = (entry) => [timestamp(entry), entry.message];
  function format(entry) {
    const formatted = _format(entry);
    return typeof formatted == "string" ? [formatted] : Array.from(formatted);
  }
  var _output = "process" in globalThis ? console.error : console.log;
  function output(entry) {
    if (entry.level > minLevel)
      return;
    _output(...format(entry));
  }
  var minLevel = Level.ALERT;
  var isEnabled = true;

  // node_modules/@zenfs/core/dist/internal/credentials.js
  function createCredentials(source) {
    return {
      suid: source.uid,
      sgid: source.gid,
      euid: source.uid,
      egid: source.gid,
      groups: [],
      ...source
    };
  }
  function credentialsAllowRoot(cred) {
    if (!cred)
      return false;
    return !cred.uid || !cred.gid || !cred.euid || !cred.egid || cred.groups.some((gid) => !gid);
  }

  // node_modules/@zenfs/core/dist/internal/contexts.js
  var kIsContext = Symbol("ZenFSContext");
  function isContext(obj) {
    return typeof obj === "object" && obj !== null && kIsContext in obj;
  }
  function assertContext(ctx) {
    if (!isContext(ctx))
      throw warn(withErrno("EINVAL", "Invalid context provided"));
  }
  var defaultContext = {
    [kIsContext]: true,
    id: 1,
    root: "/",
    pwd: "/",
    credentials: createCredentials({ uid: 0, gid: 0 }),
    umask: 0,
    descriptors: /* @__PURE__ */ new Map(),
    parent: null,
    children: [],
    mounts: /* @__PURE__ */ new Map()
  };
  function contextOf($) {
    return isContext($) ? $ : defaultContext;
  }
  function applyUmask($, mode) {
    return mode & ~(contextOf($).umask & 511);
  }

  // node_modules/@zenfs/core/dist/constants.js
  var constants_exports = {};
  __export(constants_exports, {
    COPYFILE_EXCL: () => COPYFILE_EXCL,
    COPYFILE_FICLONE: () => COPYFILE_FICLONE,
    COPYFILE_FICLONE_FORCE: () => COPYFILE_FICLONE_FORCE,
    F_OK: () => F_OK,
    O_APPEND: () => O_APPEND,
    O_CREAT: () => O_CREAT,
    O_DIRECT: () => O_DIRECT,
    O_DIRECTORY: () => O_DIRECTORY,
    O_DSYNC: () => O_DSYNC,
    O_EXCL: () => O_EXCL,
    O_NOATIME: () => O_NOATIME,
    O_NOCTTY: () => O_NOCTTY,
    O_NOFOLLOW: () => O_NOFOLLOW,
    O_NONBLOCK: () => O_NONBLOCK,
    O_RDONLY: () => O_RDONLY,
    O_RDWR: () => O_RDWR,
    O_SYMLINK: () => O_SYMLINK,
    O_SYNC: () => O_SYNC,
    O_TRUNC: () => O_TRUNC,
    O_WRONLY: () => O_WRONLY,
    R_OK: () => R_OK,
    S_IFBLK: () => S_IFBLK,
    S_IFCHR: () => S_IFCHR,
    S_IFDIR: () => S_IFDIR,
    S_IFIFO: () => S_IFIFO,
    S_IFLNK: () => S_IFLNK,
    S_IFMT: () => S_IFMT,
    S_IFREG: () => S_IFREG,
    S_IFSOCK: () => S_IFSOCK,
    S_IRGRP: () => S_IRGRP,
    S_IROTH: () => S_IROTH,
    S_IRUSR: () => S_IRUSR,
    S_IRWXG: () => S_IRWXG,
    S_IRWXO: () => S_IRWXO,
    S_IRWXU: () => S_IRWXU,
    S_ISGID: () => S_ISGID,
    S_ISUID: () => S_ISUID,
    S_ISVTX: () => S_ISVTX,
    S_IWGRP: () => S_IWGRP,
    S_IWOTH: () => S_IWOTH,
    S_IWUSR: () => S_IWUSR,
    S_IXGRP: () => S_IXGRP,
    S_IXOTH: () => S_IXOTH,
    S_IXUSR: () => S_IXUSR,
    UV_FS_O_FILEMAP: () => UV_FS_O_FILEMAP,
    UV_FS_O_RANDOM: () => UV_FS_O_RANDOM,
    UV_FS_O_SEQUENTIAL: () => UV_FS_O_SEQUENTIAL,
    UV_FS_O_SHORT_LIVED: () => UV_FS_O_SHORT_LIVED,
    UV_FS_O_TEMPORARY: () => UV_FS_O_TEMPORARY,
    W_OK: () => W_OK,
    X_OK: () => X_OK,
    size_max: () => size_max
  });
  var F_OK = 0;
  var R_OK = 4;
  var W_OK = 2;
  var X_OK = 1;
  var COPYFILE_EXCL = 1;
  var COPYFILE_FICLONE = 2;
  var COPYFILE_FICLONE_FORCE = 4;
  var O_RDONLY = 0;
  var O_WRONLY = 1;
  var O_RDWR = 2;
  var O_CREAT = 64;
  var O_EXCL = 128;
  var O_NOCTTY = 256;
  var O_TRUNC = 512;
  var O_APPEND = 1024;
  var O_DIRECTORY = 65536;
  var O_NOATIME = 262144;
  var O_NOFOLLOW = 131072;
  var O_SYNC = 1052672;
  var O_DSYNC = 4096;
  var O_SYMLINK = 32768;
  var O_DIRECT = 16384;
  var O_NONBLOCK = 2048;
  var S_IFMT = 61440;
  var S_IFSOCK = 49152;
  var S_IFLNK = 40960;
  var S_IFREG = 32768;
  var S_IFBLK = 24576;
  var S_IFDIR = 16384;
  var S_IFCHR = 8192;
  var S_IFIFO = 4096;
  var S_ISUID = 2048;
  var S_ISGID = 1024;
  var S_ISVTX = 512;
  var S_IRWXU = 448;
  var S_IRUSR = 256;
  var S_IWUSR = 128;
  var S_IXUSR = 64;
  var S_IRWXG = 56;
  var S_IRGRP = 32;
  var S_IWGRP = 16;
  var S_IXGRP = 8;
  var S_IRWXO = 7;
  var S_IROTH = 4;
  var S_IWOTH = 2;
  var S_IXOTH = 1;
  var UV_FS_O_FILEMAP = 0;
  var UV_FS_O_TEMPORARY = 0;
  var UV_FS_O_SHORT_LIVED = 0;
  var UV_FS_O_SEQUENTIAL = 0;
  var UV_FS_O_RANDOM = 0;
  var size_max = 4294967295;

  // node_modules/memium/dist/types.js
  function isArrayType(type) {
    return "__isArrayType" in type && type.__isArrayType === true;
  }
  var validTypes = /* @__PURE__ */ new WeakSet();
  function isType(type) {
    if (typeof type != "object" && typeof type != "function" || type === null || type === void 0)
      return false;
    if (validTypes.has(type))
      return true;
    if (isArrayType(type))
      return isType(type.type);
    if (typeof type == "function" && isType(Object.getPrototypeOf(type))) {
      validTypes.add(type);
      return true;
    }
    const valid = "name" in type && "size" in type && "get" in type && "set" in type && typeof type.name == "string" && typeof type.size == "number" && typeof type.get == "function" && typeof type.set == "function" && typeRegistry.has(type.name) && typeRegistry.get(type.name)?.name === type.name;
    if (valid)
      validTypes.add(type);
    return valid;
  }
  var typeRegistry = /* @__PURE__ */ new Map();
  function registerType(t) {
    if (typeRegistry.has(t.name))
      throw new ReferenceError(`Type is already registered: ${t.name}`);
    typeRegistry.set(t.name, t);
  }

  // node_modules/memium/dist/structs.shared.js
  function isStructInstance(arg) {
    return typeof arg == "object" && arg !== null && "constructor" in arg && isStructConstructor(arg.constructor);
  }
  function isStructConstructor(arg) {
    return typeof arg == "function" && "prototype" in arg && "fields" in arg && typeof arg.fields == "object" && isType(arg);
  }
  function dynamicStructSize(instance) {
    let size = 0;
    for (const field2 of instance.constructor.fields) {
      const value = instance[field2.name];
      if (isDynamicArray(instance, field2)) {
        size += dynamicArraySize(instance, field2);
      }
      if (isStructInstance(value) && value.constructor.isDynamic) {
        size += dynamicStructSize(value);
      }
    }
    return size;
  }
  var kDescriptors = Symbol("kDescriptors");
  function descriptorsOf(struct3) {
    if (Object.hasOwn(struct3, kDescriptors))
      return struct3[kDescriptors];
    const descriptors = {};
    for (const field2 of struct3.fields) {
      descriptors[field2.name] = {
        enumerable: true,
        configurable: true,
        get() {
          return get(this, field2);
        },
        set(value) {
          set(this, field2, value);
        }
      };
    }
    Object.defineProperty(struct3, kDescriptors, { value: descriptors, configurable: true });
    return descriptors;
  }
  function defineStructPrototype(struct3) {
    Object.defineProperties(struct3.prototype, {
      ...descriptorsOf(struct3),
      [Symbol.toStringTag]: { get: () => struct3.name, configurable: true }
    });
  }

  // node_modules/memium/dist/fields.internal.js
  function _isBuilder(init2) {
    return (typeof init2 == "object" || typeof init2 == "function") && init2 !== null && "toInit" in init2 && typeof init2.toInit == "function";
  }
  function _parseConfig(init2) {
    if (_isBuilder(init2))
      return init2.toInit();
    if (isType(init2))
      return { type: init2 };
    return init2;
  }
  function alignmentOf(type) {
    if (isArrayType(type))
      return alignmentOf(type.baseType);
    if (isStructConstructor(type))
      return type.alignment;
    return type.size;
  }
  function init(_name, init2, extraOpts = {}) {
    if (!_name)
      throw withErrno("EINVAL", "Invalid name for struct field");
    if (typeof _name == "symbol")
      console.warn("Symbol used for struct field name will be coerced to string: " + _name.toString());
    const name = _name.toString();
    const opt = Object.assign(_parseConfig(init2), extraOpts);
    if (!isType(opt.type))
      throw withErrno("EINVAL", `Invalid type for struct field "${name}"`);
    const countedBy = !opt.countedBy ? "" : ` counted_by(${typeof opt.countedBy == "string" ? opt.countedBy : "<function>"})`;
    return {
      name,
      offset: 0,
      type: opt.type,
      countedBy: opt.countedBy,
      alignment: opt.align ?? alignmentOf(opt.type),
      decl: isArrayType(opt.type) ? `${opt.typeName ?? opt.type.type.name} ${name}[${opt.type.length}]${countedBy}` : `${opt.typeName ?? opt.type.name} ${name}`,
      littleEndian: !opt.bigEndian
    };
  }
  function __fault(err2, offset) {
    if (!(err2 instanceof Error) || err2.message.toLowerCase() !== "offset is outside the bounds of the dataview")
      throw err2;
    const ex = withErrno("EFAULT", `Segmentation fault (at 0x${offset.toString(16)})`);
    Error.captureStackTrace(ex, __fault);
    throw ex;
  }
  function isDynamicArray(instance, field2) {
    return isArrayType(field2.type) && field2.type.length == 0 && field2.countedBy?.length && instance.constructor.isDynamic;
  }
  function _count(instance, field2) {
    let value = typeof field2.countedBy == "function" ? field2.countedBy(instance) : instance[field2.countedBy];
    if (typeof value == "bigint") {
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw withErrno("EOVERFLOW", "countedBy field value exceeds max safe integer");
      }
      value = Number(value);
    }
    if (typeof value != "number")
      throw withErrno("EINVAL", "countedBy field value is not a number");
    return value;
  }
  function dynamicArraySize(instance, field2) {
    let size = field2.type.type.size * _count(instance, field2);
    if (isStructConstructor(field2.type.type) && field2.type.type.isDynamic) {
      for (const item of instance[field2.name]) {
        size += dynamicStructSize(item);
      }
    }
    return size;
  }
  var kOffsets = Symbol("kOffsets");
  var kStaticLayout = Symbol("kStaticLayout");
  function hasStaticLayout(struct3) {
    if (struct3[kStaticLayout] !== void 0)
      return struct3[kStaticLayout];
    let isStatic = !struct3.isDynamic;
    if (isStatic)
      for (const field2 of struct3.fields) {
        const base = isArrayType(field2.type) ? field2.type.baseType : field2.type;
        if (isStructConstructor(base) && base.isDynamic) {
          isStatic = false;
          break;
        }
      }
    Object.defineProperty(struct3, kStaticLayout, { value: isStatic, configurable: true });
    return isStatic;
  }
  var kFixedFields = Symbol("kFixedFields");
  function fixedFields(struct3) {
    if (Object.hasOwn(struct3, kFixedFields))
      return struct3[kFixedFields];
    const fixed = /* @__PURE__ */ new Set();
    if (!struct3.isUnion)
      for (const field2 of struct3.fields) {
        fixed.add(field2.name);
        if (isArrayType(field2.type) && !field2.type.length && field2.countedBy)
          break;
        const base = isArrayType(field2.type) ? field2.type.baseType : field2.type;
        if (isStructConstructor(base) && base.isDynamic)
          break;
      }
    Object.defineProperty(struct3, kFixedFields, { value: fixed, configurable: true });
    return fixed;
  }
  function offsetOf(instance, targetField, cache) {
    if (hasStaticLayout(instance.constructor))
      return targetField.offset;
    if (fixedFields(instance.constructor).has(targetField.name))
      return targetField.offset;
    let { offset, name } = targetField;
    instance[kOffsets] || (instance[kOffsets] = /* @__PURE__ */ Object.create(null));
    const offsetCache = instance[kOffsets];
    if (offsetCache[name] !== void 0) {
      if (cache)
        return offsetCache[name];
      else
        delete offsetCache[name];
    }
    const { fields } = instance.constructor;
    const index = fields.indexOf(targetField);
    for (const field2 of fields.slice(0, index)) {
      if (isDynamicArray(instance, field2)) {
        offset += dynamicArraySize(instance, field2);
      }
      const value = instance[field2.name];
      if (isStructInstance(value) && value.constructor.isDynamic) {
        offset += dynamicStructSize(value);
      }
    }
    if (cache)
      offsetCache[name] = offset;
    else {
      for (const field2 of fields.slice(index))
        if (offsetCache[field2.name] !== void 0)
          delete offsetCache[field2.name];
    }
    return offset;
  }
  function set(instance, field2, value, index) {
    if (typeof value == "string" && typeof index === "number" && field2.type.size === 1)
      value = value.charCodeAt(0);
    const offset = instance.byteOffset + offsetOf(instance, field2, false) + (index ?? 0) * field2.type.size;
    try {
      field2.type.set(instance.buffer, offset, value);
      return;
    } catch (err2) {
      __fault(err2, offset);
    }
  }
  var kViews = Symbol("kViews");
  function get(instance, field2) {
    let type = field2.type;
    const dynamic = isDynamicArray(instance, field2);
    if (dynamic) {
      const inner = field2.type.type;
      type = ArrayType.for(inner, _count(instance, field2));
    }
    const cacheable = !dynamic && (isArrayType(type) || isStructConstructor(type)) && hasStaticLayout(instance.constructor);
    if (cacheable) {
      const views = instance[kViews] ?? (instance[kViews] = /* @__PURE__ */ Object.create(null));
      if (views[field2.name] !== void 0)
        return views[field2.name];
    }
    const offset = instance.byteOffset + offsetOf(instance, field2, true);
    try {
      const value = type.get(instance.buffer, offset);
      if (cacheable)
        instance[kViews][field2.name] = value;
      return value;
    } catch (err2) {
      __fault(err2, offset);
    }
  }

  // node_modules/memium/dist/primitives.js
  var __view__ = Symbol("DataView");
  function view(buffer) {
    buffer[__view__] ?? (buffer[__view__] = new DataView(buffer));
    return buffer[__view__];
  }
  var int8 = {
    name: "int8",
    size: 1,
    array: Int8Array,
    get: (buffer, offset) => view(buffer).getInt8(offset),
    set: (buffer, offset, value) => view(buffer).setInt8(offset, value)
  };
  var uint8 = {
    name: "uint8",
    size: 1,
    array: Uint8Array,
    get: (buffer, offset) => view(buffer).getUint8(offset),
    set: (buffer, offset, value) => view(buffer).setUint8(offset, value)
  };
  var int16 = {
    name: "int16",
    size: 2,
    array: Int16Array,
    get: (buffer, offset) => view(buffer).getInt16(offset, true),
    set: (buffer, offset, value) => view(buffer).setInt16(offset, value, true)
  };
  var uint16 = {
    name: "uint16",
    size: 2,
    array: Uint16Array,
    get: (buffer, offset) => view(buffer).getUint16(offset, true),
    set: (buffer, offset, value) => view(buffer).setUint16(offset, value, true)
  };
  var int32 = {
    name: "int32",
    size: 4,
    array: Int32Array,
    get: (buffer, offset) => view(buffer).getInt32(offset, true),
    set: (buffer, offset, value) => view(buffer).setInt32(offset, value, true)
  };
  var uint32 = {
    name: "uint32",
    size: 4,
    array: Uint32Array,
    get: (buffer, offset) => view(buffer).getUint32(offset, true),
    set: (buffer, offset, value) => view(buffer).setUint32(offset, value, true)
  };
  var int64 = {
    name: "int64",
    size: 8,
    array: BigInt64Array,
    get: (buffer, offset) => view(buffer).getBigInt64(offset, true),
    set: (buffer, offset, value) => view(buffer).setBigInt64(offset, value, true)
  };
  var uint64 = {
    name: "uint64",
    size: 8,
    array: BigUint64Array,
    get: (buffer, offset) => view(buffer).getBigUint64(offset, true),
    set: (buffer, offset, value) => view(buffer).setBigUint64(offset, value, true)
  };
  var float32 = {
    name: "float32",
    size: 4,
    array: Float32Array,
    get: (buffer, offset) => view(buffer).getFloat32(offset, true),
    set: (buffer, offset, value) => view(buffer).setFloat32(offset, value, true)
  };
  var float64 = {
    name: "float64",
    size: 8,
    array: Float64Array,
    get: (buffer, offset) => view(buffer).getFloat64(offset, true),
    set: (buffer, offset, value) => view(buffer).setFloat64(offset, value, true)
  };
  var types = {
    int8,
    uint8,
    int16,
    uint16,
    int32,
    uint32,
    int64,
    uint64,
    float32,
    float64
  };
  var typeNames = Object.keys(types);
  for (const t of Object.values(types))
    registerType(t);
  var rawTypes = {
    ...types,
    ...Object.fromEntries(typeNames.map((t) => [capitalize(t), types[t]])),
    char: uint8
  };
  var validNames = Object.keys(rawTypes);
  function isValid(type) {
    return validNames.includes(type.toString());
  }
  function checkValid(type) {
    if (!isValid(type))
      throw withErrno("EINVAL", "Not a valid primitive type: " + type);
  }
  function normalize(type) {
    return type == "char" ? "uint8" : type.toLowerCase();
  }

  // node_modules/memium/dist/misc.js
  function static_sizeof(type) {
    if (isType(type))
      return type.size;
    if (type === void 0 || type === null)
      return 0;
    if (typeof type == "object" && isType(type.constructor))
      return type.constructor.size;
    if (Array.isArray(type)) {
      let size = 0;
      for (let i = 0; i < type.length; i++)
        size += static_sizeof(type[i]);
      return size;
    }
    if (typeof type == "string") {
      checkValid(type);
      return types[normalize(type)].size;
    }
    throw new TypeError(`Unable to resolve size of \`${type.toString()}\``);
  }
  function sizeof(type) {
    const size = static_sizeof(type);
    if (isStructInstance(type) && type.constructor.isDynamic) {
      return size + dynamicStructSize(type);
    }
    return size;
  }
  function offsetof(type, fieldName) {
    const isConstructor = isStructConstructor(type);
    let constructor;
    if (isConstructor) {
      if (type.isDynamic)
        throw withErrno("EINVAL", "Cannot get offset of field in dynamic struct from the constructor");
      constructor = type;
    } else if (isStructInstance(type))
      constructor = type.constructor;
    else
      throw withErrno("EINVAL", "Type is not a struct or struct constructor");
    const { fields } = constructor;
    const field2 = fields.find((f) => f.name === fieldName);
    if (!field2)
      throw withErrno("EINVAL", "Struct does not have field: " + fieldName);
    return isConstructor ? field2.offset : offsetOf(type, field2, true);
  }

  // node_modules/memium/dist/array.js
  var __runInitializers = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var _strictIndexes = false;
  function StructArray(type, __length) {
    class StructArray2 extends DataView {
      constructor(lengthOrBuffer, byteOffset, byteLength) {
        const buffer = typeof lengthOrBuffer === "object" ? lengthOrBuffer : new ArrayBuffer((lengthOrBuffer ?? 0) * type.size);
        super(buffer, byteOffset, byteLength);
        __publicField(this, "length");
        __publicField(this, "type", type);
        __publicField(this, "_offsets", [0]);
        this.length = typeof lengthOrBuffer === "number" ? lengthOrBuffer : type.isDynamic ? __length ?? _throw(`Unknown length of StructArray<${type.name}>`) : Math.floor(this.byteLength / type.size);
        const offset = (i) => this.byteOffset + this.offsetOf(i);
        const views = _isStructConstructor(type) && !type.isDynamic ? [] : void 0;
        return new Proxy(this, {
          get(target, index) {
            if (index in target)
              return target[index];
            const i = parseInt(index.toString());
            if (!Number.isSafeInteger(i))
              if (_strictIndexes)
                throw withErrno("EINVAL", "Invalid index: " + index.toString());
              else
                return void 0;
            if (!views)
              return type.get(target.buffer, offset(i));
            return views[i] ?? (views[i] = type.get(target.buffer, offset(i)));
          },
          set(target, index, value) {
            const i = parseInt(index.toString());
            if (!Number.isSafeInteger(i))
              if (_strictIndexes)
                throw withErrno("EINVAL", "Invalid index: " + index.toString());
              else
                return false;
            type.set(target.buffer, offset(i), value);
            return true;
          }
        });
      }
      *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++)
          yield this[i];
      }
      offsetOf(index) {
        if (!type.isDynamic)
          return index * type.size;
        if (index < this._offsets.length)
          return this._offsets[index];
        for (let i = this._offsets.length; i <= index; i++) {
          this._offsets[i] = this._offsets[i - 1] + sizeof(type.get(this.buffer, this.byteOffset + this._offsets[i - 1]));
        }
        return this._offsets[index];
      }
    }
    for (const key of Object.getOwnPropertyNames(DataView.prototype)) {
      if (!key.startsWith("get") && !key.startsWith("set"))
        continue;
      Object.defineProperty(StructArray2.prototype, key, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: void 0
      });
    }
    return StructArray2;
  }
  function _isStructConstructor(arg) {
    return typeof arg == "function" && "prototype" in arg && "fields" in arg && typeof arg.fields == "object" && isType(arg);
  }
  var ArrayType = (() => {
    var _a12;
    let _instanceExtraInitializers = [];
    let _get___structArray_decorators;
    let _get___arrayType_decorators;
    let _get_array_decorators;
    return _a12 = class {
      /**
       * Use `ArrayType.for()` instead!
       * @todo [breaking] make this protected
       * @internal
       */
      constructor(type, length) {
        __publicField(this, "type", __runInitializers(this, _instanceExtraInitializers));
        __publicField(this, "length");
        __publicField(this, "name");
        __publicField(this, "size");
        /** @internal @hidden */
        __publicField(this, "__isArrayType", true);
        /**
         * The "root" type of the array.
         * For example, `uint8` for `uint8[x][y]`
         */
        __publicField(this, "baseType");
        __publicField(this, "get", (buffer, offset) => {
          const isPrimitive = isValid(this.type.name);
          if (isPrimitive && offset % this.type.size !== 0) {
            return new this.__structArray(buffer, offset, this.size);
          }
          return new this.__arrayType(buffer, offset, isPrimitive ? this.length : this.size);
        });
        __publicField(this, "set", (buffer, offset, value) => {
          if (this.length)
            for (let i = 0; i < this.length; i++) {
              this.type.set(buffer, offset + i * this.type.size, value[i]);
            }
          else {
            let pointer = offset;
            for (let i = 0; i < value.length; i++) {
              this.type.set(buffer, pointer, value[i]);
              pointer += _isStructConstructor(this.type) && this.type.isDynamic ? sizeof(value[i]) : this.type.size;
            }
          }
        });
        this.type = type;
        this.length = length;
        this.name = `${type.name}[${length}]`;
        this.size = type.size * length;
        this.baseType = type;
        while (isArrayType(this.baseType))
          this.baseType = this.baseType.type;
      }
      // Defining a `StructArray` class is expensive, and most array types never need one
      get __structArray() {
        return StructArray(this.type, this.length);
      }
      get __arrayType() {
        return this.type.array ? this.type.array : this.__structArray;
      }
      /** Get the array type for an element type and length, reusing an existing one when possible. */
      static for(type, length) {
        const name = `${type.name}[${length}]`;
        let arrayType = this._cache.get(name);
        if (!arrayType)
          this._cache.set(name, arrayType = new _a12(type, length));
        return arrayType;
      }
      /**
       * This is for an array of this array
       */
      get array() {
        return StructArray(this);
      }
    }, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
      _get___structArray_decorators = [memoize];
      _get___arrayType_decorators = [memoize];
      _get_array_decorators = [memoize];
      __esDecorate(_a12, null, _get___structArray_decorators, { kind: "getter", name: "__structArray", static: false, private: false, access: { has: (obj) => "__structArray" in obj, get: (obj) => obj.__structArray }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(_a12, null, _get___arrayType_decorators, { kind: "getter", name: "__arrayType", static: false, private: false, access: { has: (obj) => "__arrayType" in obj, get: (obj) => obj.__arrayType }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(_a12, null, _get_array_decorators, { kind: "getter", name: "array", static: false, private: false, access: { has: (obj) => "array" in obj, get: (obj) => obj.array }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(_a12, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), /** Array types are immutable and fully described by their name, so they can be shared. */
    __publicField(_a12, "_cache", /* @__PURE__ */ new Map()), _a12;
  })();

  // node_modules/memium/dist/decorators.js
  Symbol.metadata ?? (Symbol.metadata = Symbol.for("Symbol.metadata"));
  function initMetadata(context) {
    context.metadata ?? (context.metadata = {});
    const existing = context.metadata.structInit ?? {};
    context.metadata.structInit = {
      fields: [...existing.fields ?? []]
    };
    return context.metadata.structInit;
  }
  function struct(...options) {
    const opts = options.reduce((acc, opt) => ({ ...acc, ...opt }), {});
    if (typeof this == "object")
      Object.assign(opts, this);
    return function __decorateStruct(target, context) {
      var _a12, _b3;
      const init2 = initMetadata(context);
      let fieldAlignment = 1;
      const fields = [];
      let size = 0;
      const align = (to) => {
        size = Math.ceil(size / to) * to;
      };
      for (const field2 of init2.fields) {
        if (!opts.isPacked)
          align(field2.alignment);
        if (opts.isUnion)
          size = Math.max(size, field2.type.size);
        else {
          field2.offset = size;
          size += field2.type.size;
        }
        fields.push(field2);
        fieldAlignment = Math.max(fieldAlignment, field2.alignment);
      }
      opts.alignment ?? (opts.alignment = fieldAlignment);
      if (!opts.isPacked)
        align(opts.alignment);
      class _struct extends (_b3 = target, _a12 = Symbol.toStringTag, _b3) {
        static get(buffer, offset) {
          return new this(buffer, offset);
        }
        static set(buffer, offset, value) {
          const source = new Uint8Array(value.buffer, value.byteOffset, this.size);
          const target2 = new Uint8Array(buffer, offset, this.size);
          if (value.buffer === buffer && value.byteOffset === offset)
            return;
          for (let i = 0; i < this.size; i++)
            target2[i] = source[i];
        }
        constructor(...args) {
          if (!args.length)
            args = [new ArrayBuffer(size), 0, size];
          super(...args);
          if (!opts.fastFields)
            Object.defineProperties(this, descriptorsOf(this.constructor));
        }
      }
      __publicField(_struct, "name", target.name);
      __publicField(_struct, "size", size);
      __publicField(_struct, "alignment", opts.alignment);
      __publicField(_struct, "isUnion", !!opts.isUnion);
      __publicField(_struct, "isDynamic", !!opts.isDynamic);
      __publicField(_struct, "fields", fields);
      __publicField(_struct, _a12, `[struct ${target.name}]`);
      defineStructPrototype(_struct);
      context.addInitializer(function() {
        Object.defineProperty(_struct, "name", { value: target.name });
        registerType(_struct);
      });
      return _struct;
    };
  }
  struct.packed = struct.bind({ isPacked: true });
  struct.align = function(alignment) {
    return struct.bind({ alignment });
  };
  function field(type, opt = {}) {
    return function __decorateField(value, context) {
      if (context.kind != "accessor")
        throw withErrno("EINVAL", "Field must be an accessor");
      const init2 = initMetadata(context);
      const field2 = init(context.name, type, opt);
      init2.fields.push(field2);
      return {
        get() {
          return get(this, field2);
        },
        set(value2) {
          set(this, field2, value2);
        }
      };
    };
  }
  function _shortcut2(typeName) {
    const type = types[normalize(typeName)];
    function __decoratePrimitiveField(valueOrLength, context) {
      return typeof valueOrLength == "number" ? field(new ArrayType(type, valueOrLength), { typeName, ...context }) : field(type, { typeName })(valueOrLength, context && "name" in context ? context : _throw(withErrno("EINVAL", "Invalid decorator context object")));
    }
    return __decoratePrimitiveField;
  }
  var types2 = Object.fromEntries(validNames.map((t) => [t, _shortcut2(t)]));
  function $from(t) {
    return t;
  }
  $from.typed = function(t) {
    return t;
  };

  // node_modules/memium/dist/fields.js
  var FieldBuilder = class _FieldBuilder {
    constructor(type, init2) {
      __publicField(this, "type");
      __publicField(this, "init");
      this.type = type;
      this.init = init2;
      const _toArray = (length) => {
        return new _FieldBuilder(new ArrayType(type, length), init2);
      };
      Object.setPrototypeOf(_toArray, new.target.prototype);
      Object.assign(_toArray, { type, init: init2 });
      return _toArray;
    }
    /**
     * Align the field to a given byte boundary.
     */
    align(align) {
      return new _FieldBuilder(this.type, { ...this.init, align });
    }
    countedBy(countedBy) {
      return new _FieldBuilder(this.type, { ...this.init, countedBy });
    }
    /**
     * Set the field to big-endian.
     */
    bigEndian() {
      return new _FieldBuilder(this.type, { ...this.init, bigEndian: true });
    }
    toInit() {
      return { type: this.type, ...this.init };
    }
    /**
     * Override the typescript type of the field's value, for example to override `number` with an enum type.
     * This does not have any runtime effects.
     */
    $type() {
      return new _FieldBuilder(this.type, this.init);
    }
  };
  function array(type, length = 0) {
    return new FieldBuilder(new ArrayType(type, length), {});
  }

  // node_modules/memium/dist/structs.js
  function struct2(structName, fieldDecls, ...options) {
    var _a12, _b3;
    const opts = options.reduce((acc, opt) => ({ ...acc, ...opt }), {});
    if (typeof this == "object")
      Object.assign(opts, this);
    let fieldAlignment = 1;
    let size = 0;
    const align = (to) => {
      size = Math.ceil(size / to) * to;
    };
    const fields = [];
    for (const [name, init2] of Object.entries(fieldDecls)) {
      if (typeof name == "number")
        throw new TypeError("Field names can not be numbers");
      const field2 = init(name, init2);
      if (!opts.isPacked)
        align(field2.alignment);
      if (opts.isUnion)
        size = Math.max(size, field2.type.size);
      else {
        field2.offset = size;
        size += field2.type.size;
      }
      fields.push(field2);
      fieldAlignment = Math.max(fieldAlignment, field2.alignment);
    }
    opts.alignment ?? (opts.alignment = fieldAlignment);
    if (!opts.isPacked)
      align(opts.alignment);
    class _struct extends (_b3 = DataView, _a12 = Symbol.toStringTag, _b3) {
      static get(buffer, offset) {
        return new this(buffer, offset);
      }
      static set(buffer, offset, value) {
        const source = new Uint8Array(value.buffer, value.byteOffset, this.size);
        const target = new Uint8Array(buffer, offset, this.size);
        if (value.buffer === buffer && value.byteOffset === offset)
          return;
        for (let i = 0; i < this.size; i++)
          target[i] = source[i];
      }
      constructor(buffer = new ArrayBuffer(new.target.size), byteOffset, byteLength) {
        super(buffer, byteOffset, byteLength ?? buffer.byteLength - (byteOffset ?? 0));
        if (!new.target.fastFields)
          Object.defineProperties(this, descriptorsOf(this.constructor));
      }
    }
    __publicField(_struct, "name", structName);
    __publicField(_struct, "size", size);
    __publicField(_struct, "alignment", opts.alignment);
    __publicField(_struct, "isUnion", !!opts.isUnion);
    __publicField(_struct, "isDynamic", !!opts.isDynamic);
    __publicField(_struct, "fastFields", !!opts.fastFields);
    __publicField(_struct, "fields", fields);
    __publicField(_struct, _a12, `[struct ${structName}]`);
    for (const key of Object.getOwnPropertyNames(DataView.prototype)) {
      if (!key.startsWith("get") && !key.startsWith("set"))
        continue;
      Object.defineProperty(_struct.prototype, key, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: void 0
      });
    }
    defineStructPrototype(_struct);
    registerType(_struct);
    return _struct;
  }
  struct2.extend = function(base, structName, fieldDecls, ...options) {
    var _a12, _b3;
    const opts = options.reduce((acc, opt) => ({ ...acc, ...opt }), {});
    if (typeof this == "object")
      Object.assign(opts, this);
    let fieldAlignment = 1;
    let size = base.size;
    const align = (to) => {
      size = Math.ceil(size / to) * to;
    };
    const fields = [...base.fields];
    for (const [name, init2] of Object.entries(fieldDecls)) {
      if (typeof name == "number")
        throw new TypeError("Field names can not be numbers");
      const field2 = init(name, init2);
      if (!opts.isPacked)
        align(field2.alignment);
      if (opts.isUnion)
        size = Math.max(size, field2.type.size);
      else {
        field2.offset = size;
        size += field2.type.size;
      }
      fields.push(field2);
      fieldAlignment = Math.max(fieldAlignment, field2.alignment);
    }
    opts.alignment ?? (opts.alignment = fieldAlignment);
    if (!opts.isPacked)
      align(opts.alignment);
    class _struct extends (_b3 = base, _a12 = Symbol.toStringTag, _b3) {
    }
    __publicField(_struct, "name", structName);
    __publicField(_struct, "size", size);
    __publicField(_struct, "alignment", opts.alignment);
    __publicField(_struct, "isUnion", !!opts.isUnion);
    __publicField(_struct, "isDynamic", !!opts.isDynamic);
    __publicField(_struct, "fastFields", !!opts.fastFields);
    __publicField(_struct, "fields", fields);
    __publicField(_struct, _a12, `[struct ${structName}]`);
    defineStructPrototype(_struct);
    registerType(_struct);
    return _struct;
  };
  struct2.packed = struct2.bind({ isPacked: true });
  struct2.align = function(alignment) {
    return struct2.bind({ alignment });
  };
  struct2.dynamic = struct2.bind({ isDynamic: true });
  var types3 = Object.fromEntries(Object.entries(rawTypes).map(([typeName, type]) => [typeName, new FieldBuilder(type, { typeName })]));

  // node_modules/@zenfs/core/dist/path.js
  function normalizeString(path, allowAboveRoot) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let char = "\0";
    for (let i = 0; i <= path.length; ++i) {
      if (i < path.length) {
        char = path[i];
      } else if (char == "/") {
        break;
      } else {
        char = "/";
      }
      if (char == "/") {
        if (lastSlash === i - 1 || dots === 1) {
        } else if (dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 || res.at(-1) !== "." || res.at(-2) !== ".") {
            if (res.length > 2) {
              const lastSlashIndex = res.lastIndexOf("/");
              if (lastSlashIndex === -1) {
                res = "";
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              }
              lastSlash = i;
              dots = 0;
              continue;
            } else if (res.length !== 0) {
              res = "";
              lastSegmentLength = 0;
              lastSlash = i;
              dots = 0;
              continue;
            }
          }
          if (allowAboveRoot) {
            res += res.length > 0 ? "/.." : "..";
            lastSegmentLength = 2;
          }
        } else {
          if (res.length > 0)
            res += "/" + path.slice(lastSlash + 1, i);
          else
            res = path.slice(lastSlash + 1, i);
          lastSegmentLength = i - lastSlash - 1;
        }
        lastSlash = i;
        dots = 0;
      } else if (char === "." && dots !== -1) {
        ++dots;
      } else {
        dots = -1;
      }
    }
    return res;
  }
  function resolve(...parts) {
    let resolved = "";
    for (const part of [...parts.reverse(), contextOf(this).pwd]) {
      if (!part?.length)
        continue;
      resolved = `${part}/${resolved}`;
      if (part.startsWith("/")) {
        break;
      }
    }
    const absolute = resolved.startsWith("/");
    resolved = normalizeString(resolved, !absolute);
    if (absolute) {
      return `/${resolved}`;
    }
    return resolved.length ? resolved : "/";
  }
  function normalize2(path) {
    if (!path.length)
      return ".";
    const isAbsolute = path[0] === "/";
    const trailingSeparator = path.at(-1) === "/";
    path = normalizeString(path, !isAbsolute);
    if (!path.length) {
      if (isAbsolute)
        return "/";
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator)
      path += "/";
    return isAbsolute ? `/${path}` : path;
  }
  function join(...parts) {
    if (!parts.length)
      return ".";
    const joined = parts.filter((p) => p).join("/");
    if (!joined?.length)
      return ".";
    return normalize2(joined);
  }
  function relative(from3, to) {
    if (from3 === to)
      return "";
    from3 = resolve.call(this, from3);
    to = resolve.call(this, to);
    if (from3 === to)
      return "";
    const fromStart = 1;
    const fromEnd = from3.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from3[fromStart + i];
      if (fromCode !== to[toStart + i])
        break;
      else if (fromCode === "/")
        lastCommonSep = i;
    }
    if (i === length) {
      if (toLen > length) {
        if (to[toStart + i] === "/") {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from3[fromStart + i] === "/") {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from3[i] === "/") {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  }
  function dirname(path) {
    if (path.length === 0)
      return ".";
    const hasRoot = path[0] === "/";
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path[i] === "/") {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1)
      return hasRoot ? "/" : ".";
    if (hasRoot && end === 1)
      return "//";
    return path.slice(0, end);
  }
  function basename(path, suffix) {
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path)
        return "";
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (let i = path.length - 1; i >= 0; --i) {
        if (path[i] === "/") {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (path[i] === suffix[extIdx]) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end)
        end = firstNonSlashEnd;
      else if (end === -1)
        end = path.length;
      return path.slice(start, end);
    }
    for (let i = path.length - 1; i >= 0; --i) {
      if (path[i] === "/") {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
  function parse(path) {
    const isAbsolute = path[0] === "/";
    const ret = { root: isAbsolute ? "/" : "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0)
      return ret;
    const start = isAbsolute ? 1 : 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      if (path[i] === "/") {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (path[i] === ".") {
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute ? 1 : startPart;
      if (startDot === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(start2, end);
      } else {
        ret.name = path.slice(start2, startDot);
        ret.base = path.slice(start2, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0)
      ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute)
      ret.dir = "/";
    return ret;
  }
  function matchWildcard(pattern2, text, isStar, matchesItem, canSkip = () => true) {
    let patternIndex = 0, textIndex = 0, starIndex = -1, resumeIndex = 0;
    while (textIndex < text.length) {
      if (patternIndex < pattern2.length && isStar(pattern2[patternIndex])) {
        starIndex = patternIndex++;
        resumeIndex = textIndex;
        continue;
      }
      if (patternIndex < pattern2.length && matchesItem(pattern2[patternIndex], text[textIndex])) {
        patternIndex++;
        textIndex++;
        continue;
      }
      if (starIndex == -1 || !canSkip(text[resumeIndex]))
        return false;
      patternIndex = starIndex + 1;
      textIndex = ++resumeIndex;
    }
    while (patternIndex < pattern2.length && isStar(pattern2[patternIndex]))
      patternIndex++;
    return patternIndex == pattern2.length;
  }
  var posixClasses = {
    alnum: "\\p{L}\\p{Nl}\\p{Nd}",
    alpha: "\\p{L}\\p{Nl}",
    ascii: "\\x00-\\x7f",
    blank: "\\p{Zs}\\t",
    cntrl: "\\p{Cc}",
    digit: "\\p{Nd}",
    graph: "\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}",
    lower: "\\p{Ll}",
    print: "\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}\\p{Zs}",
    punct: "\\p{P}",
    space: "\\p{Z}\\t\\r\\n\\v\\f",
    upper: "\\p{Lu}",
    word: "\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}",
    xdigit: "A-Fa-f0-9"
  };
  var escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  var escapeClass = (char) => /[\\\]\[^-]/.test(char) ? "\\" + char : char;
  function expandSequence(body) {
    const numeric = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(body);
    const alphabetic = /^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.(-?\d+))?$/.exec(body);
    const match = numeric ?? alphabetic;
    if (!match)
      return;
    const [, first, last, increment] = match;
    const start = numeric ? parseInt(first) : first.charCodeAt(0);
    const end = numeric ? parseInt(last) : last.charCodeAt(0);
    const step = Math.abs(parseInt(increment ?? "1")) || 1;
    const padded = numeric && (/^-?0\d/.test(first) || /^-?0\d/.test(last)) ? Math.max(first.length, last.length) : 0;
    const values = [];
    for (let value = start; start <= end ? value <= end : value >= end; value += start <= end ? step : -step) {
      if (!numeric)
        values.push(String.fromCharCode(value));
      else if (value < 0)
        values.push("-" + String(-value).padStart(padded - 1, "0"));
      else
        values.push(String(value).padStart(padded, "0"));
    }
    return values;
  }
  function expandBraces(pattern2, from3 = 0) {
    for (let i = pattern2.indexOf("{", from3); i != -1; i = pattern2.indexOf("{", i + 1)) {
      let depth = 0, end = -1;
      const commas = [];
      for (let j = i; j < pattern2.length; j++) {
        if (pattern2[j] == "{")
          depth++;
        else if (pattern2[j] == "}" && --depth == 0) {
          end = j;
          break;
        } else if (pattern2[j] == "," && depth == 1)
          commas.push(j);
      }
      if (end == -1)
        return [pattern2];
      const body = pattern2.slice(i + 1, end);
      const alternatives = commas.length ? [i, ...commas].map((comma, index) => pattern2.slice(comma + 1, commas[index] ?? end)) : expandSequence(body);
      if (!alternatives)
        continue;
      const prefix = pattern2.slice(0, i), suffix = pattern2.slice(end + 1);
      return alternatives.flatMap((alternative) => expandBraces(prefix + alternative + suffix, i));
    }
    return [pattern2];
  }
  function parseClass(source, start) {
    let i = start + 1;
    const negate = source[i] == "!" || source[i] == "^";
    if (negate)
      i++;
    let body = "";
    for (let first = true; i < source.length; first = false) {
      const char = source[i];
      if (char == "]" && !first)
        return [`[${negate ? "^" : ""}${body}]`, i + 1];
      if (char == "[" && source[i + 1] == ":") {
        const close2 = source.indexOf(":]", i + 2);
        const posix = close2 == -1 ? void 0 : posixClasses[source.slice(i + 2, close2)];
        if (posix) {
          body += posix;
          i = close2 + 2;
          continue;
        }
      }
      if (source[i + 1] == "-" && i + 2 < source.length && source[i + 2] != "]") {
        body += `${escapeClass(char)}-${escapeClass(source[i + 2])}`;
        i += 3;
        continue;
      }
      body += escapeClass(char);
      i++;
    }
  }
  function parseGroup(source, start) {
    const alternatives = [];
    for (let i = start; i < source.length; ) {
      const [alternative, end] = parseSegment(source, i, true);
      alternatives.push(alternative);
      if (source[end] == ")")
        return [alternatives, end + 1];
      if (source[end] != "|")
        return;
      i = end + 1;
    }
  }
  var extglobQuantifiers = { "?": "?", "*": "*", "+": "+", "@": "" };
  function parseSegment(source, start, inGroup) {
    let regex = "";
    let i = start;
    while (i < source.length) {
      const char = source[i];
      if (inGroup && (char == "|" || char == ")"))
        break;
      const group = "?*+@!".includes(char) && source[i + 1] == "(" ? parseGroup(source, i + 2) : void 0;
      if (group) {
        const [alternatives, end] = group;
        const body = alternatives.join("|");
        if (char != "!") {
          regex += `(?:${body})${extglobQuantifiers[char]}`;
          i = end;
          continue;
        }
        const [rest, restEnd] = parseSegment(source, end, inGroup);
        return [`${regex}(?:(?!(?:${body})${rest}${inGroup ? "" : "$"})[^/]*?)${rest}`, restEnd];
      }
      const bracket = char == "[" ? parseClass(source, i) : void 0;
      if (bracket) {
        regex += bracket[0];
        i = bracket[1];
        continue;
      }
      regex += char == "*" ? "[^/]*" : char == "?" ? "[^/]" : escapeRegex(char);
      i++;
    }
    return [regex, i];
  }
  var isMagic = (segment) => /[*?[]|[?*+@!]\(/.test(segment);
  function tokenizeSegment(source) {
    const tokens = [];
    for (let i = 0; i < source.length; ) {
      const char = source[i];
      const bracket = char == "[" ? parseClass(source, i) : void 0;
      if (bracket) {
        const regex = new RegExp(`^${bracket[0]}$`, "u");
        tokens.push((value) => regex.test(value));
        i = bracket[1];
        continue;
      }
      const codePoint = String.fromCodePoint(source.codePointAt(i));
      tokens.push(char == "*" ? true : char == "?" ? () => true : (value) => value == codePoint);
      i += codePoint.length;
    }
    return tokens;
  }
  function allowsDot(source) {
    if (source.startsWith("."))
      return true;
    if (!/^[?*+@]\(/.test(source))
      return false;
    return !!parseGroup(source, 2)?.[0].some((alternative) => alternative.startsWith("\\."));
  }
  function compileSegment(source) {
    if (source == "**")
      return { dot: false, globstar: true };
    const dot = allowsDot(source);
    if (!isMagic(source))
      return { dot, literal: source };
    try {
      if (!/[?*+@!]\(/.test(source) && source.split("*").length > 2)
        return { dot, tokens: tokenizeSegment(source) };
      return { dot, regex: new RegExp(`^${parseSegment(source, 0, false)[0]}$`, "u") };
    } catch {
      return { dot, literal: source };
    }
  }
  var compiledGlobs = /* @__PURE__ */ new Map();
  function compileGlob(pattern2) {
    const cached = compiledGlobs.get(pattern2);
    if (cached)
      return cached;
    const normalized = pattern2.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
    const compiled = expandBraces(normalized).map((expanded) => {
      const segments = expanded.split("/");
      if (segments.length > 1 && segments.at(-1) == "**")
        segments.splice(-1, 0, "*");
      return segments.map(compileSegment);
    });
    if (compiledGlobs.size >= 1024)
      compiledGlobs.clear();
    compiledGlobs.set(pattern2, compiled);
    return compiled;
  }
  function matchesSegment(segment, name) {
    if (name.startsWith(".") && !segment.dot)
      return false;
    if (segment.literal !== void 0)
      return segment.literal == name;
    if (segment.tokens)
      return matchWildcard(segment.tokens, Array.from(name), (token) => token === true, (token, char) => token !== true && token(char));
    return !!segment.regex?.test(name);
  }
  function _globDescent(patterns, directory) {
    const segments = directory.split("/");
    let descent;
    for (const patternSegments of patterns.flatMap(compileGlob)) {
      for (let i = 0; i < segments.length; i++) {
        const patternSegment = patternSegments[i];
        if (patternSegment.globstar) {
          descent = "pattern";
          break;
        }
        if (i >= patternSegments.length - 1 || !matchesSegment(patternSegment, segments[i]))
          break;
        if (i < segments.length - 1)
          continue;
        if (patternSegment.literal !== void 0)
          return "literal";
        descent = "pattern";
      }
    }
    return descent;
  }
  function matchesGlob(path, pattern2) {
    const names = path.split("/");
    return compileGlob(pattern2).some((segments) => matchWildcard(segments, names, (segment) => !!segment.globstar, matchesSegment, (name) => !name.startsWith(".")));
  }

  // node_modules/@zenfs/core/dist/node/utils.js
  var import_buffer = __toESM(require_buffer(), 1);

  // node_modules/@zenfs/core/dist/utils.js
  function normalizeMode(mode, def) {
    if (typeof mode == "number")
      return mode;
    if (typeof mode == "string") {
      const parsed = parseInt(mode, 8);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    if (typeof def == "number")
      return def;
    throw withErrno("EINVAL", "Invalid mode: " + mode?.toString());
  }
  var fd_max = 2147483647;
  function validateFD(fd) {
    if (Number.isInteger(fd) && fd >= 0 && fd <= fd_max)
      return;
    throw outOfRange("fd", `>= 0 && <= ${fd_max}`, fd);
  }
  function normalizeTime(time) {
    if (time instanceof Date)
      return time.getTime();
    const seconds = Number(time);
    if (!Number.isFinite(seconds))
      throw withErrno("EINVAL", "Invalid time.");
    return seconds < 0 ? Date.now() : seconds * 1e3;
  }
  function normalizePath(p, noResolve = false) {
    if (typeof p == "number")
      throw invalidArgumentType("path", ["string", "Buffer", "URL"], p);
    if (p instanceof URL) {
      if (p.protocol != "file:")
        throw withErrno("EINVAL", "URLs must use the file: protocol");
      p = p.pathname;
    }
    p = p.toString();
    if (p.startsWith("file://"))
      p = p.slice("file://".length);
    if (p.includes("\0"))
      throw withErrno("EINVAL", "Path can not contain null character");
    if (p.length == 0)
      throw withErrno("EINVAL", "Path can not be empty");
    p = p.replaceAll(/[/\\]+/g, "/");
    return noResolve ? p : resolve.call(this, p);
  }
  function normalizeOptions(options, encoding = "utf8", flag, mode = 0) {
    if (typeof options != "object" || options === null) {
      return {
        encoding: typeof options == "string" ? options : encoding ?? null,
        flag,
        mode
      };
    }
    return {
      encoding: typeof options?.encoding == "string" ? options.encoding : encoding ?? null,
      flag: typeof options?.flag == "string" ? options.flag : flag,
      mode: normalizeMode("mode" in options ? options?.mode : null, mode)
    };
  }

  // node_modules/@zenfs/core/dist/node/utils.js
  function describe(value) {
    if (value == null)
      return String(value);
    if (typeof value == "function")
      return `function ${value.name}`;
    if (typeof value == "object")
      return value.constructor?.name ? `an instance of ${value.constructor.name}` : String(value);
    if (typeof value == "string")
      return `type string ('${value.length > 28 ? value.slice(0, 25) + "..." : value}')`;
    return `type ${typeof value} (${String(value)})`;
  }
  function inspect(value) {
    return typeof value == "string" ? `'${value}'` : String(value);
  }
  function list(items) {
    if (items.length < 3)
      return items.join(" or ");
    return `${items.slice(0, -1).join(", ")}, or ${items.at(-1)}`;
  }
  function invalidArgumentType(name, expected, value) {
    const types4 = [], classes = [];
    for (const type of typeof expected == "string" ? [expected] : expected)
      (/^[A-Z]/.test(type) ? classes : types4).push(type);
    const kind = name.includes(".") ? "property" : "argument";
    const expectedTypes = types4.length ? `${types4.length > 1 ? "one of type" : "of type"} ${list(types4)}` : "";
    const expectedClasses = classes.length ? `an instance of ${list(classes)}` : "";
    const description = [expectedTypes, expectedClasses].filter(Boolean).join(" or ");
    return Object.assign(new TypeError(`The "${name}" ${kind} must be ${description}. Received ${describe(value)}`), {
      code: "ERR_INVALID_ARG_TYPE"
    });
  }
  function invalidArgumentValue(name, value, reason = "is invalid") {
    const kind = name.includes(".") ? "property" : "argument";
    return Object.assign(new TypeError(`The ${kind} '${name}' ${reason}. Received ${inspect(value)}`), { code: "ERR_INVALID_ARG_VALUE" });
  }
  function outOfRange(name, range, value) {
    return Object.assign(new RangeError(`The value of "${name}" is out of range. It must be ${range}. Received ${String(value)}`), {
      code: "ERR_OUT_OF_RANGE"
    });
  }
  var typeChecks = {
    string: (value) => typeof value == "string",
    number: (value) => typeof value == "number",
    boolean: (value) => typeof value == "boolean",
    object: (value) => typeof value == "object" && value !== null,
    function: (value) => typeof value == "function",
    Buffer: (value) => import_buffer.Buffer.isBuffer(value),
    TypedArray: (value) => ArrayBuffer.isView(value) && !(value instanceof DataView),
    DataView: (value) => value instanceof DataView,
    URL: (value) => value instanceof URL,
    RegExp: (value) => value instanceof RegExp
  };
  function validateType(value, name, ...expected) {
    if (!expected.some((type) => typeChecks[type](value)))
      throw invalidArgumentType(name, expected, value);
  }
  function validateData(data, name = "data") {
    validateType(data, name, "string", "Buffer", "TypedArray", "DataView");
  }
  function isIterableData(data) {
    return typeof data == "object" && data !== null && !ArrayBuffer.isView(data) && (Symbol.iterator in data || Symbol.asyncIterator in data);
  }
  function validateMaxDepth(maxDepth) {
    if (maxDepth === Infinity || Number.isSafeInteger(maxDepth) && maxDepth >= 0)
      return;
    throw outOfRange("options.maxDepth", Number.isInteger(maxDepth) ? ">= 0 && <= 9007199254740991" : "an integer", maxDepth);
  }
  function isNoEntry(e) {
    const { code } = e ?? {};
    return code == "ENOENT" || code == "ENOTDIR";
  }
  var systemErrorMessages = {
    ERR_FS_EISDIR: "Path is a directory",
    ERR_FS_CP_DIR_TO_NON_DIR: "Cannot overwrite non-directory with directory",
    ERR_FS_CP_NON_DIR_TO_DIR: "Cannot overwrite directory with non-directory",
    ERR_FS_CP_EEXIST: "Target already exists",
    ERR_FS_CP_EINVAL: "Invalid src or dest",
    ERR_FS_CP_FIFO_PIPE: "Cannot copy a FIFO pipe",
    ERR_FS_CP_SOCKET: "Cannot copy a socket file",
    ERR_FS_CP_UNKNOWN: "Cannot copy an unknown file type"
  };
  function systemError(code, context) {
    const { syscall, path } = context;
    const errno = Errno[context.code];
    return Object.assign(new Error(`${systemErrorMessages[code]}: ${syscall} returned ${context.code} (${context.message}) ${path}`), {
      name: "SystemError",
      code,
      info: { ...context, errno },
      errno,
      syscall,
      path
    });
  }
  function rmDirectoryError(path) {
    return systemError("ERR_FS_EISDIR", { code: "EISDIR", message: "is a directory", syscall: "rm", path });
  }
  function cpError(code, errno, message, path) {
    return systemError(code, { code: errno, message, syscall: "cp", path });
  }
  function cpCheckPaths(source, destination, sameFileSystem, sourceStats, destinationStats) {
    const sourceIsDirectory = sourceStats.isDirectory();
    if (destinationStats) {
      if (sameFileSystem && sourceStats.ino == destinationStats.ino)
        throw cpError("ERR_FS_CP_EINVAL", "EINVAL", "src and dest cannot be the same", destination);
      if (sourceIsDirectory && !destinationStats.isDirectory())
        throw cpError("ERR_FS_CP_DIR_TO_NON_DIR", "EISDIR", `cannot overwrite non-directory ${destination} with directory ${source}`, destination);
      if (!sourceIsDirectory && destinationStats.isDirectory())
        throw cpError("ERR_FS_CP_NON_DIR_TO_DIR", "ENOTDIR", `cannot overwrite directory ${destination} with non-directory ${source}`, destination);
    }
    if (sourceIsDirectory && destination.startsWith(source == "/" ? source : source + "/"))
      throw cpError("ERR_FS_CP_EINVAL", "EINVAL", `cannot copy ${source} to a subdirectory of self ${destination}`, destination);
  }
  function cpSpecialFileError(stats, destination) {
    const [code, kind] = stats.isSocket() ? ["ERR_FS_CP_SOCKET", "a socket file"] : stats.isFIFO() ? ["ERR_FS_CP_FIFO_PIPE", "a FIFO pipe"] : ["ERR_FS_CP_UNKNOWN", "an unknown file type"];
    return cpError(code, "EINVAL", `cannot copy ${kind}: ${destination}`, destination);
  }
  function readFileBuffer(into, size) {
    const isFunction = typeof into == "function";
    const view2 = isFunction ? into(size) : into;
    if (!ArrayBuffer.isView(view2))
      throw invalidArgumentType("options.buffer", ["function", "Buffer", "TypedArray", "DataView"], view2);
    if (view2.byteLength < size)
      throw invalidArgumentValue(`${isFunction ? "options.buffer()" : "options.buffer"}.byteLength`, view2.byteLength, `is smaller than the file size of ${size} bytes`);
    return import_buffer.Buffer.from(view2.buffer, view2.byteOffset, size);
  }
  function abortError(signal) {
    return Object.assign(new Error("The operation was aborted", { cause: signal.reason }), { name: "AbortError", code: "ABORT_ERR" });
  }
  function checkAborted(signal) {
    if (signal?.aborted)
      throw abortError(signal);
  }
  async function raceSignal(operation, signal) {
    if (!signal)
      return await operation();
    if (signal.aborted)
      throw abortError(signal);
    const { promise, reject } = Promise.withResolvers();
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      return await Promise.race([operation(), promise]);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }
  function blobType(options) {
    validateType(options, "options", "object");
    const { type = "" } = options;
    validateType(type, "options.type", "string");
    return type;
  }
  function normalizePrefix(prefix) {
    return typeof prefix != "number" && !(prefix instanceof URL) && !prefix.length ? "" : normalizePath(prefix, true);
  }
  function tempDirName(prefix) {
    return `${normalizePrefix(prefix)}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  var tempFileCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  function tempFileName(prefix) {
    validateType(prefix, "prefix", "string", "Buffer", "URL");
    let name = normalizePrefix(prefix);
    for (const byte of crypto.getRandomValues(new Uint8Array(6)))
      name += tempFileCharacters[byte % tempFileCharacters.length];
    return name;
  }
  function mkstempError(error2, prefix) {
    if (!(error2 instanceof Exception))
      return error2;
    return setUVMessage(Object.assign(error2, { syscall: "mkstemp", path: normalizePrefix(prefix) + "XXXXXX" }));
  }
  function tempResult(path, prefix, options) {
    const encoding = typeof options == "object" ? options?.encoding : options;
    if (import_buffer.Buffer.isBuffer(prefix) || encoding == "buffer")
      return import_buffer.Buffer.from(path);
    if (!encoding || encoding == "utf8" || encoding == "utf-8")
      return path;
    return import_buffer.Buffer.from(path).toString(encoding);
  }
  function temporal() {
    if ("Temporal" in globalThis && typeof globalThis.Temporal !== "undefined")
      return globalThis.Temporal;
    throw withErrno("ENOTSUP", "Temporal is not supported by this runtime");
  }
  var promisifyCustom = Symbol.for("nodejs.util.promisify.custom");
  function setPromisified(fn, promisified) {
    Object.defineProperty(fn, promisifyCustom, { value: promisified, configurable: true });
  }
  function promisifyResults(fn, ...names) {
    setPromisified(fn, function(...args) {
      const { promise, resolve: resolve4, reject } = Promise.withResolvers();
      fn.call(this, ...args, (error2, ...results) => {
        if (error2)
          reject(error2);
        else
          resolve4(Object.fromEntries(names.map((name, i) => [name, results[i]])));
      });
      return promise;
    });
  }

  // node_modules/@zenfs/core/dist/node/stats.js
  var _nsMultiplier = BigInt(1e6);
  var StatsCommon = class {
    /** Creates a new stats instance from a stats-like object. Can be used to copy stats (note) */
    constructor({ atimeMs, mtimeMs, ctimeMs, birthtimeMs, uid, gid, size, mode, ino, nlink, rdev, dev, blksize, ...rest } = {}) {
      /** Unix-style file mode (e.g. 0o644) that includes the type of the item. */
      __publicField(this, "mode");
      /** ID of device containing file */
      __publicField(this, "dev", this._convert(0));
      /** Inode number */
      __publicField(this, "ino", this._convert(0));
      /** Device ID (if special file) */
      __publicField(this, "rdev", this._convert(0));
      /** Number of hard links */
      __publicField(this, "nlink", this._convert(1));
      /** Block size for file system I/O */
      __publicField(this, "blksize", this._convert(4096));
      /** User ID of owner */
      __publicField(this, "uid", this._convert(0));
      /** Group ID of owner */
      __publicField(this, "gid", this._convert(0));
      /** Time of last access, since epoch */
      __publicField(this, "atimeMs");
      /** Time of last modification, since epoch */
      __publicField(this, "mtimeMs");
      /** Time of last time file status was changed, since epoch */
      __publicField(this, "ctimeMs");
      /** Time of file creation, since epoch */
      __publicField(this, "birthtimeMs");
      /** Size of the item in bytes. For directories/symlinks, this may be the size of the struct that represents the item. */
      __publicField(this, "size");
      /** @internal Used by inodes */
      __publicField(this, "data");
      /** @internal Used by inodes */
      __publicField(this, "flags");
      /** @internal Used by inodes */
      __publicField(this, "version");
      const now = Date.now();
      this.atimeMs = this._convert(atimeMs ?? now);
      this.mtimeMs = this._convert(mtimeMs ?? now);
      this.ctimeMs = this._convert(ctimeMs ?? now);
      this.birthtimeMs = this._convert(birthtimeMs ?? now);
      this.uid = this._convert(uid ?? 0);
      this.gid = this._convert(gid ?? 0);
      this.size = this._convert(size ?? 0);
      this.ino = this._convert(ino ?? 0);
      this.nlink = this._convert(nlink ?? 1);
      const numericMode = Number(mode ?? 420 & S_IFREG);
      this.mode = this._convert(numericMode & S_IFMT ? numericMode : numericMode | S_IFREG);
      this.rdev = this._convert(rdev ?? 0);
      this.dev = this._convert(dev ?? 0);
      this.blksize = this._convert(blksize ?? 4096);
      Object.assign(this, rest);
    }
    _convert(arg) {
      if (!this._isBigint)
        return Number(arg);
      return typeof arg == "number" ? BigInt(Math.trunc(arg)) : BigInt(arg);
    }
    get blocks() {
      return this._convert(Math.ceil(Number(this.size) / 512));
    }
    set blocks(value) {
    }
    get atimeInstant() {
      return temporal().Instant.fromEpochMilliseconds(Number(this.atimeMs));
    }
    set atimeInstant(value) {
      this.atimeMs = this._convert(value.epochMilliseconds);
    }
    get mtimeInstant() {
      return temporal().Instant.fromEpochMilliseconds(Number(this.mtimeMs));
    }
    set mtimeInstant(value) {
      this.mtimeMs = this._convert(value.epochMilliseconds);
    }
    get ctimeInstant() {
      return temporal().Instant.fromEpochMilliseconds(Number(this.ctimeMs));
    }
    set ctimeInstant(value) {
      this.ctimeMs = this._convert(value.epochMilliseconds);
    }
    get birthtimeInstant() {
      return temporal().Instant.fromEpochMilliseconds(Number(this.birthtimeMs));
    }
    set birthtimeInstant(value) {
      this.birthtimeMs = this._convert(value.epochMilliseconds);
    }
    isFile() {
      return (Number(this.mode) & S_IFMT) === S_IFREG;
    }
    isDirectory() {
      return (Number(this.mode) & S_IFMT) === S_IFDIR;
    }
    isSymbolicLink() {
      return (Number(this.mode) & S_IFMT) === S_IFLNK;
    }
    isSocket() {
      return (Number(this.mode) & S_IFMT) === S_IFSOCK;
    }
    isBlockDevice() {
      return (Number(this.mode) & S_IFMT) === S_IFBLK;
    }
    isCharacterDevice() {
      return (Number(this.mode) & S_IFMT) === S_IFCHR;
    }
    isFIFO() {
      return (Number(this.mode) & S_IFMT) === S_IFIFO;
    }
    toJSON() {
      return pick(this, ..._inode_fields, "dev", "blksize");
    }
    /**
     * Checks if a given user/group has access to this item
     * @param mode The requested access, combination of W_OK, R_OK, and X_OK
     * @returns True if the request has access, false if the request does not
     * @internal
     */
    hasAccess(mode, context) {
      return hasAccess(context, this._isBigint ? new Stats(this) : this, mode);
    }
    get atimeNs() {
      return BigInt(this.atimeMs) * _nsMultiplier;
    }
    get mtimeNs() {
      return BigInt(this.mtimeMs) * _nsMultiplier;
    }
    get ctimeNs() {
      return BigInt(this.ctimeMs) * _nsMultiplier;
    }
    get birthtimeNs() {
      return BigInt(this.birthtimeMs) * _nsMultiplier;
    }
  };
  function lazyDate(name) {
    function store(stats, value) {
      Object.defineProperty(stats, name, { value, writable: true, enumerable: true, configurable: true });
      return value;
    }
    return {
      enumerable: true,
      configurable: true,
      get() {
        return store(this, new Date(Number(this[`${name}Ms`])));
      },
      set(value) {
        store(this, value);
      }
    };
  }
  Object.defineProperties(StatsCommon.prototype, {
    atime: lazyDate("atime"),
    mtime: lazyDate("mtime"),
    ctime: lazyDate("ctime"),
    birthtime: lazyDate("birthtime")
  });
  var Stats = class extends StatsCommon {
    get _isBigint() {
      return false;
    }
  };
  var BigIntStats = class extends StatsCommon {
    get _isBigint() {
      return true;
    }
  };
  function isStatsEqual(left, right) {
    return left.size == right.size && +left.atime == +right.atime && +left.mtime == +right.mtime && +left.ctime == +right.ctime && left.mode == right.mode;
  }
  var StatsFs = class {
    constructor() {
      /** Type of file system. */
      __publicField(this, "type", 525687744115);
      /**  Optimal transfer block size. */
      __publicField(this, "bsize", 4096);
      /**  Total data blocks in file system. */
      __publicField(this, "blocks", 0);
      /** Free blocks in file system. */
      __publicField(this, "bfree", 0);
      /** Available blocks for unprivileged users */
      __publicField(this, "bavail", 0);
      /** Total file nodes in file system. */
      __publicField(this, "files", size_max);
      /** Fundamental file system block size. */
      __publicField(this, "frsize", 4096);
      /** Free file nodes in file system. */
      __publicField(this, "ffree", size_max);
    }
  };
  var BigIntStatsFs = class {
    constructor() {
      /** Type of file system. */
      __publicField(this, "type", BigInt("0x7a656e6673"));
      /**  Optimal transfer block size. */
      __publicField(this, "bsize", BigInt(4096));
      /**  Total data blocks in file system. */
      __publicField(this, "blocks", BigInt(0));
      /** Free blocks in file system. */
      __publicField(this, "bfree", BigInt(0));
      /** Available blocks for unprivileged users */
      __publicField(this, "bavail", BigInt(0));
      /** Total file nodes in file system. */
      __publicField(this, "files", BigInt(size_max));
      /** Fundamental file system block size. */
      __publicField(this, "frsize", BigInt(4096));
      /** Free file nodes in file system. */
      __publicField(this, "ffree", BigInt(size_max));
    }
  };

  // node_modules/@zenfs/core/dist/vfs/config.js
  var checkAccess = true;
  var resolveFullWalk = false;

  // node_modules/@zenfs/core/dist/internal/inode.js
  var __esDecorate2 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var __runInitializers2 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var rootIno = 0;
  var maxDynamicData = 3968;
  var Attribute = (() => {
    var _a13, _keySize_accessor_storage, _valueSize_accessor_storage;
    var _a12, _b3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from.typed(Uint8Array);
    let _keySize_decorators;
    let _keySize_initializers = [];
    let _keySize_extraInitializers = [];
    let _valueSize_decorators;
    let _valueSize_initializers = [];
    let _valueSize_extraInitializers = [];
    var Attribute2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _keySize_accessor_storage, __runInitializers2(this, _keySize_initializers, void 0));
        __privateAdd(this, _valueSize_accessor_storage, (__runInitializers2(this, _keySize_extraInitializers), __runInitializers2(this, _valueSize_initializers, void 0)));
        __runInitializers2(this, _valueSize_extraInitializers);
      }
      get keySize() {
        return __privateGet(this, _keySize_accessor_storage);
      }
      set keySize(value) {
        __privateSet(this, _keySize_accessor_storage, value);
      }
      get valueSize() {
        return __privateGet(this, _valueSize_accessor_storage);
      }
      set valueSize(value) {
        __privateSet(this, _valueSize_accessor_storage, value);
      }
      get name() {
        return decodeUTF8(this.subarray(8, 8 + this.keySize));
      }
      /**
       * Note that this does not handle moving the data.
       * Changing the name after setting the value is undefined behavior and will lead to corruption.
       * This should only be used when creating a new attribute.
       */
      set name(value) {
        const buf = encodeUTF8(value);
        if (8 + buf.length + this.valueSize > maxDynamicData)
          throw withErrno("EOVERFLOW");
        this.set(buf, 8);
        this.keySize = buf.length;
      }
      get value() {
        return this.subarray(8 + this.keySize, this.size);
      }
      set value(value) {
        if (8 + this.keySize + value.length > maxDynamicData)
          throw withErrno("EOVERFLOW");
        this.valueSize = value.length;
        this.set(value, 8 + this.keySize);
      }
      get size() {
        return 8 + this.keySize + this.valueSize;
      }
    }, _keySize_accessor_storage = new WeakMap(), _valueSize_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _keySize_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _valueSize_decorators = [(_b3 = types2).uint32.bind(_b3)];
      __esDecorate2(_a13, null, _keySize_decorators, { kind: "accessor", name: "keySize", static: false, private: false, access: { has: (obj) => "keySize" in obj, get: (obj) => obj.keySize, set: (obj, value) => {
        obj.keySize = value;
      } }, metadata: _metadata }, _keySize_initializers, _keySize_extraInitializers);
      __esDecorate2(_a13, null, _valueSize_decorators, { kind: "accessor", name: "valueSize", static: false, private: false, access: { has: (obj) => "valueSize" in obj, get: (obj) => obj.valueSize, set: (obj, value) => {
        obj.valueSize = value;
      } }, metadata: _metadata }, _valueSize_initializers, _valueSize_extraInitializers);
      __esDecorate2(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      Attribute2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "Attribute"), __runInitializers2(_classThis, _classExtraInitializers), _a13);
    return Attribute2 = _classThis;
  })();
  var Attributes = (() => {
    var _a13, _size_accessor_storage;
    var _a12;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    var Attributes2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _size_accessor_storage, __runInitializers2(this, _size_initializers, void 0));
        __runInitializers2(this, _size_extraInitializers);
      }
      get size() {
        return __privateGet(this, _size_accessor_storage);
      }
      set size(value) {
        __privateSet(this, _size_accessor_storage, value);
      }
      get byteSize() {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          offset += entry.size;
        }
        return offset;
      }
      has(name) {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          if (entry.name == name)
            return true;
          offset += entry.size;
        }
        return false;
      }
      get(name) {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          if (entry.name == name)
            return entry.value;
          offset += entry.size;
        }
      }
      set(name, value) {
        let offset = this.byteOffset + sizeof(this);
        let remove2;
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          if (entry.name == name)
            remove2 = [offset, entry.size];
          offset += entry.size;
        }
        const buf = new Uint8Array(this.buffer);
        if (remove2) {
          const [start, size] = remove2;
          offset -= size;
          buf.copyWithin(start, start + size, offset + size);
          buf.fill(0, offset, offset + size);
          this.size--;
        }
        const attr = new Attribute(this.buffer, offset);
        attr.name = name;
        attr.value = value;
        this.size++;
      }
      remove(name) {
        let offset = this.byteOffset + sizeof(this);
        let remove2;
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          if (entry.name == name)
            remove2 = [offset, entry.size];
          offset += entry.size;
        }
        if (!remove2)
          return false;
        const [start, size] = remove2;
        const buf = new Uint8Array(this.buffer);
        buf.copyWithin(start, start + size, offset);
        buf.fill(0, offset - size, offset);
        this.size--;
        return true;
      }
      copyFrom(other) {
        const { byteSize } = other;
        new Uint8Array(this.buffer, this.byteOffset, byteSize).set(new Uint8Array(other.buffer, other.byteOffset, byteSize));
      }
      *keys() {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          yield entry.name;
          offset += entry.size;
        }
      }
      *values() {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          yield entry.value;
          offset += entry.size;
        }
      }
      *entries() {
        let offset = this.byteOffset + sizeof(this);
        for (let i = 0; i < this.size; i++) {
          const entry = new Attribute(this.buffer, offset);
          yield [entry.name, entry.value];
          offset += entry.size;
        }
      }
    }, _size_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _size_decorators = [(_a12 = types2).uint32.bind(_a12)];
      __esDecorate2(_a13, null, _size_decorators, { kind: "accessor", name: "size", static: false, private: false, access: { has: (obj) => "size" in obj, get: (obj) => obj.size, set: (obj, value) => {
        obj.size = value;
      } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
      __esDecorate2(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      Attributes2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "Attributes"), __runInitializers2(_classThis, _classExtraInitializers), _a13);
    return Attributes2 = _classThis;
  })();
  var _inode_fields = [
    "ino",
    "data",
    "size",
    "mode",
    "flags",
    "nlink",
    "uid",
    "gid",
    "atimeMs",
    "birthtimeMs",
    "mtimeMs",
    "ctimeMs",
    "version",
    "rdev"
  ];
  var _inode_version = 5;
  var InodeFlags;
  (function(InodeFlags2) {
    InodeFlags2[InodeFlags2["Sync"] = 1] = "Sync";
    InodeFlags2[InodeFlags2["NoAtime"] = 2] = "NoAtime";
    InodeFlags2[InodeFlags2["Append"] = 4] = "Append";
    InodeFlags2[InodeFlags2["Immutable"] = 8] = "Immutable";
    InodeFlags2[InodeFlags2["Dead"] = 16] = "Dead";
    InodeFlags2[InodeFlags2["NoQuota"] = 32] = "NoQuota";
    InodeFlags2[InodeFlags2["Dirsync"] = 64] = "Dirsync";
    InodeFlags2[InodeFlags2["NoCMtime"] = 128] = "NoCMtime";
    InodeFlags2[InodeFlags2["SwapFile"] = 256] = "SwapFile";
    InodeFlags2[InodeFlags2["Private"] = 512] = "Private";
    InodeFlags2[InodeFlags2["IMA"] = 1024] = "IMA";
    InodeFlags2[InodeFlags2["AutoMount"] = 2048] = "AutoMount";
    InodeFlags2[InodeFlags2["NoSec"] = 4096] = "NoSec";
    InodeFlags2[InodeFlags2["DAX"] = 8192] = "DAX";
    InodeFlags2[InodeFlags2["Encrypted"] = 16384] = "Encrypted";
    InodeFlags2[InodeFlags2["CaseFold"] = 32768] = "CaseFold";
    InodeFlags2[InodeFlags2["Verity"] = 65536] = "Verity";
    InodeFlags2[InodeFlags2["KernelFile"] = 131072] = "KernelFile";
  })(InodeFlags || (InodeFlags = {}));
  var Inode = (() => {
    var _a13, _data_accessor_storage, ___data_old_accessor_storage, _size_accessor_storage, _mode_accessor_storage, _nlink_accessor_storage, _uid_accessor_storage, _gid_accessor_storage, _atimeMs_accessor_storage, _birthtimeMs_accessor_storage, _mtimeMs_accessor_storage, _ctimeMs_accessor_storage, _ino_accessor_storage, ___ino_old_accessor_storage, _flags_accessor_storage, ___after_flags_accessor_storage, _version_accessor_storage, _rdev_accessor_storage, ___padding_accessor_storage, _attributes_accessor_storage, ___data_accessor_storage;
    var _a12, _b3, _c3, _d3, _e3, _f2, _g2, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _data_decorators;
    let _data_initializers = [];
    let _data_extraInitializers = [];
    let ___data_old_decorators;
    let ___data_old_initializers = [];
    let ___data_old_extraInitializers = [];
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    let _mode_decorators;
    let _mode_initializers = [];
    let _mode_extraInitializers = [];
    let _nlink_decorators;
    let _nlink_initializers = [];
    let _nlink_extraInitializers = [];
    let _uid_decorators;
    let _uid_initializers = [];
    let _uid_extraInitializers = [];
    let _gid_decorators;
    let _gid_initializers = [];
    let _gid_extraInitializers = [];
    let _atimeMs_decorators;
    let _atimeMs_initializers = [];
    let _atimeMs_extraInitializers = [];
    let _birthtimeMs_decorators;
    let _birthtimeMs_initializers = [];
    let _birthtimeMs_extraInitializers = [];
    let _mtimeMs_decorators;
    let _mtimeMs_initializers = [];
    let _mtimeMs_extraInitializers = [];
    let _ctimeMs_decorators;
    let _ctimeMs_initializers = [];
    let _ctimeMs_extraInitializers = [];
    let _ino_decorators;
    let _ino_initializers = [];
    let _ino_extraInitializers = [];
    let ___ino_old_decorators;
    let ___ino_old_initializers = [];
    let ___ino_old_extraInitializers = [];
    let _flags_decorators;
    let _flags_initializers = [];
    let _flags_extraInitializers = [];
    let ___after_flags_decorators;
    let ___after_flags_initializers = [];
    let ___after_flags_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _rdev_decorators;
    let _rdev_initializers = [];
    let _rdev_extraInitializers = [];
    let ___padding_decorators;
    let ___padding_initializers = [];
    let ___padding_extraInitializers = [];
    let _attributes_decorators;
    let _attributes_initializers = [];
    let _attributes_extraInitializers = [];
    let ___data_decorators;
    let ___data_initializers = [];
    let ___data_extraInitializers = [];
    var Inode2 = (_a13 = class extends _classSuper {
      constructor(...args) {
        let data = {};
        if (typeof args[0] === "object" && args[0] !== null && !ArrayBuffer.isView(args[0])) {
          data = args[0];
          args = [sizeof(Inode2)];
        }
        if (args[0] instanceof Inode2) {
          args = [new Uint8Array(args[0].buffer, args[0].byteOffset, args[0].byteLength)];
        }
        super(...args);
        __privateAdd(this, _data_accessor_storage, __runInitializers2(this, _data_initializers, void 0));
        __privateAdd(this, ___data_old_accessor_storage, (__runInitializers2(this, _data_extraInitializers), __runInitializers2(this, ___data_old_initializers, void 0)));
        __privateAdd(this, _size_accessor_storage, (__runInitializers2(this, ___data_old_extraInitializers), __runInitializers2(this, _size_initializers, void 0)));
        __privateAdd(this, _mode_accessor_storage, (__runInitializers2(this, _size_extraInitializers), __runInitializers2(this, _mode_initializers, void 0)));
        __privateAdd(this, _nlink_accessor_storage, (__runInitializers2(this, _mode_extraInitializers), __runInitializers2(this, _nlink_initializers, void 0)));
        __privateAdd(this, _uid_accessor_storage, (__runInitializers2(this, _nlink_extraInitializers), __runInitializers2(this, _uid_initializers, void 0)));
        __privateAdd(this, _gid_accessor_storage, (__runInitializers2(this, _uid_extraInitializers), __runInitializers2(this, _gid_initializers, void 0)));
        __privateAdd(this, _atimeMs_accessor_storage, (__runInitializers2(this, _gid_extraInitializers), __runInitializers2(this, _atimeMs_initializers, void 0)));
        __privateAdd(this, _birthtimeMs_accessor_storage, (__runInitializers2(this, _atimeMs_extraInitializers), __runInitializers2(this, _birthtimeMs_initializers, void 0)));
        __privateAdd(this, _mtimeMs_accessor_storage, (__runInitializers2(this, _birthtimeMs_extraInitializers), __runInitializers2(this, _mtimeMs_initializers, void 0)));
        __privateAdd(this, _ctimeMs_accessor_storage, (__runInitializers2(this, _mtimeMs_extraInitializers), __runInitializers2(this, _ctimeMs_initializers, void 0)));
        __privateAdd(this, _ino_accessor_storage, (__runInitializers2(this, _ctimeMs_extraInitializers), __runInitializers2(this, _ino_initializers, void 0)));
        __privateAdd(this, ___ino_old_accessor_storage, (__runInitializers2(this, _ino_extraInitializers), __runInitializers2(this, ___ino_old_initializers, void 0)));
        __privateAdd(this, _flags_accessor_storage, (__runInitializers2(this, ___ino_old_extraInitializers), __runInitializers2(this, _flags_initializers, void 0)));
        __privateAdd(this, ___after_flags_accessor_storage, (__runInitializers2(this, _flags_extraInitializers), __runInitializers2(this, ___after_flags_initializers, void 0)));
        __privateAdd(this, _version_accessor_storage, (__runInitializers2(this, ___after_flags_extraInitializers), __runInitializers2(this, _version_initializers, void 0)));
        __privateAdd(this, _rdev_accessor_storage, (__runInitializers2(this, _version_extraInitializers), __runInitializers2(this, _rdev_initializers, void 0)));
        __privateAdd(this, ___padding_accessor_storage, (__runInitializers2(this, _rdev_extraInitializers), __runInitializers2(this, ___padding_initializers, void 0)));
        __privateAdd(this, _attributes_accessor_storage, (__runInitializers2(this, ___padding_extraInitializers), __runInitializers2(this, _attributes_initializers, void 0)));
        __privateAdd(this, ___data_accessor_storage, (__runInitializers2(this, _attributes_extraInitializers), __runInitializers2(this, ___data_initializers, void 0)));
        __runInitializers2(this, ___data_extraInitializers);
        if (this.byteLength < sizeof(Inode2)) {
          throw crit(withErrno("EIO", `Buffer is too small to create an inode (${this.byteLength} bytes)`));
        }
        Object.assign(this, data);
        this.atimeMs || (this.atimeMs = Date.now());
        this.mtimeMs || (this.mtimeMs = Date.now());
        this.ctimeMs || (this.ctimeMs = Date.now());
        this.birthtimeMs || (this.birthtimeMs = Date.now());
        if (this.ino && !this.nlink) {
          warn(`Inode ${this.ino} has an nlink of 0`);
        }
      }
      get data() {
        return __privateGet(this, _data_accessor_storage);
      }
      set data(value) {
        __privateSet(this, _data_accessor_storage, value);
      }
      /** For future use */
      get __data_old() {
        return __privateGet(this, ___data_old_accessor_storage);
      }
      set __data_old(value) {
        __privateSet(this, ___data_old_accessor_storage, value);
      }
      get size() {
        return __privateGet(this, _size_accessor_storage);
      }
      set size(value) {
        __privateSet(this, _size_accessor_storage, value);
      }
      get mode() {
        return __privateGet(this, _mode_accessor_storage);
      }
      set mode(value) {
        __privateSet(this, _mode_accessor_storage, value);
      }
      get nlink() {
        return __privateGet(this, _nlink_accessor_storage);
      }
      set nlink(value) {
        __privateSet(this, _nlink_accessor_storage, value);
      }
      get uid() {
        return __privateGet(this, _uid_accessor_storage);
      }
      set uid(value) {
        __privateSet(this, _uid_accessor_storage, value);
      }
      get gid() {
        return __privateGet(this, _gid_accessor_storage);
      }
      set gid(value) {
        __privateSet(this, _gid_accessor_storage, value);
      }
      get atimeMs() {
        return __privateGet(this, _atimeMs_accessor_storage);
      }
      set atimeMs(value) {
        __privateSet(this, _atimeMs_accessor_storage, value);
      }
      get birthtimeMs() {
        return __privateGet(this, _birthtimeMs_accessor_storage);
      }
      set birthtimeMs(value) {
        __privateSet(this, _birthtimeMs_accessor_storage, value);
      }
      get mtimeMs() {
        return __privateGet(this, _mtimeMs_accessor_storage);
      }
      set mtimeMs(value) {
        __privateSet(this, _mtimeMs_accessor_storage, value);
      }
      /**
       * The time the inode was changed.
       *
       * This is automatically updated whenever changed are made using `update()`.
       */
      get ctimeMs() {
        return __privateGet(this, _ctimeMs_accessor_storage);
      }
      set ctimeMs(value) {
        __privateSet(this, _ctimeMs_accessor_storage, value);
      }
      get ino() {
        return __privateGet(this, _ino_accessor_storage);
      }
      set ino(value) {
        __privateSet(this, _ino_accessor_storage, value);
      }
      /** For future use */
      get __ino_old() {
        return __privateGet(this, ___ino_old_accessor_storage);
      }
      set __ino_old(value) {
        __privateSet(this, ___ino_old_accessor_storage, value);
      }
      get flags() {
        return __privateGet(this, _flags_accessor_storage);
      }
      set flags(value) {
        __privateSet(this, _flags_accessor_storage, value);
      }
      /** For future use */
      get __after_flags() {
        return __privateGet(this, ___after_flags_accessor_storage);
      }
      set __after_flags(value) {
        __privateSet(this, ___after_flags_accessor_storage, value);
      }
      /**
       * The "version" of the inode/data.
       * Unrelated to the inode format!
       */
      get version() {
        return __privateGet(this, _version_accessor_storage);
      }
      set version(value) {
        __privateSet(this, _version_accessor_storage, value);
      }
      get rdev() {
        return __privateGet(this, _rdev_accessor_storage);
      }
      set rdev(value) {
        __privateSet(this, _rdev_accessor_storage, value);
      }
      /**
       * Padding up to 128 bytes.
       * This ensures there is enough room for expansion without breaking the ABI.
       * @internal
       */
      get __padding() {
        return __privateGet(this, ___padding_accessor_storage);
      }
      set __padding(value) {
        __privateSet(this, ___padding_accessor_storage, value);
      }
      get attributes() {
        return __privateGet(this, _attributes_accessor_storage);
      }
      set attributes(value) {
        __privateSet(this, _attributes_accessor_storage, value);
      }
      /**
       * Since the attribute data uses dynamic arrays,
       * it is necessary to add this so attributes can be added.
       * @internal @hidden
       */
      get __data() {
        return __privateGet(this, ___data_accessor_storage);
      }
      set __data(value) {
        __privateSet(this, ___data_accessor_storage, value);
      }
      toString() {
        return `<Inode ${this.ino}>`;
      }
      toJSON() {
        return {
          ...pick(this, _inode_fields),
          attributes: this.attributes
        };
      }
      /**
       * Handy function that converts the Inode to a Node Stats object.
       * @deprecated Use `new Stats(inode)` instead.
       */
      toStats() {
        return new Stats(this);
      }
      /**
       * Updates the Inode using information from the stats object. Used by file
       * systems at sync time, e.g.:
       * - Program opens file and gets a File object.
       * - Program mutates file. File object is responsible for maintaining
       *   metadata changes locally -- typically in a Stats object.
       * - Program closes file. File object's metadata changes are synced with the
       *   file system.
       * @returns whether any changes have occurred.
       */
      update(data) {
        if (!data)
          return false;
        let hasChanged = false;
        for (const key of _inode_fields) {
          if (data[key] === void 0)
            continue;
          if (key == "ino" || key == "data")
            continue;
          if (this[key] === data[key])
            continue;
          if (key == "atimeMs" && this.flags & InodeFlags.NoAtime)
            continue;
          this[key] = data[key];
          hasChanged = true;
        }
        if (data.attributes) {
          this.attributes.copyFrom(data.attributes);
          hasChanged = true;
        }
        if (hasChanged)
          this.ctimeMs = Date.now();
        return hasChanged;
      }
    }, _data_accessor_storage = new WeakMap(), ___data_old_accessor_storage = new WeakMap(), _size_accessor_storage = new WeakMap(), _mode_accessor_storage = new WeakMap(), _nlink_accessor_storage = new WeakMap(), _uid_accessor_storage = new WeakMap(), _gid_accessor_storage = new WeakMap(), _atimeMs_accessor_storage = new WeakMap(), _birthtimeMs_accessor_storage = new WeakMap(), _mtimeMs_accessor_storage = new WeakMap(), _ctimeMs_accessor_storage = new WeakMap(), _ino_accessor_storage = new WeakMap(), ___ino_old_accessor_storage = new WeakMap(), _flags_accessor_storage = new WeakMap(), ___after_flags_accessor_storage = new WeakMap(), _version_accessor_storage = new WeakMap(), _rdev_accessor_storage = new WeakMap(), ___padding_accessor_storage = new WeakMap(), _attributes_accessor_storage = new WeakMap(), ___data_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _data_decorators = [(_a12 = types2).uint32.bind(_a12)];
      ___data_old_decorators = [(_b3 = types2).uint32.bind(_b3)];
      _size_decorators = [(_c3 = types2).uint32.bind(_c3)];
      _mode_decorators = [(_d3 = types2).uint16.bind(_d3)];
      _nlink_decorators = [(_e3 = types2).uint32.bind(_e3)];
      _uid_decorators = [(_f2 = types2).uint32.bind(_f2)];
      _gid_decorators = [(_g2 = types2).uint32.bind(_g2)];
      _atimeMs_decorators = [(_h = types2).float64.bind(_h)];
      _birthtimeMs_decorators = [(_j = types2).float64.bind(_j)];
      _mtimeMs_decorators = [(_k = types2).float64.bind(_k)];
      _ctimeMs_decorators = [(_l = types2).float64.bind(_l)];
      _ino_decorators = [(_m = types2).uint32.bind(_m)];
      ___ino_old_decorators = [(_o = types2).uint32.bind(_o)];
      _flags_decorators = [(_p = types2).uint32.bind(_p)];
      ___after_flags_decorators = [(_q = types2).uint16.bind(_q)];
      _version_decorators = [(_r = types2).uint32.bind(_r)];
      _rdev_decorators = [(_s = types2).uint32.bind(_s)];
      ___padding_decorators = [types2.uint8(44)];
      _attributes_decorators = [field(Attributes)];
      ___data_decorators = [types2.uint8(maxDynamicData)];
      __esDecorate2(_a13, null, _data_decorators, { kind: "accessor", name: "data", static: false, private: false, access: { has: (obj) => "data" in obj, get: (obj) => obj.data, set: (obj, value) => {
        obj.data = value;
      } }, metadata: _metadata }, _data_initializers, _data_extraInitializers);
      __esDecorate2(_a13, null, ___data_old_decorators, { kind: "accessor", name: "__data_old", static: false, private: false, access: { has: (obj) => "__data_old" in obj, get: (obj) => obj.__data_old, set: (obj, value) => {
        obj.__data_old = value;
      } }, metadata: _metadata }, ___data_old_initializers, ___data_old_extraInitializers);
      __esDecorate2(_a13, null, _size_decorators, { kind: "accessor", name: "size", static: false, private: false, access: { has: (obj) => "size" in obj, get: (obj) => obj.size, set: (obj, value) => {
        obj.size = value;
      } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
      __esDecorate2(_a13, null, _mode_decorators, { kind: "accessor", name: "mode", static: false, private: false, access: { has: (obj) => "mode" in obj, get: (obj) => obj.mode, set: (obj, value) => {
        obj.mode = value;
      } }, metadata: _metadata }, _mode_initializers, _mode_extraInitializers);
      __esDecorate2(_a13, null, _nlink_decorators, { kind: "accessor", name: "nlink", static: false, private: false, access: { has: (obj) => "nlink" in obj, get: (obj) => obj.nlink, set: (obj, value) => {
        obj.nlink = value;
      } }, metadata: _metadata }, _nlink_initializers, _nlink_extraInitializers);
      __esDecorate2(_a13, null, _uid_decorators, { kind: "accessor", name: "uid", static: false, private: false, access: { has: (obj) => "uid" in obj, get: (obj) => obj.uid, set: (obj, value) => {
        obj.uid = value;
      } }, metadata: _metadata }, _uid_initializers, _uid_extraInitializers);
      __esDecorate2(_a13, null, _gid_decorators, { kind: "accessor", name: "gid", static: false, private: false, access: { has: (obj) => "gid" in obj, get: (obj) => obj.gid, set: (obj, value) => {
        obj.gid = value;
      } }, metadata: _metadata }, _gid_initializers, _gid_extraInitializers);
      __esDecorate2(_a13, null, _atimeMs_decorators, { kind: "accessor", name: "atimeMs", static: false, private: false, access: { has: (obj) => "atimeMs" in obj, get: (obj) => obj.atimeMs, set: (obj, value) => {
        obj.atimeMs = value;
      } }, metadata: _metadata }, _atimeMs_initializers, _atimeMs_extraInitializers);
      __esDecorate2(_a13, null, _birthtimeMs_decorators, { kind: "accessor", name: "birthtimeMs", static: false, private: false, access: { has: (obj) => "birthtimeMs" in obj, get: (obj) => obj.birthtimeMs, set: (obj, value) => {
        obj.birthtimeMs = value;
      } }, metadata: _metadata }, _birthtimeMs_initializers, _birthtimeMs_extraInitializers);
      __esDecorate2(_a13, null, _mtimeMs_decorators, { kind: "accessor", name: "mtimeMs", static: false, private: false, access: { has: (obj) => "mtimeMs" in obj, get: (obj) => obj.mtimeMs, set: (obj, value) => {
        obj.mtimeMs = value;
      } }, metadata: _metadata }, _mtimeMs_initializers, _mtimeMs_extraInitializers);
      __esDecorate2(_a13, null, _ctimeMs_decorators, { kind: "accessor", name: "ctimeMs", static: false, private: false, access: { has: (obj) => "ctimeMs" in obj, get: (obj) => obj.ctimeMs, set: (obj, value) => {
        obj.ctimeMs = value;
      } }, metadata: _metadata }, _ctimeMs_initializers, _ctimeMs_extraInitializers);
      __esDecorate2(_a13, null, _ino_decorators, { kind: "accessor", name: "ino", static: false, private: false, access: { has: (obj) => "ino" in obj, get: (obj) => obj.ino, set: (obj, value) => {
        obj.ino = value;
      } }, metadata: _metadata }, _ino_initializers, _ino_extraInitializers);
      __esDecorate2(_a13, null, ___ino_old_decorators, { kind: "accessor", name: "__ino_old", static: false, private: false, access: { has: (obj) => "__ino_old" in obj, get: (obj) => obj.__ino_old, set: (obj, value) => {
        obj.__ino_old = value;
      } }, metadata: _metadata }, ___ino_old_initializers, ___ino_old_extraInitializers);
      __esDecorate2(_a13, null, _flags_decorators, { kind: "accessor", name: "flags", static: false, private: false, access: { has: (obj) => "flags" in obj, get: (obj) => obj.flags, set: (obj, value) => {
        obj.flags = value;
      } }, metadata: _metadata }, _flags_initializers, _flags_extraInitializers);
      __esDecorate2(_a13, null, ___after_flags_decorators, { kind: "accessor", name: "__after_flags", static: false, private: false, access: { has: (obj) => "__after_flags" in obj, get: (obj) => obj.__after_flags, set: (obj, value) => {
        obj.__after_flags = value;
      } }, metadata: _metadata }, ___after_flags_initializers, ___after_flags_extraInitializers);
      __esDecorate2(_a13, null, _version_decorators, { kind: "accessor", name: "version", static: false, private: false, access: { has: (obj) => "version" in obj, get: (obj) => obj.version, set: (obj, value) => {
        obj.version = value;
      } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
      __esDecorate2(_a13, null, _rdev_decorators, { kind: "accessor", name: "rdev", static: false, private: false, access: { has: (obj) => "rdev" in obj, get: (obj) => obj.rdev, set: (obj, value) => {
        obj.rdev = value;
      } }, metadata: _metadata }, _rdev_initializers, _rdev_extraInitializers);
      __esDecorate2(_a13, null, ___padding_decorators, { kind: "accessor", name: "__padding", static: false, private: false, access: { has: (obj) => "__padding" in obj, get: (obj) => obj.__padding, set: (obj, value) => {
        obj.__padding = value;
      } }, metadata: _metadata }, ___padding_initializers, ___padding_extraInitializers);
      __esDecorate2(_a13, null, _attributes_decorators, { kind: "accessor", name: "attributes", static: false, private: false, access: { has: (obj) => "attributes" in obj, get: (obj) => obj.attributes, set: (obj, value) => {
        obj.attributes = value;
      } }, metadata: _metadata }, _attributes_initializers, _attributes_extraInitializers);
      __esDecorate2(_a13, null, ___data_decorators, { kind: "accessor", name: "__data", static: false, private: false, access: { has: (obj) => "__data" in obj, get: (obj) => obj.__data, set: (obj, value) => {
        obj.__data = value;
      } }, metadata: _metadata }, ___data_initializers, ___data_extraInitializers);
      __esDecorate2(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      Inode2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "Inode"), __runInitializers2(_classThis, _classExtraInitializers), _a13);
    return Inode2 = _classThis;
  })();
  function isFile(metadata) {
    return (metadata.mode & S_IFMT) === S_IFREG;
  }
  function isDirectory(metadata) {
    return (metadata.mode & S_IFMT) === S_IFDIR;
  }
  function isSymbolicLink(metadata) {
    return (metadata.mode & S_IFMT) === S_IFLNK;
  }
  function isBlockDevice(metadata) {
    return (metadata.mode & S_IFMT) === S_IFBLK;
  }
  function isCharacterDevice(metadata) {
    return (metadata.mode & S_IFMT) === S_IFCHR;
  }
  function hasAccess($, inode, access3) {
    const { credentials } = contextOf($);
    if (isSymbolicLink(inode))
      return true;
    if (credentials.euid === 0)
      return !(access3 & X_OK) || isDirectory(inode) || !!(inode.mode & (S_IXUSR | S_IXGRP | S_IXOTH));
    let perm = 0;
    if (credentials.euid === inode.uid) {
      if (inode.mode & S_IRUSR)
        perm |= R_OK;
      if (inode.mode & S_IWUSR)
        perm |= W_OK;
      if (inode.mode & S_IXUSR)
        perm |= X_OK;
    } else if (credentials.egid === inode.gid || credentials.groups.includes(Number(inode.gid))) {
      if (inode.mode & S_IRGRP)
        perm |= R_OK;
      if (inode.mode & S_IWGRP)
        perm |= W_OK;
      if (inode.mode & S_IXGRP)
        perm |= X_OK;
    } else {
      if (inode.mode & S_IROTH)
        perm |= R_OK;
      if (inode.mode & S_IWOTH)
        perm |= W_OK;
      if (inode.mode & S_IXOTH)
        perm |= X_OK;
    }
    return (perm & access3) === access3;
  }
  function assertSearchable($, dir, extra) {
    if (checkAccess && !hasAccess($, dir, X_OK))
      throw UV("EACCES", extra);
  }
  function assertRemovable($, parent, entry, extra) {
    if (!checkAccess)
      return;
    if (!hasAccess($, parent, W_OK | X_OK))
      throw UV("EACCES", extra);
    const { euid } = contextOf($).credentials;
    if (parent.mode & S_ISVTX && euid !== 0 && euid !== entry.uid && euid !== parent.uid)
      throw UV("EPERM", extra);
  }
  function assertOwner($, inode, extra) {
    if (!checkAccess)
      return;
    const { euid } = contextOf($).credentials;
    if (euid !== 0 && euid !== inode.uid)
      throw UV("EPERM", extra);
  }
  function assertCanChown($, inode, uid, gid, extra) {
    if (!checkAccess)
      return;
    const { euid, egid, groups } = contextOf($).credentials;
    if (euid === 0)
      return;
    const isOwner = euid === inode.uid;
    if (uid !== -1 && !(isOwner && uid === inode.uid))
      throw UV("EPERM", extra);
    if (gid !== -1 && !(isOwner && (gid === inode.gid || gid === egid || groups.includes(gid))))
      throw UV("EPERM", extra);
  }
  function _chown(stats, uid, gid) {
    let valid = true;
    if (!isNaN(uid) && uid >= 0 && uid < size_max)
      stats.uid = uid;
    else
      valid = false;
    if (!isNaN(gid) && gid >= 0 && gid < size_max)
      stats.gid = gid;
    else
      valid = false;
    if (stats.mode !== void 0 && !isDirectory({ mode: stats.mode })) {
      stats.mode &= ~S_ISUID;
      if (stats.mode & S_IXGRP)
        stats.mode &= ~S_ISGID;
    }
    return valid;
  }
  function _chmod($, inode, mode) {
    const { euid, egid, groups } = contextOf($).credentials;
    if (checkAccess && euid !== 0 && egid !== inode.gid && !groups.includes(inode.gid))
      mode &= ~S_ISGID;
    inode.mode = inode.mode & (mode > S_IFMT ? ~S_IFMT : S_IFMT) | mode;
  }

  // node_modules/@zenfs/core/dist/internal/file_index.js
  var version = 1;
  var _lastAlloc;
  var _Index = class _Index extends Map {
    constructor() {
      super(...arguments);
      __publicField(this, "maxSize", size_max);
      __privateAdd(this, _lastAlloc, 0);
    }
    /**
     * Converts the index to JSON
     */
    toJSON() {
      return {
        version,
        maxSize: this.maxSize,
        // @todo use `Iterator.map` #296
        entries: Object.fromEntries(Array.from(this).map(([k, v]) => [k, v.toJSON()]))
      };
    }
    /**
     * Converts the index to a string
     */
    toString() {
      return JSON.stringify(this.toJSON());
    }
    clear() {
      super.clear();
      __privateSet(this, _lastAlloc, 0);
    }
    /**
     * Get the size in bytes of the index (including the size reported for each entry)
     */
    get byteSize() {
      let size = this.size * sizeof(Inode);
      for (const entry of this.values())
        size += entry.size;
      return size;
    }
    usage() {
      return {
        totalSpace: this.maxSize,
        freeSpace: this.maxSize - this.byteSize
      };
    }
    pathOf(id) {
      for (const [path, inode] of this) {
        if (inode.ino == id || inode.data == id)
          return path;
      }
    }
    getByID(id) {
      return this.entryByID(id)?.inode;
    }
    entryByID(id) {
      for (const [path, inode] of this) {
        if (inode.ino == id || inode.data == id)
          return { path, inode };
      }
    }
    directoryEntries(path) {
      const node = this.get(path);
      if (!node)
        throw withErrno("ENOENT");
      if ((node.mode & S_IFMT) != S_IFDIR)
        throw withErrno("ENOTDIR");
      const entries2 = {};
      for (const entry of this.keys()) {
        if (dirname(entry) == path && entry != path) {
          entries2[basename(entry)] = this.get(entry).ino;
        }
      }
      return entries2;
    }
    /**
     * Get the next available ID in the index
     * @internal
     */
    _alloc() {
      __privateGet(this, _lastAlloc) || __privateSet(this, _lastAlloc, Array.from(this.values()).reduce((max, inode) => Math.max(max, inode.ino, inode.data), 0));
      __privateWrapper(this, _lastAlloc)._++;
      return __privateWrapper(this, _lastAlloc)._++;
    }
    /**
     * Gets a list of entries for each directory in the index.
     * Use
     */
    directories() {
      const dirs = /* @__PURE__ */ new Map();
      for (const [path, node] of this) {
        if ((node.mode & S_IFMT) != S_IFDIR)
          continue;
        const entries2 = {};
        for (const entry of this.keys()) {
          if (dirname(entry) == path && entry != path)
            entries2[basename(entry)] = this.get(entry).ino;
        }
        dirs.set(path, entries2);
      }
      return dirs;
    }
    /**
     * Loads the index from JSON data
     */
    fromJSON(json) {
      if (json.version != version)
        throw withErrno("EINVAL", "Index version mismatch");
      this.clear();
      for (const [path, node] of Object.entries(json.entries)) {
        node.data ?? (node.data = randomInt(1, size_max));
        if (path == "/")
          node.ino = 0;
        this.set(path, new Inode(node));
      }
      return this;
    }
    /**
     * Parses an index from a string
     */
    static parse(data) {
      if (!isJSON(data))
        throw withErrno("EINVAL", "Invalid JSON");
      const json = JSON.parse(data);
      const index = new _Index();
      index.fromJSON(json);
      return index;
    }
  };
  _lastAlloc = new WeakMap();
  var Index = _Index;

  // node_modules/@zenfs/core/dist/internal/ioctl.js
  var FileFlag;
  (function(FileFlag2) {
    FileFlag2[FileFlag2["SecureRm"] = 1] = "SecureRm";
    FileFlag2[FileFlag2["Undelete"] = 2] = "Undelete";
    FileFlag2[FileFlag2["Compress"] = 4] = "Compress";
    FileFlag2[FileFlag2["Sync"] = 8] = "Sync";
    FileFlag2[FileFlag2["Immutable"] = 16] = "Immutable";
    FileFlag2[FileFlag2["Append"] = 32] = "Append";
    FileFlag2[FileFlag2["NoDump"] = 64] = "NoDump";
    FileFlag2[FileFlag2["NoAtime"] = 128] = "NoAtime";
    FileFlag2[FileFlag2["Dirty"] = 256] = "Dirty";
    FileFlag2[FileFlag2["CompressBlk"] = 512] = "CompressBlk";
    FileFlag2[FileFlag2["NoCompress"] = 1024] = "NoCompress";
    FileFlag2[FileFlag2["Encrypt"] = 2048] = "Encrypt";
    FileFlag2[FileFlag2["Btree"] = 4096] = "Btree";
    FileFlag2[FileFlag2["Index"] = 4096] = "Index";
    FileFlag2[FileFlag2["IMagic"] = 8192] = "IMagic";
    FileFlag2[FileFlag2["JournalData"] = 16384] = "JournalData";
    FileFlag2[FileFlag2["NoTail"] = 32768] = "NoTail";
    FileFlag2[FileFlag2["DirSync"] = 65536] = "DirSync";
    FileFlag2[FileFlag2["TopDir"] = 131072] = "TopDir";
    FileFlag2[FileFlag2["HugeFile"] = 262144] = "HugeFile";
    FileFlag2[FileFlag2["Extent"] = 524288] = "Extent";
    FileFlag2[FileFlag2["Verity"] = 1048576] = "Verity";
    FileFlag2[FileFlag2["EaInode"] = 2097152] = "EaInode";
    FileFlag2[FileFlag2["EofBlocks"] = 4194304] = "EofBlocks";
    FileFlag2[FileFlag2["NoCow"] = 8388608] = "NoCow";
    FileFlag2[FileFlag2["Dax"] = 33554432] = "Dax";
    FileFlag2[FileFlag2["InlineData"] = 268435456] = "InlineData";
    FileFlag2[FileFlag2["ProjInherit"] = 536870912] = "ProjInherit";
    FileFlag2[FileFlag2["CaseFold"] = 1073741824] = "CaseFold";
    FileFlag2[FileFlag2["Reserved"] = 2147483648] = "Reserved";
  })(FileFlag || (FileFlag = {}));
  var flagPairs = [
    [FileFlag.Sync, InodeFlags.Sync],
    [FileFlag.Immutable, InodeFlags.Immutable],
    [FileFlag.Append, InodeFlags.Append],
    [FileFlag.NoAtime, InodeFlags.NoAtime],
    [FileFlag.Encrypt, InodeFlags.Encrypted],
    [FileFlag.DirSync, InodeFlags.Dirsync],
    [FileFlag.Verity, InodeFlags.Verity],
    [FileFlag.Dax, InodeFlags.DAX],
    [FileFlag.CaseFold, InodeFlags.CaseFold]
  ];
  var supportedFlags = flagPairs.reduce((all, [flag]) => all | flag, 0);
  var settableFlags = flagPairs.reduce((all, [, flag]) => all | flag, 0);
  function toFileFlags(flags) {
    let value = 0;
    for (const [file, inode] of flagPairs)
      if (flags & inode)
        value |= file;
    return value;
  }
  function setFlags($, flags) {
    if (flags & ~supportedFlags)
      throw withErrno("ENOTSUP", "Unsupported file flags");
    let value = 0;
    for (const [file, inode] of flagPairs)
      if (flags & file)
        value |= inode;
    $.inode.flags = ($.inode.flags || 0) & ~settableFlags | value;
  }
  var IOC;
  (function(IOC2) {
    IOC2[IOC2["GetFlags"] = 2148034049] = "GetFlags";
    IOC2[IOC2["SetFlags"] = 1074292226] = "SetFlags";
    IOC2[IOC2["GetVersion"] = 2148038145] = "GetVersion";
    IOC2[IOC2["SetVersion"] = 1074296322] = "SetVersion";
    IOC2[IOC2["Fiemap"] = 3223348747] = "Fiemap";
    IOC2[IOC2["GetXattr"] = 2149341215] = "GetXattr";
    IOC2[IOC2["SetXattr"] = 1075599392] = "SetXattr";
    IOC2[IOC2["GetLabel"] = 2164298801] = "GetLabel";
    IOC2[IOC2["SetLabel"] = 1090556978] = "SetLabel";
    IOC2[IOC2["GetUUID"] = 2148603136] = "GetUUID";
    IOC2[IOC2["GetSysfsPath"] = 2155943169] = "GetSysfsPath";
  })(IOC || (IOC = {}));
  var IOC32;
  (function(IOC322) {
    IOC322[IOC322["GetFlags"] = 2147771905] = "GetFlags";
    IOC322[IOC322["SetFlags"] = 1074030082] = "SetFlags";
    IOC322[IOC322["GetVersion"] = 2147776001] = "GetVersion";
    IOC322[IOC322["SetVersion"] = 1074034178] = "SetVersion";
  })(IOC32 || (IOC32 = {}));
  var ioctl_default_ops = {
    [IOC.GetFlags]($) {
      if (typeof $.inode.flags !== "number")
        throw withErrno("ENOTTY");
      return toFileFlags($.inode.flags);
    },
    [IOC32.GetFlags]($) {
      if (typeof $.inode.flags !== "number")
        throw withErrno("ENOTTY");
      return toFileFlags($.inode.flags);
    },
    [IOC.GetVersion]($) {
      if (typeof $.inode.version !== "number")
        throw withErrno("ENOTTY");
      return $.inode.version;
    },
    [IOC32.GetVersion]($) {
      if (typeof $.inode.version !== "number")
        throw withErrno("ENOTTY");
      return $.inode.version;
    },
    [IOC.Fiemap]() {
      throw withErrno("ENOTSUP");
    },
    [IOC.GetXattr]() {
      throw withErrno("ENOTSUP");
    },
    [IOC.SetXattr]() {
      throw withErrno("ENOTSUP");
    },
    [IOC.GetLabel]($) {
      return $.fs.label;
    },
    [IOC.SetLabel]($, label) {
      $.fs.label = label;
    },
    [IOC.GetUUID]($) {
      return $.fs.uuid;
    },
    [IOC.GetSysfsPath]() {
      throw withErrno("ENOTSUP");
    }
  };
  var ioctl_default_ops_async = {
    ...ioctl_default_ops,
    async [IOC.SetFlags]($, flags) {
      setFlags($, flags);
      await $.fs.touch($.path, $.inode);
    },
    async [IOC32.SetFlags]($, flags) {
      setFlags($, flags);
      await $.fs.touch($.path, $.inode);
    },
    async [IOC.SetVersion]($, version2) {
      $.inode.version = version2;
      await $.fs.touch($.path, $.inode);
    },
    async [IOC32.SetVersion]($, version2) {
      $.inode.version = version2;
      await $.fs.touch($.path, $.inode);
    }
  };
  var ioctl_default_ops_sync = {
    ...ioctl_default_ops,
    [IOC.SetFlags]($, flags) {
      setFlags($, flags);
      $.fs.touchSync($.path, $.inode);
    },
    [IOC32.SetFlags]($, flags) {
      setFlags($, flags);
      $.fs.touchSync($.path, $.inode);
    },
    [IOC.SetVersion]($, version2) {
      $.inode.version = version2;
      $.fs.touchSync($.path, $.inode);
    },
    [IOC32.SetVersion]($, version2) {
      $.inode.version = version2;
      $.fs.touchSync($.path, $.inode);
    }
  };

  // node_modules/@zenfs/core/dist/internal/filesystem.js
  var defaultChunkSize = 65536;
  var FileSystem = class _FileSystem {
    constructor(type, name) {
      __publicField(this, "type");
      __publicField(this, "name");
      __publicField(this, "label");
      /**
       * The last place this file system was mounted
       * @internal @protected
       */
      __publicField(this, "_mountPoint");
      /**
       * The UUID of the file system.
       * @privateRemarks This is only used by `ioctl`
       * @internal @protected
       */
      __publicField(this, "_uuid", crypto.randomUUID());
      /**
       * @see FileSystemAttributes
       */
      __publicField(this, "attributes", /* @__PURE__ */ new Map());
      this.type = type;
      this.name = name;
      if (this.streamRead === _FileSystem.prototype.streamRead)
        this.attributes.set("default_stream_read");
      if (this.streamWrite === _FileSystem.prototype.streamWrite)
        this.attributes.set("default_stream_write");
    }
    get uuid() {
      return this._uuid;
    }
    toString() {
      return `${this.name} ${this.label ? JSON.stringify(this.label) : ""} (${this._mountPoint ? "mounted on " + this._mountPoint : "unmounted"})`;
    }
    /**
     * Default implementation.
     * @todo Implement
     * @experimental
     */
    usage() {
      return {
        totalSpace: 0,
        freeSpace: 0
      };
    }
    async ready() {
    }
    readySync() {
      if (this.ready !== _FileSystem.prototype.ready)
        throw withErrno("EAGAIN");
    }
    /**
     * Test whether or not `path` exists.
     */
    async exists(path) {
      try {
        await this.stat(path);
        return true;
      } catch (e) {
        return e.code != "ENOENT";
      }
    }
    /**
     * Test whether or not `path` exists.
     */
    existsSync(path) {
      try {
        this.statSync(path);
        return true;
      } catch (e) {
        return e.code != "ENOENT";
      }
    }
    /**
     * Read a file using a stream.
     * @privateRemarks The default implementation of `streamRead` uses "chunked" `read`s
     */
    streamRead(path, options) {
      const { chunkSize = defaultChunkSize } = options;
      let offset = options.start ?? 0;
      let end = options.end;
      return new ReadableStream({
        pull: async (controller) => {
          end ?? (end = (await this.stat(path)).size);
          if (offset >= end) {
            controller.close();
            return;
          }
          const buffer = new Uint8Array(Math.min(chunkSize, end - offset));
          await this.read(path, buffer, offset, offset + buffer.byteLength);
          offset += buffer.byteLength;
          controller.enqueue(buffer);
          if (offset >= end)
            controller.close();
        },
        type: "bytes"
      });
    }
    /**
     * Write a file using stream.
     * @privateRemarks The default implementation of `streamWrite` uses "chunked" `write`s
     */
    streamWrite(path, options) {
      let position = options.start ?? 0;
      return new WritableStream({
        write: async (chunk, controller) => {
          let err2 = false;
          const _err = (ex) => {
            err2 = true;
            controller.error(ex);
          };
          const { size } = await this.stat(path);
          await this.write(path, chunk, position).catch(_err);
          if (err2)
            return;
          position += chunk.byteLength;
          await this.touch(path, { mtimeMs: Date.now(), size: Math.max(size, position) }).catch(_err);
        }
      });
    }
    /** @internal */
    async ioctl(context, command, ...args) {
      const cmd = ioctl_default_ops_async[command];
      if (!cmd)
        throw withErrno("ENOTTY");
      return await cmd(context, ...args);
    }
    /** @internal */
    ioctlSync(context, command, ...args) {
      const cmd = ioctl_default_ops_sync[command];
      if (!cmd)
        throw withErrno("ENOTTY");
      return cmd(context, ...args);
    }
  };

  // node_modules/@zenfs/core/dist/vfs/dir.js
  var DirType;
  (function(DirType2) {
    DirType2[DirType2["UNKNOWN"] = 0] = "UNKNOWN";
    DirType2[DirType2["FIFO"] = 1] = "FIFO";
    DirType2[DirType2["CHR"] = 2] = "CHR";
    DirType2[DirType2["DIR"] = 4] = "DIR";
    DirType2[DirType2["BLK"] = 6] = "BLK";
    DirType2[DirType2["REG"] = 8] = "REG";
    DirType2[DirType2["LNK"] = 10] = "LNK";
    DirType2[DirType2["SOCK"] = 12] = "SOCK";
    DirType2[DirType2["WHT"] = 14] = "WHT";
  })(DirType || (DirType = {}));
  function ifToDt(mode) {
    return (mode & 61440) >> 12;
  }
  var Dirent = class {
    constructor() {
      __publicField(this, "ino");
      __publicField(this, "type");
      __publicField(this, "path");
      __publicField(this, "name");
    }
  };

  // node_modules/@zenfs/core/dist/polyfills.js
  Promise.withResolvers ?? (Promise.withResolvers = (warn("Using a polyfill of Promise.withResolvers"), function() {
    let _resolve, _reject;
    const promise = new Promise((resolve4, reject) => {
      _resolve = resolve4;
      _reject = reject;
    });
    return { promise, resolve: _resolve, reject: _reject };
  }));
  Symbol["dispose"] ?? (Symbol["dispose"] = (warn("Using a polyfill of Symbol.dispose"), Symbol("Symbol.dispose")));
  Symbol["asyncDispose"] ?? (Symbol["asyncDispose"] = (warn("Using a polyfill of Symbol.asyncDispose"), Symbol("Symbol.asyncDispose")));
  var _a2;
  (_a2 = globalThis.crypto).randomUUID ?? (_a2.randomUUID = (warn("Using a polyfill of crypto.randomUUID"), function randomUUID() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex3 = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex3.slice(0, 8)}-${hex3.slice(8, 12)}-${hex3.slice(12, 16)}-${hex3.slice(16, 20)}-${hex3.slice(20)}`;
  }));
  var _a3;
  (_a3 = Uint8Array.prototype).toBase64 ?? (_a3.toBase64 = (warn("Using a polyfill of Uint8Array.prototype.toBase64"), function toBase64() {
    return btoa(String.fromCharCode(...this));
  }));
  Uint8Array.fromBase64 ?? (Uint8Array.fromBase64 = (warn("Using a polyfill of Uint8Array.fromBase64"), function fromBase64(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }));
  var _a4;
  (_a4 = Uint8Array.prototype).toHex ?? (_a4.toHex = (warn("Using a polyfill of Uint8Array.prototype.toHex"), function toHex() {
    return Array.from(this).map((b) => b.toString(16).padStart(2, "0")).join("");
  }));
  Uint8Array.fromHex ?? (Uint8Array.fromHex = (warn("Using a polyfill of Uint8Array.fromHex"), function fromHex(hex3) {
    const bytes = new Uint8Array(hex3.length / 2);
    for (let i = 0; i < hex3.length; i += 2) {
      bytes[i / 2] = parseInt(hex3.slice(i, i + 2), 16);
    }
    return bytes;
  }));
  Array.fromAsync ?? (Array.fromAsync = (warn("Using a polyfill of Array.fromAsync"), async function collectAsyncIterator(it) {
    const results = [];
    for await (const result of it) {
      results.push(result);
    }
    return results;
  }));
  var _a5;
  (_a5 = Map.prototype).getOrInsert ?? (_a5.getOrInsert = (warn("Using a polyfill of Map.prototype.getOrInsert"), function getOrInsert(key, defaultValue) {
    if (!this.has(key))
      this.set(key, defaultValue);
    return this.get(key);
  }));
  var _a6;
  (_a6 = Map.prototype).getOrInsertComputed ?? (_a6.getOrInsertComputed = (warn("Using a polyfill of Map.prototype.getOrInsertComputed"), function getOrInsertComputed(key, callback) {
    if (this.has(key))
      return this.get(key);
    const value = callback(key);
    this.set(key, value);
    return value;
  }));

  // node_modules/@zenfs/core/dist/backends/store/store.js
  var Transaction = class {
    constructor(store) {
      __publicField(this, "store");
      this.store = store;
    }
  };
  var SyncTransaction = class extends Transaction {
    /* eslint-disable @typescript-eslint/require-await */
    async get(id, offset, end) {
      return this.getSync(id, offset, end);
    }
    async set(id, data, offset) {
      return this.setSync(id, data, offset);
    }
    async remove(id) {
      return this.removeSync(id);
    }
    async commit() {
      return this.commitSync?.();
    }
    async abort() {
      return this.abortSync?.();
    }
  };
  var AsyncTransaction = class extends Transaction {
    constructor() {
      super(...arguments);
      __publicField(this, "asyncDone", Promise.resolve());
    }
    /**
     * Run a asynchronous operation from a sync context. Not magic and subject to (race) conditions.
     * @internal
     */
    async(promise) {
      this.asyncDone = this.asyncDone.then(() => promise);
    }
    /**
     * Gets a cache resource
     * If `info` is set and the resource doesn't exist, it will be created
     * @internal
     */
    _cached(id, info2) {
      var _a12;
      (_a12 = this.store).cache ?? (_a12.cache = /* @__PURE__ */ new Map());
      const resource = this.store.cache.get(id);
      if (!resource)
        return !info2 ? void 0 : new Resource(id, info2.size, {}, this.store.cache);
      if (info2)
        resource.size = info2.size;
      return resource;
    }
    getSync(id, offset, end) {
      const resource = this._cached(id);
      if (!resource)
        return;
      end ?? (end = resource.size);
      const missing = resource.missing(offset, end);
      for (const { start, end: end2 } of missing) {
        this.async(this.get(id, start, end2));
      }
      if (missing.length)
        throw withErrno("EAGAIN");
      const region = resource.regionAt(offset);
      if (!region) {
        warn("Missing cache region for " + id);
        return;
      }
      return region.data.subarray(offset - region.offset, end - region.offset);
    }
    setSync(id, data, offset) {
      this.async(this.set(id, data, offset));
    }
    removeSync(id) {
      this.async(this.remove(id));
      this.store.cache?.delete(id);
    }
  };
  var WrappedTransaction = class {
    constructor(raw, fs) {
      __publicField(this, "raw");
      __publicField(this, "fs");
      /**
       * Whether the transaction was committed or aborted
       */
      __publicField(this, "done", false);
      /** Whether the store rolls back changes itself */
      __publicField(this, "atomic");
      /**
       * Stores data in the keys we modify prior to modifying them.
       * Allows us to roll back commits.
       */
      __publicField(this, "originalData", /* @__PURE__ */ new Map());
      /**
       * List of keys modified in this transaction, if any.
       */
      __publicField(this, "modifiedKeys", /* @__PURE__ */ new Set());
      this.raw = raw;
      this.fs = fs;
      this.atomic = this.flag("atomic");
    }
    flag(flag) {
      return this.raw.store.flags?.includes(flag) ?? false;
    }
    keys() {
      return this.raw.keys();
    }
    async get(id, offset = 0, end) {
      const data = await this.raw.get(id, offset, end);
      this.stash(id);
      return data;
    }
    getSync(id, offset = 0, end) {
      const data = this.raw.getSync(id, offset, end);
      this.stash(id);
      return data;
    }
    async set(id, view2, offset) {
      await this.markModified(id, offset, view2.byteLength);
      const buffer = view2 instanceof Uint8Array ? view2 : new Uint8Array(view2.buffer, view2.byteOffset, view2.byteLength);
      await this.raw.set(id, buffer, offset);
    }
    setSync(id, view2, offset) {
      this.markModifiedSync(id, offset, view2.byteLength);
      const buffer = view2 instanceof Uint8Array ? view2 : new Uint8Array(view2.buffer, view2.byteOffset, view2.byteLength);
      this.raw.setSync(id, buffer, offset);
    }
    async remove(id) {
      await this.markModified(id);
      await this.raw.remove(id);
    }
    removeSync(id) {
      this.markModifiedSync(id);
      this.raw.removeSync(id);
    }
    async commit() {
      if (this.atomic)
        await this.raw.commit();
      this.done = true;
    }
    commitSync() {
      if (this.atomic)
        this.raw.commitSync();
      this.done = true;
    }
    async abort() {
      if (this.done)
        return;
      if (this.atomic)
        await this.raw.abort();
      for (const [id, entries2] of this.originalData) {
        if (!this.modifiedKeys.has(id))
          continue;
        if (entries2.some((ent) => !ent.data)) {
          await this.raw.remove(id);
          this.fs._remove(id);
          continue;
        }
        for (const entry of entries2.reverse()) {
          await this.raw.set(id, entry.data, entry.offset);
        }
      }
      this.done = true;
    }
    abortSync() {
      if (this.done)
        return;
      if (this.atomic)
        this.raw.abortSync();
      for (const [id, entries2] of this.originalData) {
        if (!this.modifiedKeys.has(id))
          continue;
        if (entries2.some((ent) => !ent.data)) {
          this.raw.removeSync(id);
          this.fs._remove(id);
          continue;
        }
        for (const entry of entries2.reverse()) {
          this.raw.setSync(id, entry.data, entry.offset);
        }
      }
      this.done = true;
    }
    async [Symbol.asyncDispose]() {
      if (this.done)
        return;
      await this.abort();
    }
    [Symbol.dispose]() {
      if (this.done)
        return;
      this.abortSync();
    }
    /**
     * Stashes given key value pair into `originalData` if it doesn't already exist.
     * Allows us to stash values the program is requesting anyway to
     * prevent needless `get` requests if the program modifies the data later
     * on during the transaction.
     */
    stash(id, data, offset) {
      if (this.atomic)
        return;
      this.originalData.getOrInsertComputed(id, () => []).push({ data, offset });
    }
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    async markModified(id, offset, length) {
      if (this.atomic)
        return;
      this.modifiedKeys.add(id);
      const end = offset !== void 0 && length ? offset + length : void 0;
      try {
        this.stash(id, await this.raw.get(id, offset ?? 0, end), offset);
      } catch (e) {
        if (!(this.raw instanceof AsyncTransaction))
          throw e;
        const tx = this.raw;
        const resource = tx._cached(id);
        if (!resource)
          throw e;
        for (const range of resource.cached(offset ?? 0, end ?? offset ?? 0)) {
          this.stash(id, await this.raw.get(id, range.start, range.end), range.start);
        }
      }
    }
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    markModifiedSync(id, offset, length) {
      if (this.atomic)
        return;
      this.modifiedKeys.add(id);
      const end = offset !== void 0 && length ? offset + length : void 0;
      try {
        this.stash(id, this.raw.getSync(id, offset ?? 0, end), offset);
      } catch (e) {
        if (!(this.raw instanceof AsyncTransaction))
          throw e;
        const tx = this.raw;
        const resource = tx._cached(id);
        if (!resource)
          throw e;
        for (const range of resource.cached(offset ?? 0, end ?? offset ?? 0)) {
          this.stash(id, this.raw.getSync(id, range.start, range.end), range.start);
        }
      }
    }
  };

  // node_modules/@zenfs/core/dist/backends/store/fs.js
  var __runInitializers3 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var __esDecorate3 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var __addDisposableResource = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  var DirEntry = struct2.packed("DirEntry", {
    id: types3.uint64,
    type: types3.uint8.$type(),
    name_length: types3.uint16,
    name: types3.uint8(0).countedBy("name_length")
  }, { isDynamic: true, fastFields: true });
  var nameLengthOffset = DirEntry.fields.find((field2) => field2.name == "name_length").offset;
  function encodeName(name) {
    const encoded = encodeUTF8(name);
    if (encoded.length > 65535)
      throw withErrno("ENAMETOOLONG");
    return encoded;
  }
  function writeEntry(buffer, offset, name, id, type) {
    const entry = new DirEntry(buffer, offset);
    entry.id = BigInt(id);
    entry.type = type;
    entry.name_length = name.length;
    new Uint8Array(buffer, offset + sizeof(DirEntry), name.length).set(name);
    return sizeof(DirEntry) + name.length;
  }
  var dirListingMagic = 209;
  var legacyListingMagic = 123;
  var DirListing = class _DirListing extends struct2.packed("DirListing", { magic: types3.uint8, entry_count: types3.uint32 }, { fastFields: true }) {
    /**
     * Yields the offset and name length of each entry.
     * This reads the bytes directly, since struct field access costs too much per entry.
     */
    *scan() {
      const bytes = new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
      let offset = sizeof(_DirListing);
      for (let i = 0; i < this.entry_count; i++) {
        const nameLength = bytes[offset + nameLengthOffset] | bytes[offset + nameLengthOffset + 1] << 8;
        yield [offset, nameLength];
        offset += sizeof(DirEntry) + nameLength;
      }
    }
    nameAt(offset, nameLength) {
      return new Uint8Array(this.buffer, this.byteOffset + offset + sizeof(DirEntry), nameLength);
    }
    get size() {
      return this.entry_count;
    }
    *entries() {
      for (const [offset, nameLength] of this.scan()) {
        yield [decodeUTF8(this.nameAt(offset, nameLength)), new DirEntry(this.buffer, this.byteOffset + offset)];
      }
    }
    *keys() {
      for (const [offset, nameLength] of this.scan())
        yield decodeUTF8(this.nameAt(offset, nameLength));
    }
    *values() {
      for (const [offset] of this.scan())
        yield new DirEntry(this.buffer, this.byteOffset + offset);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
    forEach(callback, thisArg) {
      for (const [name, entry] of this)
        callback.call(thisArg, entry, name, this);
    }
    get(name) {
      const encoded = encodeUTF8(name);
      for (const [offset, nameLength] of this.scan()) {
        if (nameLength != encoded.length)
          continue;
        const entryName = this.nameAt(offset, nameLength);
        if (entryName.every((byte, i) => byte == encoded[i]))
          return new DirEntry(this.buffer, this.byteOffset + offset);
      }
    }
    has(name) {
      return !!this.get(name);
    }
    /** Returns a listing with `name` added, replacing any existing entry with that name */
    with(name, id, type) {
      const base = this.without(name);
      const encoded = encodeName(name);
      const data = new Uint8Array(base.byteLength + sizeof(DirEntry) + encoded.length);
      data.set(new Uint8Array(base.buffer, base.byteOffset, base.byteLength));
      const listing = new _DirListing(data.buffer);
      listing.entry_count++;
      writeEntry(data.buffer, base.byteLength, encoded, id, type);
      return listing;
    }
    /** Returns a listing without the entry for `name` */
    without(name) {
      const entry = this.get(name);
      if (!entry)
        return this;
      const start = entry.byteOffset - this.byteOffset;
      const size = sizeof(DirEntry) + entry.name_length;
      const source = new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
      const data = new Uint8Array(this.byteLength - size);
      data.set(source.subarray(0, start));
      data.set(source.subarray(start + size), start);
      const listing = new _DirListing(data.buffer);
      listing.entry_count--;
      return listing;
    }
    /** Creates a listing from entries with unique names */
    static from(entries2) {
      const encoded = Array.from(entries2, (entry) => ({ ...entry, name: encodeName(entry.name) }));
      let size = sizeof(_DirListing);
      for (const { name } of encoded)
        size += sizeof(DirEntry) + name.length;
      const listing = new _DirListing(new ArrayBuffer(size));
      listing.magic = dirListingMagic;
      listing.entry_count = encoded.length;
      let offset = sizeof(_DirListing);
      for (const { name, id, type } of encoded)
        offset += writeEntry(listing.buffer, offset, name, id, type);
      return listing;
    }
    /**
     * Reads a listing from store data, including JSON listings written by older versions.
     * Entries of JSON listings have an unknown type.
     */
    static decode(data) {
      if (data[0] == dirListingMagic)
        return new _DirListing(data.buffer, data.byteOffset, data.byteLength);
      if (data[0] != legacyListingMagic)
        throw crit(withErrno("EIO", "Invalid directory listing"));
      const legacy = JSON.parse(decodeUTF8(data));
      return _DirListing.from(Object.entries(legacy).map(([name, id]) => ({ name, id: BigInt(id), type: DirType.UNKNOWN })));
    }
    /** Whether `data` is a listing in the JSON format written by older versions */
    static isLegacy(data) {
      return data[0] == legacyListingMagic;
    }
    /** Creates the listing for the directory at `path` from `Index.directories` entries */
    static fromIndex(index, path, entries2) {
      return _DirListing.from(Object.entries(entries2).map(([name, id]) => ({ name, id, type: ifToDt(index.get(join(path, name)).mode) })));
    }
  };
  var maxAttempts = 100;
  function retry(method, _) {
    return function(...args) {
      const conflict = (e, attempt) => attempt < maxAttempts && e.code == "EAGAIN" && !!this["store"].flags?.includes("atomic");
      const run = (attempt) => {
        let result;
        try {
          result = method.apply(this, args);
        } catch (e) {
          if (conflict(e, attempt))
            return run(attempt + 1);
          throw e;
        }
        if (!(result instanceof Promise))
          return result;
        return result.catch((e) => {
          if (conflict(e, attempt))
            return run(attempt + 1);
          throw e;
        });
      };
      return run(1);
    };
  }
  var StoreFS = (() => {
    var _a12;
    let _classSuper = FileSystem;
    let _instanceExtraInitializers = [];
    let _rename_decorators;
    let _renameSync_decorators;
    let _touch_decorators;
    let _touchSync_decorators;
    let _link_decorators;
    let _linkSync_decorators;
    let _write_decorators;
    let _writeSync_decorators;
    let _checkRoot_decorators;
    let _checkRootSync_decorators;
    let _commitNew_decorators;
    let _commitNewSync_decorators;
    let _remove_decorators;
    let _removeSync_decorators;
    return _a12 = class extends _classSuper {
      constructor(store) {
        super(store.type ?? 1802921587, store.name);
        __publicField(this, "store", __runInitializers3(this, _instanceExtraInitializers));
        /**
         * A map of paths to inode IDs
         * @internal @hidden
         */
        __publicField(this, "_ids", /* @__PURE__ */ new Map([["/", 0]]));
        /**
         * A map of inode IDs to paths
         * @internal @hidden
         */
        __publicField(this, "_paths", /* @__PURE__ */ new Map([[0, new Set("/")]]));
        __publicField(this, "_initialized", false);
        __publicField(this, "_lastID");
        this.store = store;
        store.fs = this;
        this._uuid = store.uuid ?? this.uuid;
        this.label = store.label;
        debug(this.name + ": supports features: " + this.store.flags?.join(", "));
      }
      /**
       * Gets the first path associated with an inode
       */
      _path(id) {
        const [path] = this._paths.get(id) ?? [];
        return path;
      }
      /**
       * Add a inode/path pair
       */
      _add(ino, path) {
        this._paths.getOrInsertComputed(ino, () => /* @__PURE__ */ new Set()).add(path);
        this._ids.set(path, ino);
      }
      /**
       * Remove a inode/path pair
       */
      _remove(ino) {
        for (const path of this._paths.get(ino) ?? []) {
          this._ids.delete(path);
        }
        this._paths.delete(ino);
      }
      /**
       * Move paths in the tables
       */
      _move(from3, to) {
        const toMove = [];
        for (const [path, ino] of this._ids) {
          const rel = relative(from3, path);
          if (rel.startsWith(".."))
            continue;
          let newKey = join(to, rel);
          if (newKey.endsWith("/"))
            newKey = newKey.slice(0, -1);
          toMove.push({ oldKey: path, newKey, ino });
        }
        for (const { oldKey, newKey, ino } of toMove) {
          this._ids.delete(oldKey);
          this._ids.set(newKey, ino);
          const p = this._paths.get(ino);
          if (!p) {
            warn("Missing paths in table for ino " + ino);
            continue;
          }
          p.delete(oldKey);
          p.add(newKey);
        }
      }
      async ready() {
        if (this._initialized)
          return;
        if (!this.attributes.has("no_async_preload")) {
          this.checkRootSync();
        }
        await this.checkRoot();
        await this._populate();
        this._initialized = true;
      }
      readySync() {
        if (this._initialized)
          return;
        if (!this.attributes.has("no_async_preload")) {
          this.checkRootSync();
        }
        this.checkRootSync();
        this._populateSync();
        this._initialized = true;
      }
      usage() {
        return this.store.usage?.() || {
          totalSpace: 0,
          freeSpace: 0
        };
      }
      /**
       * Load an index into the StoreFS.
       * You *must* manually add non-directory files
       */
      async loadIndex(index) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_1, this.transaction(), true);
          const dirs = index.directories();
          for (const [path, inode] of index) {
            this._add(inode.ino, path);
            await tx.set(inode.ino, inode);
            if (dirs.has(path))
              await tx.set(inode.data, DirListing.fromIndex(index, path, dirs.get(path)));
          }
          await tx.commit();
        } catch (e_1) {
          env_1.error = e_1;
          env_1.hasError = true;
        } finally {
          const result_1 = __disposeResources(env_1);
          if (result_1)
            await result_1;
        }
      }
      /**
       * Load an index into the StoreFS.
       * You *must* manually add non-directory files
       */
      loadIndexSync(index) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_2, this.transaction(), false);
          const dirs = index.directories();
          for (const [path, inode] of index) {
            this._add(inode.ino, path);
            tx.setSync(inode.ino, inode);
            if (dirs.has(path))
              tx.setSync(inode.data, DirListing.fromIndex(index, path, dirs.get(path)));
          }
          tx.commitSync();
        } catch (e_2) {
          env_2.error = e_2;
          env_2.hasError = true;
        } finally {
          __disposeResources(env_2);
        }
      }
      async createIndex() {
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
          const index = new Index();
          const tx = __addDisposableResource(env_3, this.transaction(), true);
          const queue = [["/", 0]];
          const silence = canary(withErrno("EDEADLK"));
          while (queue.length) {
            const [path, ino] = queue.shift();
            const inode = new Inode(await tx.get(ino));
            index.set(path, inode);
            if (isDirectory(inode)) {
              const dir = DirListing.decode(await tx.get(inode.data) ?? _throw(withErrno("ENODATA")));
              for (const [name, entry] of dir) {
                queue.push([join(path, name), Number(entry.id)]);
              }
            }
          }
          silence();
          return index;
        } catch (e_3) {
          env_3.error = e_3;
          env_3.hasError = true;
        } finally {
          const result_2 = __disposeResources(env_3);
          if (result_2)
            await result_2;
        }
      }
      createIndexSync() {
        const env_4 = { stack: [], error: void 0, hasError: false };
        try {
          const index = new Index();
          const tx = __addDisposableResource(env_4, this.transaction(), false);
          const queue = [["/", 0]];
          const silence = canary(withErrno("EDEADLK"));
          while (queue.length) {
            const [path, ino] = queue.shift();
            const inode = new Inode(tx.getSync(ino));
            index.set(path, inode);
            if (isDirectory(inode)) {
              const dir = DirListing.decode(tx.getSync(inode.data) ?? _throw(withErrno("ENODATA")));
              for (const [name, entry] of dir) {
                queue.push([join(path, name), Number(entry.id)]);
              }
            }
          }
          silence();
          return index;
        } catch (e_4) {
          env_4.error = e_4;
          env_4.hasError = true;
        } finally {
          __disposeResources(env_4);
        }
      }
      /**
       * @todo Make rename compatible with the cache.
       */
      async rename(oldPath, newPath) {
        const env_5 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_5, this.transaction(), true);
          const _old = parse(oldPath), _new = parse(newPath), oldDirNode = await this.findInode(tx, _old.dir), oldListing = DirListing.decode(await tx.get(oldDirNode.data) ?? _throw(withErrno("ENODATA"))), entry = oldListing.get(_old.base);
          if (!entry)
            throw withErrno("ENOENT");
          const ino = Number(entry.id), type = entry.type;
          if (ino != this._ids.get(oldPath))
            err(`Ino mismatch while renaming ${oldPath} to ${newPath}`);
          const oldDirList = oldListing.without(_old.base);
          if ((_new.dir + "/").startsWith(oldPath + "/"))
            throw withErrno("EBUSY");
          const sameParent = _new.dir == _old.dir;
          const newDirNode = sameParent ? oldDirNode : await this.findInode(tx, _new.dir);
          const newDirList = sameParent ? oldDirList : DirListing.decode(await tx.get(newDirNode.data) ?? _throw(withErrno("ENODATA")));
          const existingEntry = newDirList.get(_new.base);
          const existingIno = existingEntry && Number(existingEntry.id);
          const updated = newDirList.with(_new.base, ino, type);
          if (existingIno !== void 0) {
            const existing = new Inode(await tx.get(existingIno) ?? _throw(withErrno("ENOENT")));
            if (!isFile(existing))
              throw withErrno("EISDIR");
            await tx.remove(existing.data);
            await tx.remove(existingIno);
          }
          if (!sameParent)
            await tx.set(oldDirNode.data, oldDirList);
          await tx.set(newDirNode.data, updated);
          await tx.commit();
          this._move(oldPath, newPath);
        } catch (e_5) {
          env_5.error = e_5;
          env_5.hasError = true;
        } finally {
          const result_3 = __disposeResources(env_5);
          if (result_3)
            await result_3;
        }
      }
      renameSync(oldPath, newPath) {
        const env_6 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_6, this.transaction(), false);
          const _old = parse(oldPath), _new = parse(newPath), oldDirNode = this.findInodeSync(tx, _old.dir), oldListing = DirListing.decode(tx.getSync(oldDirNode.data) ?? _throw(withErrno("ENODATA"))), entry = oldListing.get(_old.base);
          if (!entry)
            throw withErrno("ENOENT");
          const ino = Number(entry.id), type = entry.type;
          if (ino != this._ids.get(oldPath))
            err(`Ino mismatch while renaming ${oldPath} to ${newPath}`);
          const oldDirList = oldListing.without(_old.base);
          if ((_new.dir + "/").startsWith(oldPath + "/"))
            throw withErrno("EBUSY");
          const sameParent = _new.dir === _old.dir;
          const newDirNode = sameParent ? oldDirNode : this.findInodeSync(tx, _new.dir);
          const newDirList = sameParent ? oldDirList : DirListing.decode(tx.getSync(newDirNode.data) ?? _throw(withErrno("ENODATA")));
          const existingEntry = newDirList.get(_new.base);
          const existingIno = existingEntry && Number(existingEntry.id);
          const updated = newDirList.with(_new.base, ino, type);
          if (existingIno !== void 0) {
            const existing = new Inode(tx.getSync(existingIno) ?? _throw(withErrno("ENOENT")));
            if (!isFile(existing))
              throw withErrno("EISDIR");
            tx.removeSync(existing.data);
            tx.removeSync(existingIno);
          }
          if (!sameParent)
            tx.setSync(oldDirNode.data, oldDirList);
          tx.setSync(newDirNode.data, updated);
          tx.commitSync();
          this._move(oldPath, newPath);
        } catch (e_6) {
          env_6.error = e_6;
          env_6.hasError = true;
        } finally {
          __disposeResources(env_6);
        }
      }
      async stat(path) {
        const env_7 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_7, this.transaction(), true);
          return await this.findInode(tx, path);
        } catch (e_7) {
          env_7.error = e_7;
          env_7.hasError = true;
        } finally {
          const result_4 = __disposeResources(env_7);
          if (result_4)
            await result_4;
        }
      }
      statSync(path) {
        const env_8 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_8, this.transaction(), false);
          return this.findInodeSync(tx, path);
        } catch (e_8) {
          env_8.error = e_8;
          env_8.hasError = true;
        } finally {
          __disposeResources(env_8);
        }
      }
      async touch(path, metadata) {
        const env_9 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_9, this.transaction(), true);
          const inode = await this.findInode(tx, path);
          if (!isDirectory(inode) && metadata.size !== void 0 && metadata.size !== inode.size) {
            const data = await tx.get(inode.data) ?? new Uint8Array();
            if (metadata.size < data.byteLength)
              data.fill(0, metadata.size);
            await tx.set(inode.data, metadata.size < data.byteLength ? data.subarray(0, metadata.size) : extendBuffer(data, metadata.size));
          }
          if (inode.update(metadata)) {
            this._add(inode.ino, path);
            tx.setSync(inode.ino, inode);
          }
          await tx.commit();
        } catch (e_9) {
          env_9.error = e_9;
          env_9.hasError = true;
        } finally {
          const result_5 = __disposeResources(env_9);
          if (result_5)
            await result_5;
        }
      }
      touchSync(path, metadata) {
        const env_10 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_10, this.transaction(), false);
          const inode = this.findInodeSync(tx, path);
          if (!isDirectory(inode) && metadata.size !== void 0 && metadata.size !== inode.size) {
            const data = tx.getSync(inode.data) ?? new Uint8Array();
            if (metadata.size < data.byteLength)
              data.fill(0, metadata.size);
            tx.setSync(inode.data, metadata.size < data.byteLength ? data.subarray(0, metadata.size) : extendBuffer(data, metadata.size));
          }
          if (inode.update(metadata)) {
            this._add(inode.ino, path);
            tx.setSync(inode.ino, inode);
          }
          tx.commitSync();
        } catch (e_10) {
          env_10.error = e_10;
          env_10.hasError = true;
        } finally {
          __disposeResources(env_10);
        }
      }
      async createFile(path, options) {
        return await this.commitNew(path, { ...options, mode: options.mode | S_IFREG }, new Uint8Array());
      }
      createFileSync(path, options) {
        return this.commitNewSync(path, { ...options, mode: options.mode | S_IFREG }, new Uint8Array());
      }
      async unlink(path) {
        return this.remove(path, false);
      }
      unlinkSync(path) {
        this.removeSync(path, false);
      }
      async rmdir(path) {
        await this.remove(path, true);
      }
      rmdirSync(path) {
        this.removeSync(path, true);
      }
      async mkdir(path, options) {
        return await this.commitNew(path, { ...options, mode: options.mode | S_IFDIR }, DirListing.from([]));
      }
      mkdirSync(path, options) {
        return this.commitNewSync(path, { ...options, mode: options.mode | S_IFDIR }, DirListing.from([]));
      }
      async readdir(path) {
        const env_11 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_11, this.transaction(), true);
          const node = await this.findInode(tx, path);
          return Array.from(DirListing.decode(await tx.get(node.data) ?? _throw(withErrno("ENOENT"))).keys());
        } catch (e_11) {
          env_11.error = e_11;
          env_11.hasError = true;
        } finally {
          const result_6 = __disposeResources(env_11);
          if (result_6)
            await result_6;
        }
      }
      readdirSync(path) {
        const env_12 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_12, this.transaction(), false);
          const node = this.findInodeSync(tx, path);
          return Array.from(DirListing.decode(tx.getSync(node.data) ?? _throw(withErrno("ENOENT"))).keys());
        } catch (e_12) {
          env_12.error = e_12;
          env_12.hasError = true;
        } finally {
          __disposeResources(env_12);
        }
      }
      async sync() {
      }
      syncSync() {
      }
      async link(target, link5) {
        const env_13 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_13, this.transaction(), true);
          const newDir = dirname(link5), newDirNode = await this.findInode(tx, newDir), listing = DirListing.decode(await tx.get(newDirNode.data) ?? _throw(withErrno("ENOENT")));
          const inode = await this.findInode(tx, target);
          inode.nlink++;
          this._add(inode.ino, link5);
          await tx.set(inode.ino, inode);
          await tx.set(newDirNode.data, listing.with(basename(link5), inode.ino, ifToDt(inode.mode)));
          await tx.commit();
        } catch (e_13) {
          env_13.error = e_13;
          env_13.hasError = true;
        } finally {
          const result_7 = __disposeResources(env_13);
          if (result_7)
            await result_7;
        }
      }
      linkSync(target, link5) {
        const env_14 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_14, this.transaction(), false);
          const newDir = dirname(link5), newDirNode = this.findInodeSync(tx, newDir), listing = DirListing.decode(tx.getSync(newDirNode.data) ?? _throw(withErrno("ENOENT")));
          const inode = this.findInodeSync(tx, target);
          inode.nlink++;
          this._add(inode.ino, link5);
          tx.setSync(inode.ino, inode);
          tx.setSync(newDirNode.data, listing.with(basename(link5), inode.ino, ifToDt(inode.mode)));
          tx.commitSync();
        } catch (e_14) {
          env_14.error = e_14;
          env_14.hasError = true;
        } finally {
          __disposeResources(env_14);
        }
      }
      async read(path, buffer, offset, end) {
        const env_15 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_15, this.transaction(), true);
          const inode = await this.findInode(tx, path);
          if (inode.size == 0)
            return;
          const data = await tx.get(inode.data, offset, end) ?? _throw(withErrno("ENODATA"));
          const _ = tx.flag("partial") ? data : data.subarray(offset, end);
          if (_.byteLength > buffer.byteLength)
            err(`Trying to place ${_.byteLength} bytes into a ${buffer.byteLength} byte buffer on read`);
          buffer.set(_);
        } catch (e_15) {
          env_15.error = e_15;
          env_15.hasError = true;
        } finally {
          const result_8 = __disposeResources(env_15);
          if (result_8)
            await result_8;
        }
      }
      readSync(path, buffer, offset, end) {
        const env_16 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_16, this.transaction(), false);
          const inode = this.findInodeSync(tx, path);
          if (inode.size == 0)
            return;
          const data = tx.getSync(inode.data, offset, end) ?? _throw(withErrno("ENODATA"));
          const _ = tx.flag("partial") ? data : data.subarray(offset, end);
          if (_.byteLength > buffer.byteLength)
            err(`Trying to place ${_.byteLength} bytes into a ${buffer.byteLength} byte buffer on read`);
          buffer.set(_);
        } catch (e_16) {
          env_16.error = e_16;
          env_16.hasError = true;
        } finally {
          __disposeResources(env_16);
        }
      }
      async write(path, data, offset) {
        const env_17 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_17, this.transaction(), true);
          const inode = await this.findInode(tx, path);
          const end = offset + data.byteLength;
          if (!tx.flag("partial")) {
            const buffer = extendBuffer(await tx.get(inode.data) ?? new Uint8Array(), end);
            buffer.set(data, offset);
            await tx.set(inode.data, buffer);
          } else if (offset <= inode.size) {
            await tx.set(inode.data, data, offset);
          } else {
            const extended = new Uint8Array(end - inode.size);
            extended.set(data, offset - inode.size);
            await tx.set(inode.data, extended, inode.size);
          }
          inode.update({ size: Math.max(inode.size, end), mtimeMs: Date.now() });
          await tx.set(inode.ino, inode);
          this._add(inode.ino, path);
          await tx.commit();
        } catch (e_17) {
          env_17.error = e_17;
          env_17.hasError = true;
        } finally {
          const result_9 = __disposeResources(env_17);
          if (result_9)
            await result_9;
        }
      }
      writeSync(path, data, offset) {
        const env_18 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_18, this.transaction(), false);
          const inode = this.findInodeSync(tx, path);
          const end = offset + data.byteLength;
          if (!tx.flag("partial")) {
            const buffer = extendBuffer(tx.getSync(inode.data) ?? new Uint8Array(), end);
            buffer.set(data, offset);
            tx.setSync(inode.data, buffer);
          } else if (offset <= inode.size) {
            tx.setSync(inode.data, data, offset);
          } else {
            const extended = new Uint8Array(end - inode.size);
            extended.set(data, offset - inode.size);
            tx.setSync(inode.data, extended, inode.size);
          }
          inode.update({ size: Math.max(inode.size, end), mtimeMs: Date.now() });
          tx.setSync(inode.ino, inode);
          this._add(inode.ino, path);
          tx.commitSync();
        } catch (e_18) {
          env_18.error = e_18;
          env_18.hasError = true;
        } finally {
          __disposeResources(env_18);
        }
      }
      /**
       * Wraps a transaction
       * @internal @hidden
       */
      transaction() {
        return new WrappedTransaction(this.store.transaction(), this);
      }
      /**
       * Checks if the root directory exists. Creates it if it doesn't.
       */
      async checkRoot() {
        const env_19 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_19, this.transaction(), true);
          if (await tx.get(rootIno))
            return;
          const inode = new Inode({ ino: rootIno, data: 1, mode: 511 | S_IFDIR });
          await tx.set(inode.data, DirListing.from([]));
          this._add(rootIno, "/");
          await tx.set(rootIno, inode);
          await tx.commit();
        } catch (e_19) {
          env_19.error = e_19;
          env_19.hasError = true;
        } finally {
          const result_10 = __disposeResources(env_19);
          if (result_10)
            await result_10;
        }
      }
      /**
       * Checks if the root directory exists. Creates it if it doesn't.
       */
      checkRootSync() {
        const env_20 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_20, this.transaction(), false);
          if (tx.getSync(rootIno))
            return;
          const inode = new Inode({ ino: rootIno, data: 1, mode: 511 | S_IFDIR });
          tx.setSync(inode.data, DirListing.from([]));
          this._add(rootIno, "/");
          tx.setSync(rootIno, inode);
          tx.commitSync();
        } catch (e_20) {
          env_20.error = e_20;
          env_20.hasError = true;
        } finally {
          __disposeResources(env_20);
        }
      }
      /**
       * Populates the `_ids` and `_paths` maps with all existing files stored in the underlying `Store`.
       */
      async _populate() {
        const env_21 = { stack: [], error: void 0, hasError: false };
        try {
          if (this._initialized) {
            warn("Attempted to populate tables after initialization");
            return;
          }
          debug("Populating tables with existing store metadata");
          const tx = __addDisposableResource(env_21, this.transaction(), true);
          const rootData = await tx.get(rootIno);
          if (!rootData) {
            notice("Store does not have a root inode");
            const inode = new Inode({ ino: rootIno, data: 1, mode: 511 | S_IFDIR });
            await tx.set(inode.data, DirListing.from([]));
            this._add(rootIno, "/");
            await tx.set(rootIno, inode);
            await tx.commit();
            return;
          }
          if (rootData.length < sizeof(Inode)) {
            crit("Store contains an invalid root inode. Refusing to populate tables");
            return;
          }
          const visitedDirectories = /* @__PURE__ */ new Set();
          let i = 0, upgraded = 0;
          const queue = [["/", rootIno]];
          while (queue.length > 0) {
            i++;
            const [path, ino] = queue.shift();
            this._add(ino, path);
            const inodeData = await tx.get(ino);
            if (!inodeData) {
              warn("Store is missing data for inode: " + ino);
              continue;
            }
            if (inodeData.length < sizeof(Inode)) {
              warn(`Invalid inode size for ino ${ino}: ${inodeData.length}`);
              continue;
            }
            const inode = new Inode(inodeData);
            if (!isDirectory(inode) || visitedDirectories.has(ino))
              continue;
            visitedDirectories.add(ino);
            const dirData = await tx.get(inode.data);
            if (!dirData) {
              warn("Store is missing directory data: " + inode.data);
              continue;
            }
            let dirListing = DirListing.decode(dirData);
            if (DirListing.isLegacy(dirData)) {
              dirListing = await this._resolveTypes(tx, dirListing);
              await tx.set(inode.data, dirListing);
              upgraded++;
            }
            for (const [name, entry] of dirListing) {
              queue.push([join(path, name), Number(entry.id)]);
            }
          }
          debug(`Added ${i} existing inode(s) from store`);
          if (!upgraded)
            return;
          try {
            await tx.commit();
            notice(`Upgraded ${upgraded} directory listing(s)`);
          } catch (e) {
            warn("Failed to upgrade directory listings: " + e);
          }
        } catch (e_21) {
          env_21.error = e_21;
          env_21.hasError = true;
        } finally {
          const result_11 = __disposeResources(env_21);
          if (result_11)
            await result_11;
        }
      }
      _populateSync() {
        const env_22 = { stack: [], error: void 0, hasError: false };
        try {
          if (this._initialized) {
            warn("Attempted to populate tables after initialization");
            return;
          }
          debug("Populating tables with existing store metadata");
          const tx = __addDisposableResource(env_22, this.transaction(), false);
          const rootData = tx.getSync(rootIno);
          if (!rootData) {
            notice("Store does not have a root inode");
            const inode = new Inode({ ino: rootIno, data: 1, mode: 511 | S_IFDIR });
            tx.setSync(inode.data, DirListing.from([]));
            this._add(rootIno, "/");
            tx.setSync(rootIno, inode);
            tx.commitSync();
            return;
          }
          if (rootData.length < sizeof(Inode)) {
            crit("Store contains an invalid root inode. Refusing to populate tables");
            return;
          }
          const visitedDirectories = /* @__PURE__ */ new Set();
          let i = 0, upgraded = 0;
          const queue = [["/", rootIno]];
          while (queue.length > 0) {
            i++;
            const [path, ino] = queue.shift();
            this._add(ino, path);
            const inodeData = tx.getSync(ino);
            if (!inodeData) {
              warn("Store is missing data for inode: " + ino);
              continue;
            }
            if (inodeData.length < sizeof(Inode)) {
              warn(`Invalid inode size for ino ${ino}: ${inodeData.length}`);
              continue;
            }
            const inode = new Inode(inodeData);
            if (!isDirectory(inode) || visitedDirectories.has(ino)) {
              continue;
            }
            visitedDirectories.add(ino);
            const dirData = tx.getSync(inode.data);
            if (!dirData) {
              warn("Store is missing directory data: " + inode.data);
              continue;
            }
            let dirListing = DirListing.decode(dirData);
            if (DirListing.isLegacy(dirData)) {
              dirListing = this._resolveTypesSync(tx, dirListing);
              tx.setSync(inode.data, dirListing);
              upgraded++;
            }
            for (const [name, entry] of dirListing) {
              queue.push([join(path, name), Number(entry.id)]);
            }
          }
          debug(`Added ${i} existing inode(s) from store`);
          if (!upgraded)
            return;
          try {
            tx.commitSync();
            notice(`Upgraded ${upgraded} directory listing(s)`);
          } catch (e) {
            warn("Failed to upgrade directory listings: " + e);
          }
        } catch (e_22) {
          env_22.error = e_22;
          env_22.hasError = true;
        } finally {
          __disposeResources(env_22);
        }
      }
      /** Returns a copy of `listing` with the types of entries with an unknown type read from their inodes */
      async _resolveTypes(tx, listing) {
        const entries2 = [];
        for (const [name, entry] of listing) {
          const { id } = entry;
          let type = entry.type;
          if (type == DirType.UNKNOWN) {
            const data = await tx.get(Number(id));
            if (data && data.length >= sizeof(Inode))
              type = ifToDt(new Inode(data).mode);
          }
          entries2.push({ name, id, type });
        }
        return DirListing.from(entries2);
      }
      /** Returns a copy of `listing` with the types of entries with an unknown type read from their inodes */
      _resolveTypesSync(tx, listing) {
        const entries2 = [];
        for (const [name, entry] of listing) {
          const { id } = entry;
          let type = entry.type;
          if (type == DirType.UNKNOWN) {
            const data = tx.getSync(Number(id));
            if (data && data.length >= sizeof(Inode))
              type = ifToDt(new Inode(data).mode);
          }
          entries2.push({ name, id, type });
        }
        return DirListing.from(entries2);
      }
      /**
       * Find an inode without using the ID tables
       */
      async _findInode(tx, path, visited = /* @__PURE__ */ new Set()) {
        if (visited.has(path))
          throw crit(withErrno("EIO", "Infinite loop detected while finding inode"));
        visited.add(path);
        if (path == "/")
          return new Inode(await tx.get(rootIno) ?? _throw(withErrno("ENODATA")));
        const { dir: parent, base: filename } = parse(path);
        const inode = await this._findInode(tx, parent, visited);
        const entry = DirListing.decode(await tx.get(inode.data) ?? _throw(withErrno("ENODATA"))).get(filename);
        if (!entry)
          throw withErrno("ENOENT");
        return new Inode(await tx.get(Number(entry.id)) ?? _throw(withErrno("ENODATA")));
      }
      /**
       * Find an inode without using the ID tables
       */
      _findInodeSync(tx, path, visited = /* @__PURE__ */ new Set()) {
        if (visited.has(path))
          throw crit(withErrno("EIO", "Infinite loop detected while finding inode"));
        visited.add(path);
        if (path == "/")
          return new Inode(tx.getSync(rootIno) ?? _throw(withErrno("ENOENT")));
        const { dir: parent, base: filename } = parse(path);
        const inode = this._findInodeSync(tx, parent, visited);
        const entry = DirListing.decode(tx.getSync(inode.data) ?? _throw(withErrno("ENODATA"))).get(filename);
        if (!entry)
          throw withErrno("ENOENT");
        return new Inode(tx.getSync(Number(entry.id)) ?? _throw(withErrno("ENODATA")));
      }
      /**
       * Finds the Inode of `path`.
       * @param path The path to look up.
       * @todo memoize/cache
       */
      async findInode(tx, path) {
        if (this.attributes.has("no_id_tables"))
          return await this._findInode(tx, path);
        const ino = this._ids.get(path);
        if (ino === void 0)
          throw withErrno("ENOENT");
        return new Inode(await tx.get(ino) ?? _throw(withErrno("ENOENT")));
      }
      /**
       * Finds the Inode of `path`.
       * @param path The path to look up.
       * @return The Inode of the path p.
       * @todo memoize/cache
       */
      findInodeSync(tx, path) {
        if (this.attributes.has("no_id_tables"))
          return this._findInodeSync(tx, path);
        const ino = this._ids.get(path);
        if (ino === void 0)
          throw withErrno("ENOENT");
        return new Inode(tx.getSync(ino) ?? _throw(withErrno("ENOENT")));
      }
      /** Allocates a new ID and adds the ID/path */
      allocNew(path) {
        if (this.store.allocId) {
          const ids = this.store.allocId();
          this._add(ids[0], path);
          return ids;
        }
        this._lastID || (this._lastID = Array.from(this._paths.keys()).reduce((max, ino) => Math.max(max, ino), 0));
        this._lastID += 2;
        const id = this._lastID;
        if (id > size_max)
          throw err(withErrno("ENOSPC", "No IDs available"));
        this._add(id, path);
        return [id, id + 1];
      }
      /**
       * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
       * Note: This will commit the transaction.
       * @param path The path to the new file.
       * @param options The options to create the new file with.
       * @param data The data to store at the file's data node.
       */
      async commitNew(path, options, data) {
        const env_23 = { stack: [], error: void 0, hasError: false };
        try {
          if (path == "/")
            throw withErrno("EEXIST");
          const tx = __addDisposableResource(env_23, this.transaction(), true);
          const { dir: parentPath, base: fname } = parse(path);
          const parent = await this.findInode(tx, parentPath);
          const listing = DirListing.decode(await tx.get(parent.data) ?? _throw(withErrno("ENOENT")));
          if (listing.has(fname))
            throw withErrno("EEXIST");
          const [ino, dataId] = this.allocNew(path);
          const inode = new Inode({
            ...options,
            ino,
            data: dataId,
            size: data.byteLength,
            nlink: 1
          });
          const updated = listing.with(fname, inode.ino, ifToDt(inode.mode));
          await tx.set(inode.ino, inode);
          await tx.set(inode.data, data);
          await tx.set(parent.data, updated);
          await tx.commit();
          return inode;
        } catch (e_23) {
          env_23.error = e_23;
          env_23.hasError = true;
        } finally {
          const result_12 = __disposeResources(env_23);
          if (result_12)
            await result_12;
        }
      }
      /**
       * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
       * Note: This will commit the transaction.
       * @param path The path to the new file.
       * @param options The options to create the new file with.
       * @param data The data to store at the file's data node.
       * @return The Inode for the new file.
       */
      commitNewSync(path, options, data) {
        const env_24 = { stack: [], error: void 0, hasError: false };
        try {
          if (path == "/")
            throw withErrno("EEXIST");
          const tx = __addDisposableResource(env_24, this.transaction(), false);
          const { dir: parentPath, base: fname } = parse(path);
          const parent = this.findInodeSync(tx, parentPath);
          const listing = DirListing.decode(tx.getSync(parent.data) ?? _throw(withErrno("ENOENT")));
          if (listing.has(fname))
            throw withErrno("EEXIST");
          const [ino, dataId] = this.allocNew(path);
          const inode = new Inode({
            ...options,
            ino,
            data: dataId,
            size: data.byteLength,
            nlink: 1
          });
          const updated = listing.with(fname, inode.ino, ifToDt(inode.mode));
          tx.setSync(inode.ino, inode);
          tx.setSync(inode.data, data);
          tx.setSync(parent.data, updated);
          tx.commitSync();
          return inode;
        } catch (e_24) {
          env_24.error = e_24;
          env_24.hasError = true;
        } finally {
          __disposeResources(env_24);
        }
      }
      /**
       * Remove all traces of `path` from the file system.
       * @param path The path to remove from the file system.
       * @param isDir Does the path belong to a directory, or a file?
       */
      async remove(path, isDir) {
        const env_25 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_25, this.transaction(), true);
          const { dir: parent, base: fileName } = parse(path), parentNode = await this.findInode(tx, parent), listing = DirListing.decode(await tx.get(parentNode.data) ?? _throw(withErrno("ENOENT"))), entry = listing.get(fileName);
          if (!entry)
            throw withErrno("ENOENT");
          const ino = Number(entry.id);
          const updated = listing.without(fileName);
          const inode = new Inode(await tx.get(ino) ?? _throw(withErrno("ENOENT")));
          if (!isDir && isDirectory(inode))
            throw withErrno("EISDIR");
          if (isDir && DirListing.decode(await tx.get(inode.data) ?? _throw(withErrno("ENODATA"))).size)
            throw withErrno("ENOTEMPTY");
          await tx.set(parentNode.data, updated);
          if (inode.nlink > 1) {
            inode.update({ nlink: inode.nlink - 1 });
            await tx.set(inode.ino, inode);
          } else {
            await tx.remove(inode.data);
            await tx.remove(ino);
            this._remove(ino);
          }
          await tx.commit();
        } catch (e_25) {
          env_25.error = e_25;
          env_25.hasError = true;
        } finally {
          const result_13 = __disposeResources(env_25);
          if (result_13)
            await result_13;
        }
      }
      /**
       * Remove all traces of `path` from the file system.
       * @param path The path to remove from the file system.
       * @param isDir Does the path belong to a directory, or a file?
       */
      removeSync(path, isDir) {
        const env_26 = { stack: [], error: void 0, hasError: false };
        try {
          const tx = __addDisposableResource(env_26, this.transaction(), false);
          const { dir: parent, base: fileName } = parse(path), parentNode = this.findInodeSync(tx, parent), listing = DirListing.decode(tx.getSync(parentNode.data) ?? _throw(withErrno("ENOENT"))), entry = listing.get(fileName);
          if (!entry)
            throw withErrno("ENOENT");
          const ino = Number(entry.id);
          const updated = listing.without(fileName);
          const inode = new Inode(tx.getSync(ino) ?? _throw(withErrno("ENOENT")));
          if (!isDir && isDirectory(inode))
            throw withErrno("EISDIR");
          if (isDir && DirListing.decode(tx.getSync(inode.data) ?? _throw(withErrno("ENODATA"))).size)
            throw withErrno("ENOTEMPTY");
          tx.setSync(parentNode.data, updated);
          if (inode.nlink > 1) {
            inode.update({ nlink: inode.nlink - 1 });
            tx.setSync(inode.ino, inode);
          } else {
            tx.removeSync(inode.data);
            tx.removeSync(ino);
            this._remove(ino);
          }
          tx.commitSync();
        } catch (e_26) {
          env_26.error = e_26;
          env_26.hasError = true;
        } finally {
          __disposeResources(env_26);
        }
      }
    }, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _rename_decorators = [retry];
      _renameSync_decorators = [retry];
      _touch_decorators = [retry];
      _touchSync_decorators = [retry];
      _link_decorators = [retry];
      _linkSync_decorators = [retry];
      _write_decorators = [retry];
      _writeSync_decorators = [retry];
      _checkRoot_decorators = [retry];
      _checkRootSync_decorators = [retry];
      _commitNew_decorators = [retry];
      _commitNewSync_decorators = [retry];
      _remove_decorators = [retry];
      _removeSync_decorators = [retry];
      __esDecorate3(_a12, null, _rename_decorators, { kind: "method", name: "rename", static: false, private: false, access: { has: (obj) => "rename" in obj, get: (obj) => obj.rename }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _renameSync_decorators, { kind: "method", name: "renameSync", static: false, private: false, access: { has: (obj) => "renameSync" in obj, get: (obj) => obj.renameSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _touch_decorators, { kind: "method", name: "touch", static: false, private: false, access: { has: (obj) => "touch" in obj, get: (obj) => obj.touch }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _touchSync_decorators, { kind: "method", name: "touchSync", static: false, private: false, access: { has: (obj) => "touchSync" in obj, get: (obj) => obj.touchSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _link_decorators, { kind: "method", name: "link", static: false, private: false, access: { has: (obj) => "link" in obj, get: (obj) => obj.link }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _linkSync_decorators, { kind: "method", name: "linkSync", static: false, private: false, access: { has: (obj) => "linkSync" in obj, get: (obj) => obj.linkSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _write_decorators, { kind: "method", name: "write", static: false, private: false, access: { has: (obj) => "write" in obj, get: (obj) => obj.write }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _writeSync_decorators, { kind: "method", name: "writeSync", static: false, private: false, access: { has: (obj) => "writeSync" in obj, get: (obj) => obj.writeSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _checkRoot_decorators, { kind: "method", name: "checkRoot", static: false, private: false, access: { has: (obj) => "checkRoot" in obj, get: (obj) => obj.checkRoot }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _checkRootSync_decorators, { kind: "method", name: "checkRootSync", static: false, private: false, access: { has: (obj) => "checkRootSync" in obj, get: (obj) => obj.checkRootSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _commitNew_decorators, { kind: "method", name: "commitNew", static: false, private: false, access: { has: (obj) => "commitNew" in obj, get: (obj) => obj.commitNew }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _commitNewSync_decorators, { kind: "method", name: "commitNewSync", static: false, private: false, access: { has: (obj) => "commitNewSync" in obj, get: (obj) => obj.commitNewSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: (obj) => "remove" in obj, get: (obj) => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate3(_a12, null, _removeSync_decorators, { kind: "method", name: "removeSync", static: false, private: false, access: { has: (obj) => "removeSync" in obj, get: (obj) => obj.removeSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(_a12, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), _a12;
  })();

  // node_modules/@zenfs/core/dist/backends/store/map.js
  var SyncMapTransaction = class extends SyncTransaction {
    // eslint-disable-next-line @typescript-eslint/require-await
    async keys() {
      return this.store.keys();
    }
    async get(id, offset, end) {
      return await (this.store.getAsync?.(id, offset, end) ?? this.store.get(id, offset, end));
    }
    getSync(id, offset, end) {
      return this.store.get(id, offset, end);
    }
    setSync(id, data, offset) {
      this.store.set(id, data, offset);
    }
    removeSync(id) {
      this.store.delete(id);
    }
  };

  // node_modules/@zenfs/core/dist/backends/memory.js
  var InMemoryStore = class extends Map {
    constructor(maxSize = size_max, label) {
      super();
      __publicField(this, "maxSize");
      __publicField(this, "label");
      __publicField(this, "flags", []);
      __publicField(this, "name", "tmpfs");
      this.maxSize = maxSize;
      this.label = label;
    }
    async sync() {
    }
    transaction() {
      return new SyncMapTransaction(this);
    }
    get bytes() {
      let size = this.size * 4;
      for (const data of this.values())
        size += data.byteLength;
      return size;
    }
    usage() {
      return {
        totalSpace: this.maxSize,
        freeSpace: this.maxSize - this.bytes
      };
    }
  };
  var _InMemory = {
    name: "InMemory",
    options: {
      maxSize: { type: "number", required: false },
      label: { type: "string", required: false }
    },
    create({ maxSize, label }) {
      const fs = new StoreFS(new InMemoryStore(maxSize, label));
      fs.checkRootSync();
      return fs;
    }
  };
  var InMemory = _InMemory;

  // node_modules/@zenfs/core/dist/internal/devices.js
  var emptyBuffer = new Uint8Array();

  // node_modules/@zenfs/core/dist/node/promises.js
  var promises_exports = {};
  __export(promises_exports, {
    FileHandle: () => FileHandle,
    access: () => access,
    appendFile: () => appendFile,
    chmod: () => chmod3,
    chown: () => chown3,
    constants: () => constants_exports,
    copyFile: () => copyFile,
    cp: () => cp,
    exists: () => exists,
    glob: () => glob,
    lchmod: () => lchmod,
    lchown: () => lchown,
    link: () => link3,
    lstat: () => lstat,
    lutimes: () => lutimes,
    mkdir: () => mkdir3,
    mkdtemp: () => mkdtemp,
    mkdtempDisposable: () => mkdtempDisposable,
    mkstemp: () => mkstemp,
    open: () => open3,
    opendir: () => opendir,
    readFile: () => readFile,
    readdir: () => readdir2,
    readlink: () => readlink3,
    realpath: () => realpath,
    rename: () => rename3,
    rm: () => rm,
    rmdir: () => rmdir,
    stat: () => stat3,
    statfs: () => statfs,
    symlink: () => symlink,
    truncate: () => truncate,
    unlink: () => unlink,
    utimes: () => utimes3,
    watch: () => watch,
    writeFile: () => writeFile
  });
  var import_buffer10 = __toESM(require_buffer(), 1);

  // node_modules/@zenfs/core/dist/internal/error.js
  function wrap(fs, prop, path, dest) {
    const extra = typeof path === "string" ? { path, dest, syscall: prop.endsWith("Sync") ? prop.slice(0, -4) : prop } : path;
    const fn = fs[prop];
    if (typeof fn !== "function")
      throw new TypeError(`${prop} is not a function`);
    return function(...args) {
      try {
        return fn.call(fs, ...args);
      } catch (e) {
        throw setUVMessage(Object.assign(e, extra));
      }
    };
  }
  var kTarget = Symbol("withExceptionContext:target");
  function withExceptionContext(fs, context) {
    return new Proxy(fs, {
      get(target, prop) {
        if (prop === kTarget)
          return target;
        const value = Reflect.get(target, prop);
        if (typeof value != "function")
          return value;
        return function __withContext(...args) {
          try {
            const result = value.apply(target, args);
            if (!(result instanceof Promise))
              return result;
            return result.catch((e) => {
              if ("code" in e)
                throw setUVMessage(Object.assign(e, context));
              if (e in Errno) {
                const ex = UV(e, context);
                Error.captureStackTrace(ex, __withContext);
              }
              throw e;
            });
          } catch (e) {
            throw setUVMessage(Object.assign(e, context));
          }
        };
      }
    });
  }
  function withoutExceptionContext(fs) {
    return fs[kTarget] ?? fs;
  }

  // node_modules/kerium/dist/locks.js
  var __runInitializers4 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var __esDecorate4 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var RwLock = class {
    constructor() {
      /** Release promises for every currently held or queued acquisition */
      __publicField(this, "pending", /* @__PURE__ */ new Set());
      /** This is the *last queued* writer */
      __publicField(this, "lastWriter");
      /** The current accepted write state of the lock */
      __publicField(this, "writeState", 0);
      /** Number of currently accepted readers */
      __publicField(this, "readers", 0);
      __publicField(this, "syncReaders", 0);
    }
    /** Actually take the lock */
    take(mode, sync, resolve4) {
      if (mode == "rw") {
        this.writeState = sync ? 2 : 1;
      } else {
        this.readers++;
        if (sync)
          this.syncReaders++;
      }
      let released = false;
      const release = () => {
        if (released)
          return;
        released = true;
        if (mode == "rw") {
          this.writeState = 0;
        } else {
          this.readers--;
          if (sync)
            this.syncReaders--;
        }
        resolve4();
      };
      release[Symbol.dispose] = release;
      return release;
    }
    /** Queue the reader or writer */
    queue(mode) {
      const { promise, resolve: resolve4 } = Promise.withResolvers();
      this.pending.add(promise);
      if (mode == "rw")
        this.lastWriter = promise;
      void promise.then(() => {
        this.pending.delete(promise);
        if (this.lastWriter == promise)
          delete this.lastWriter;
      });
      return resolve4;
    }
    /**
     * Acquire a lock asynchronously
     */
    async acquire(mode) {
      const allReleased = mode == "ro" ? this.lastWriter : Promise.all(this.pending);
      const resolve4 = this.queue(mode);
      await allReleased;
      return this.take(mode, false, resolve4);
    }
    /**
     * Acquire a lock synchronously. Does not support waiting for existing locks.
     * @throws EDEADLK for rw if there is an existing synchronous holder (it is in the current call chain)
     * @throws EAGAIN for rw if there is an existing asynchronous holder
     */
    acquireSync(mode) {
      if (this.writeState == 2 || mode == "rw" && this.syncReaders)
        throw withErrno("EDEADLK");
      if (this.writeState || mode == "rw" && this.readers)
        throw withErrno("EAGAIN");
      return this.take(mode, true, this.queue(mode));
    }
    /** Whether a synchronous lock can be acquired for the given mode */
    isAvailable(mode) {
      return (mode != "rw" || !this.readers) && !this.writeState;
    }
    /** Whether the lock is currently free. This value may be invalid after an `await` */
    get isFree() {
      return !this.writeState && !this.readers;
    }
    /** How the lock is currently being used. This value may be invalid after an `await` */
    get mode() {
      if (this.writeState)
        return "rw";
      if (this.readers)
        return "ro";
      return null;
    }
  };
  var RwLockable = (() => {
    var _a12;
    let _instanceExtraInitializers = [];
    let _get_lock_decorators;
    let _get_lockSync_decorators;
    return _a12 = class {
      constructor() {
        __publicField(this, "_rwLock", (__runInitializers4(this, _instanceExtraInitializers), new RwLock()));
      }
      get lock() {
        return this._rwLock.acquire.bind(this._rwLock);
      }
      get lockSync() {
        return this._rwLock.acquireSync.bind(this._rwLock);
      }
      get isLocked() {
        return !this._rwLock.isFree;
      }
      get lockMode() {
        return this._rwLock.mode;
      }
    }, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
      _get_lock_decorators = [memoize];
      _get_lockSync_decorators = [memoize];
      __esDecorate4(_a12, null, _get_lock_decorators, { kind: "getter", name: "lock", static: false, private: false, access: { has: (obj) => "lock" in obj, get: (obj) => obj.lock }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate4(_a12, null, _get_lockSync_decorators, { kind: "getter", name: "lockSync", static: false, private: false, access: { has: (obj) => "lockSync" in obj, get: (obj) => obj.lockSync }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(_a12, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), _a12;
  })();

  // node_modules/@zenfs/core/dist/vfs/vnode.js
  var VNode = class extends RwLockable {
    constructor(fs, path, inode) {
      super();
      __publicField(this, "fs");
      __publicField(this, "inode");
      /** Cached file data. This is a page cache, but with byte granularity */
      __publicField(this, "data");
      /** Ranges of `data` that have been written but not yet synced to the backend */
      __publicField(this, "dirtyRanges", []);
      /** The smallest size this vnode has been truncated to since the last sync, if it has been truncated */
      __publicField(this, "truncatedTo");
      /** Whether `inode` has changes that have not been synced to the backend */
      __publicField(this, "metadataDirty", false);
      /** The number of active references: open handles and in-progress VFS operations */
      __publicField(this, "refs", 0);
      /** Paths on `fs` that refer to this vnode. Multiple paths refer to the same vnode with hard links */
      __publicField(this, "paths", /* @__PURE__ */ new Set());
      /** Fallback for when the last path is removed (i.e. the file is unlinked while open) */
      __publicField(this, "_lastPath");
      this.fs = fs;
      this.inode = inode;
      this.paths.add(path);
      this._lastPath = path;
      this.data = new Resource(inode.ino, inode.size, { sparse: true });
    }
    get ino() {
      return this.inode.ino;
    }
    /** A path that can be used to address the backend */
    get path() {
      const [path] = this.paths;
      if (path !== void 0)
        this._lastPath = path;
      return path ?? this._lastPath;
    }
    /** Whether this vnode has data or metadata that has not been synced to the backend */
    get dirty() {
      return this.metadataDirty || this.dirtyRanges.length > 0;
    }
    /** Character and block devices bypass the data cache */
    get bypassCache() {
      return isCharacterDevice(this.inode) || isBlockDevice(this.inode) || !!(this.inode.flags & InodeFlags.DAX);
    }
    /** Add a range to `dirtyRanges`, merging overlapping and adjacent ranges */
    markDirty(start, end) {
      addRange(this.dirtyRanges, start, end);
    }
    /**
     * Copy `[start, end)` from the cache into `buffer`.
     * Uncached spans are holes (e.g. from an extending truncate) and are zero-filled.
     */
    copyFromCache(buffer, start, end) {
      let pos = start;
      for (const region of this.data.regionsIn(start, end)) {
        const regionEnd = region.offset + region.data.byteLength;
        if (regionEnd <= pos)
          continue;
        if (region.offset > pos) {
          buffer.fill(0, pos - start, region.offset - start);
          pos = region.offset;
        }
        const copyEnd = Math.min(end, regionEnd);
        buffer.set(region.data.subarray(pos - region.offset, copyEnd - region.offset), pos - start);
        pos = copyEnd;
      }
      if (pos < end)
        buffer.fill(0, pos - start, end - start);
    }
    /**
     * Read `[start, end)` into `buffer`, fetching any missing ranges from the backend.
     */
    async read(buffer, start, end) {
      if (this.bypassCache)
        return await this.fs.read(this.path, buffer, start, end);
      for (const { start: rangeStart, end: rangeEnd } of this.data.missing(start, end)) {
        const chunk = new Uint8Array(rangeEnd - rangeStart);
        await this.fs.read(this.path, chunk, rangeStart, rangeEnd);
        this.data.add(chunk, rangeStart);
      }
      this.copyFromCache(buffer, start, end);
    }
    readSync(buffer, start, end) {
      if (this.bypassCache)
        return this.fs.readSync(this.path, buffer, start, end);
      for (const { start: rangeStart, end: rangeEnd } of this.data.missing(start, end)) {
        const chunk = new Uint8Array(rangeEnd - rangeStart);
        this.fs.readSync(this.path, chunk, rangeStart, rangeEnd);
        this.data.add(chunk, rangeStart);
      }
      this.copyFromCache(buffer, start, end);
    }
    /**
     * Write `data` at `offset` into the cache and update metadata.
     * The backend is not written to until `sync`, except for devices, which bypass the cache.
     */
    async write(data, offset) {
      if (this.bypassCache)
        await this.fs.write(this.path, data, offset);
      else
        this._writeCached(data, offset);
      this._writeMetadata(offset + data.byteLength);
    }
    writeSync(data, offset) {
      if (this.bypassCache)
        this.fs.writeSync(this.path, data, offset);
      else
        this._writeCached(data, offset);
      this._writeMetadata(offset + data.byteLength);
    }
    _writeCached(data, offset) {
      const end = offset + data.byteLength;
      this.data.add(data.slice(), offset);
      if (end > this.data.size)
        this.data.size = end;
      this.markDirty(offset, end);
    }
    _writeMetadata(end) {
      if (!this.bypassCache && end > this.inode.size)
        this.inode.size = end;
      this.inode.mtimeMs = Date.now();
      this.inode.ctimeMs = Date.now();
      this.metadataDirty = true;
    }
    /**
     * Change the size of the file.
     * Note an extending truncate creates a hole, which reads as zeroes.
     */
    truncate(length) {
      this.truncatedTo = Math.min(this.truncatedTo ?? length, length);
      this.data.size = length;
      this.dirtyRanges = this.dirtyRanges.filter((range) => range.start < length).map((range) => range.end > length ? { start: range.start, end: length } : range);
      this.inode.size = length;
      this.inode.mtimeMs = Date.now();
      this.inode.ctimeMs = Date.now();
      this.metadataDirty = true;
    }
    /**
     * Whether the backend has to be told about a truncation before the dirty data is written.
     */
    get needsPreTruncate() {
      return !this.bypassCache && this.truncatedTo !== void 0 && this.truncatedTo < this.inode.size && !this.fs.attributes.has("no_write");
    }
    /** Write all unsynced data to the backend, then metadata */
    async sync() {
      if (this.needsPreTruncate)
        await this.fs.touch(this.path, { size: this.truncatedTo });
      this.truncatedTo = void 0;
      for (const range of this.dirtyRanges) {
        for (let pos = range.start; pos < range.end; ) {
          const region = this.data.regionAt(pos);
          if (!region)
            break;
          const end = Math.min(range.end, region.offset + region.data.byteLength);
          await this.fs.write(this.path, region.data.subarray(pos - region.offset, end - region.offset), pos);
          pos = end;
        }
      }
      this.dirtyRanges = [];
      if (!this.metadataDirty)
        return;
      if (!this.fs.attributes.has("no_write"))
        await this.fs.touch(this.path, this.inode);
      this.metadataDirty = false;
    }
    syncSync() {
      if (this.needsPreTruncate)
        this.fs.touchSync(this.path, { size: this.truncatedTo });
      this.truncatedTo = void 0;
      for (const range of this.dirtyRanges) {
        for (let pos = range.start; pos < range.end; ) {
          const region = this.data.regionAt(pos);
          if (!region)
            break;
          const end = Math.min(range.end, region.offset + region.data.byteLength);
          this.fs.writeSync(this.path, region.data.subarray(pos - region.offset, end - region.offset), pos);
          pos = end;
        }
      }
      this.dirtyRanges = [];
      if (!this.metadataDirty)
        return;
      if (!this.fs.attributes.has("no_write"))
        this.fs.touchSync(this.path, this.inode);
      this.metadataDirty = false;
    }
  };

  // node_modules/@zenfs/core/dist/vfs/vcache.js
  var __addDisposableResource2 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources2 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  var VCache = class {
    constructor(fs) {
      __publicField(this, "fs");
      __publicField(this, "byIno", /* @__PURE__ */ new Map());
      __publicField(this, "byPath", /* @__PURE__ */ new Map());
      this.fs = fs;
    }
    /** Get the vnode for a path, if one is cached. Note paths are relative to the FS root, not the VFS root */
    get(path) {
      return this.byPath.get(path);
    }
    /**
     * Get or create the vnode for `path`, incrementing its reference count.
     * Callers must `unref` the vnode when done with it.
     */
    ref(path, inode) {
      let node = this.byIno.get(inode.ino);
      if (node && node.inode.nlink === node.paths.size && !node.paths.has(path))
        err(`vcache.ref: vnode for ${this.fs.label || this.fs.uuid}:${inode.ino} has an nlink of ${node.inode.nlink} but referenced by more paths [#314]`);
      if (!node) {
        node = new VNode(this.fs, path, inode);
        this.byIno.set(inode.ino, node);
      } else {
        node.paths.add(path);
        if (!node.dirty && inode !== node.inode)
          Object.assign(node.inode, inode);
      }
      this.byPath.set(path, node);
      node.refs++;
      return node;
    }
    /** Release a reference to a vnode, evicting it if it is unreferenced and clean */
    unref(node) {
      node.refs--;
      if (node.refs > 0 || node.dirty)
        return;
      this.evict(node);
    }
    evict(node) {
      this.byIno.delete(node.ino);
      for (const path of node.paths)
        this.byPath.delete(path);
    }
    /** Update cached paths for a rename. Handles directories, whose descendants' paths change too */
    rename(oldPath, newPath) {
      for (const [path, node] of this.byPath) {
        if (path != oldPath && !path.startsWith(oldPath + "/"))
          continue;
        const moved = newPath + path.slice(oldPath.length);
        this.byPath.delete(path);
        this.byPath.set(moved, node);
        node.paths.delete(path);
        node.paths.add(moved);
      }
    }
    /** Add a path for a newly created hard link, if the target is cached */
    link(targetPath, linkPath) {
      const node = this.byPath.get(targetPath);
      if (!node)
        return;
      node.paths.add(linkPath);
      this.byPath.set(linkPath, node);
    }
    /** Remove a path for an unlink/rmdir. The vnode is kept if other paths (hard links) refer to it */
    remove(path) {
      const node = this.byPath.get(path);
      if (!node)
        return;
      this.byPath.delete(path);
      node.paths.delete(path);
      if (!node.paths.size && !node.refs)
        this.evict(node);
    }
    /** Sync all dirty vnodes to the backend */
    async sync() {
      for (const node of this.byIno.values()) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
          if (!node.dirty)
            continue;
          const _ = __addDisposableResource2(env_1, await node.lock("rw"), false);
          await node.sync();
          if (!node.refs)
            this.evict(node);
        } catch (e_1) {
          env_1.error = e_1;
          env_1.hasError = true;
        } finally {
          __disposeResources2(env_1);
        }
      }
    }
    /** Sync all dirty vnodes to the backend synchronously */
    syncSync() {
      for (const node of this.byIno.values()) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
          if (!node.dirty)
            continue;
          const _ = __addDisposableResource2(env_2, node.lockSync("rw"), false);
          node.syncSync();
          if (!node.refs)
            this.evict(node);
        } catch (e_2) {
          env_2.error = e_2;
          env_2.hasError = true;
        } finally {
          __disposeResources2(env_2);
        }
      }
    }
    /** Get the inode for a path, preferring the cached vnode since it may have unsynced changes */
    async stat(path, extra) {
      try {
        return this.get(path)?.inode ?? await this.fs.stat(path);
      } catch (e) {
        throw extra ? setUVMessage(Object.assign(e, extra)) : e;
      }
    }
    /** Synchronous version of {@link stat} */
    statSync(path, extra) {
      try {
        return this.get(path)?.inode ?? this.fs.statSync(path);
      } catch (e) {
        throw extra ? setUVMessage(Object.assign(e, extra)) : e;
      }
    }
    /**
     * Ref and lock the vnode for a path, usually a parent directory during a namespace operation.
     * The returned release function unlocks and unrefs the vnode.
     * If `inode` is not provided and the vnode is not cached, the backend is `stat`ed.
     */
    async lock(path, mode, inode) {
      inode ?? (inode = await this.stat(path));
      const node = this.ref(path, inode);
      const unlock = await node.lock(mode);
      let released = false;
      const release = () => {
        if (released)
          return;
        released = true;
        unlock();
        this.unref(node);
      };
      release[Symbol.dispose] = release;
      return release;
    }
    /** Synchronous version of {@link lock} */
    lockSync(path, mode, inode) {
      inode ?? (inode = this.statSync(path));
      const node = this.ref(path, inode);
      let unlock;
      try {
        unlock = node.lockSync(mode);
      } catch (e) {
        this.unref(node);
        throw e;
      }
      let released = false;
      const release = () => {
        if (released)
          return;
        released = true;
        unlock();
        this.unref(node);
      };
      release[Symbol.dispose] = release;
      return release;
    }
  };
  var caches = /* @__PURE__ */ new Map();
  function cacheOf(fs) {
    return caches.getOrInsertComputed(fs.uuid, () => new VCache(withoutExceptionContext(fs)));
  }

  // node_modules/@zenfs/core/dist/vfs/file.js
  var __runInitializers5 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var __esDecorate5 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var __addDisposableResource3 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources3 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  var streamChunkSize = 65536;
  var Handle = (() => {
    var _a12;
    let _instanceExtraInitializers = [];
    let _get_inode_decorators;
    let _get_fs_decorators;
    return _a12 = class {
      /**
       * Creates a file handle for the vnode.
       */
      constructor(context, path, internalPath, flag, vnode) {
        __publicField(this, "context", __runInitializers5(this, _instanceExtraInitializers));
        __publicField(this, "path");
        __publicField(this, "internalPath");
        __publicField(this, "flag");
        __publicField(this, "vnode");
        /** Current position */
        __publicField(this, "_position", 0);
        /**
         * Whether the file is open or closed
         */
        __publicField(this, "closed", false);
        /** How many descriptors refer to this open file */
        __publicField(this, "refs", 1);
        this.context = context;
        this.path = path;
        this.internalPath = internalPath;
        this.flag = flag;
        this.vnode = vnode;
      }
      /**
       * Get the current file position.
       *
       * We emulate the following bug mentioned in the Node documentation:
       *
       * On Linux, positional writes don't work when the file is opened in append mode.
       * The kernel ignores the position argument and always appends the data to the end of the file.
       * @returns The current file position.
       */
      get position() {
        return this.flag & O_APPEND ? this.inode.size : this._position;
      }
      set position(value) {
        this._position = value;
      }
      /**
       * The inode for the file. This is shared between all handles for the file via the vnode.
       */
      get inode() {
        return this.vnode.inode;
      }
      get fs() {
        return this.vnode.fs;
      }
      /**
       * Whether the file has changes which have not been written to the FS
       */
      get dirty() {
        return this.vnode.dirty;
      }
      /** Take another reference to the open file */
      ref() {
        if (this.closed)
          throw UV("EBADF", "dup", this.path);
        this.refs++;
        return this;
      }
      get isClosed() {
        return this.closed;
      }
      get _isSync() {
        return !!(this.flag & O_SYNC || this.inode.flags & InodeFlags.Sync || this.fs.attributes.has("sync"));
      }
      [(_get_inode_decorators = [memoize], _get_fs_decorators = [memoize], Symbol.dispose)]() {
        this.closeSync();
      }
      syncSync() {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "sync", this.path);
          if (!this.dirty)
            return;
          const _ = __addDisposableResource3(env_1, this.vnode.lockSync("rw"), false);
          this.vnode.syncSync();
        } catch (e_1) {
          env_1.error = e_1;
          env_1.hasError = true;
        } finally {
          __disposeResources3(env_1);
        }
      }
      /**
       * Default implementation maps to `syncSync`.
       */
      datasyncSync() {
        return this.syncSync();
      }
      closeSync() {
        if (this.closed)
          throw UV("EBADF", "close", this.path);
        this.syncSync();
        if (--this.refs > 0)
          return;
        this.disposeSync(true);
      }
      /**
       * Cleans up. This will *not* sync the file data to the FS
       */
      disposeSync(force) {
        if (this.closed)
          throw UV("EBADF", "close", this.path);
        if (this.dirty && !force)
          throw UV("EBUSY", "close", this.path);
        this.closed = true;
        cacheOf(this.fs).unref(this.vnode);
      }
      truncateSync(length) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
          if (length < 0)
            throw UV("EINVAL", "truncate", this.path);
          if (this.closed)
            throw UV("EBADF", "truncate", this.path);
          if (!(this.flag & O_WRONLY || this.flag & O_RDWR))
            throw UV("EBADF", "truncate", this.path);
          if (this.fs.attributes.has("readonly"))
            throw UV("EROFS", "truncate", this.path);
          if (this.inode.flags & InodeFlags.Immutable)
            throw UV("EPERM", "truncate", this.path);
          const _ = __addDisposableResource3(env_2, this.vnode.lockSync("rw"), false);
          this.vnode.truncate(length);
          if (this._isSync)
            this.vnode.syncSync();
        } catch (e_2) {
          env_2.error = e_2;
          env_2.hasError = true;
        } finally {
          __disposeResources3(env_2);
        }
      }
      /**
       * Write buffer to the file.
       * @param buffer Uint8Array containing the data to write to the file.
       * @param offset Offset in the buffer to start reading data from.
       * @param length The amount of bytes to write to the file.
       * @param position Offset from the beginning of the file where this data should be written.
       * If position is null, the data will be written at the current position, which is then advanced.
       * @returns bytes written
       */
      writeSync(buffer, offset = 0, length = buffer.byteLength - offset, position) {
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "write", this.path);
          if (!(this.flag & O_WRONLY || this.flag & O_RDWR))
            throw UV("EBADF", "write", this.path);
          if (this.fs.attributes.has("readonly"))
            throw UV("EROFS", "write", this.path);
          if (this.inode.flags & InodeFlags.Immutable)
            throw UV("EPERM", "write", this.path);
          const _ = __addDisposableResource3(env_3, this.vnode.lockSync("rw"), false);
          const slice = buffer.subarray(offset, offset + length);
          const start = position ?? this.position;
          this.vnode.writeSync(slice, start);
          if (position == null)
            this._position = start + slice.byteLength;
          if (this._isSync)
            this.vnode.syncSync();
          return slice.byteLength;
        } catch (e_3) {
          env_3.error = e_3;
          env_3.hasError = true;
        } finally {
          __disposeResources3(env_3);
        }
      }
      /**
       * Read data from the file.
       * @param buffer The buffer that the data will be written to.
       * @param offset The offset within the buffer where writing will start.
       * @param length An integer specifying the number of bytes to read.
       * @param position An integer specifying where to begin reading from in the file.
       * If position is null, data will be read from the current file position, which is then advanced.
       * @returns number of bytes written
       */
      readSync(buffer, offset = 0, length = buffer.byteLength - offset, position) {
        const env_4 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "read", this.path);
          if (this.flag & O_WRONLY)
            throw UV("EBADF", "read", this.path);
          const _ = __addDisposableResource3(env_4, this.vnode.lockSync("ro"), false);
          if (!(this.inode.flags & InodeFlags.NoAtime) && !this.fs.attributes.has("no_atime")) {
            this.vnode.metadataDirty = true;
            this.inode.atimeMs = Date.now();
          }
          const start = position ?? this._position;
          let end = start + length;
          if (!isCharacterDevice(this.inode) && !isBlockDevice(this.inode) && end > this.inode.size) {
            end = start + Math.max(this.inode.size - start, 0);
          }
          if (position == null)
            this._position = end;
          const uint82 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          this.vnode.readSync(uint82.subarray(offset, offset + length), start, end);
          if (this._isSync)
            this.vnode.syncSync();
          return end - start;
        } catch (e_4) {
          env_4.error = e_4;
          env_4.hasError = true;
        } finally {
          __disposeResources3(env_4);
        }
      }
      chmodSync(mode) {
        const env_5 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "chmod", this.path);
          assertOwner(this.context, this.inode, { syscall: "chmod", path: this.path });
          const _ = __addDisposableResource3(env_5, this.vnode.lockSync("rw"), false);
          this.vnode.metadataDirty = true;
          _chmod(this.context, this.inode, mode);
          if (this._isSync || mode > S_IFMT)
            this.vnode.syncSync();
        } catch (e_5) {
          env_5.error = e_5;
          env_5.hasError = true;
        } finally {
          __disposeResources3(env_5);
        }
      }
      chownSync(uid, gid) {
        const env_6 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "chown", this.path);
          assertCanChown(this.context, this.inode, uid, gid, { syscall: "chown", path: this.path });
          const _ = __addDisposableResource3(env_6, this.vnode.lockSync("rw"), false);
          this.vnode.metadataDirty = true;
          _chown(this.inode, uid, gid);
          if (this._isSync)
            this.vnode.syncSync();
        } catch (e_6) {
          env_6.error = e_6;
          env_6.hasError = true;
        } finally {
          __disposeResources3(env_6);
        }
      }
      /**
       * Change the file timestamps of the file.
       */
      utimesSync(atime, mtime) {
        const env_7 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "utimes", this.path);
          assertOwner(this.context, this.inode, { syscall: "utimes", path: this.path });
          const _ = __addDisposableResource3(env_7, this.vnode.lockSync("rw"), false);
          this.vnode.metadataDirty = true;
          this.inode.atimeMs = atime;
          this.inode.mtimeMs = mtime;
          if (this._isSync)
            this.vnode.syncSync();
        } catch (e_7) {
          env_7.error = e_7;
          env_7.hasError = true;
        } finally {
          __disposeResources3(env_7);
        }
      }
      async [Symbol.asyncDispose]() {
        await this.close();
      }
      async sync() {
        const env_8 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "sync", this.path);
          if (!this.dirty)
            return;
          const _ = __addDisposableResource3(env_8, await this.vnode.lock("rw"), false);
          await this.vnode.sync();
        } catch (e_8) {
          env_8.error = e_8;
          env_8.hasError = true;
        } finally {
          __disposeResources3(env_8);
        }
      }
      /**
       * Default implementation maps to `sync`.
       */
      datasync() {
        return this.sync();
      }
      async close() {
        if (this.closed)
          throw UV("EBADF", "close", this.path);
        await this.sync();
        if (--this.refs > 0)
          return;
        this.dispose(true);
      }
      /**
       * Cleans up. This will *not* sync the file data to the FS
       */
      dispose(force) {
        if (this.closed)
          throw UV("EBADF", "close", this.path);
        if (this.dirty && !force)
          throw UV("EBUSY", "close", this.path);
        this.closed = true;
        cacheOf(this.fs).unref(this.vnode);
      }
      stat() {
        if (this.closed)
          throw UV("EBADF", "stat", this.path);
        return this.inode;
      }
      async truncate(length) {
        const env_9 = { stack: [], error: void 0, hasError: false };
        try {
          if (length < 0)
            throw UV("EINVAL", "truncate", this.path);
          if (this.closed)
            throw UV("EBADF", "truncate", this.path);
          if (!(this.flag & O_WRONLY || this.flag & O_RDWR))
            throw UV("EBADF", "truncate", this.path);
          if (this.fs.attributes.has("readonly"))
            throw UV("EROFS", "truncate", this.path);
          if (this.inode.flags & InodeFlags.Immutable)
            throw UV("EPERM", "truncate", this.path);
          const _ = __addDisposableResource3(env_9, await this.vnode.lock("rw"), false);
          this.vnode.truncate(length);
          if (this._isSync)
            await this.vnode.sync();
        } catch (e_9) {
          env_9.error = e_9;
          env_9.hasError = true;
        } finally {
          __disposeResources3(env_9);
        }
      }
      /**
       * Write buffer to the file.
       * @param buffer Uint8Array containing the data to write to the file.
       * @param offset Offset in the buffer to start reading data from.
       * @param length The amount of bytes to write to the file.
       * @param position Offset from the beginning of the file where this data should be written.
       * If position is null, the data will be written at the current position, which is then advanced.
       * @returns bytes written
       */
      async write(buffer, offset = 0, length = buffer.byteLength - offset, position) {
        const env_10 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "write", this.path);
          if (!(this.flag & O_WRONLY || this.flag & O_RDWR))
            throw UV("EBADF", "write", this.path);
          if (this.fs.attributes.has("readonly"))
            throw UV("EROFS", "write", this.path);
          if (this.inode.flags & InodeFlags.Immutable)
            throw UV("EPERM", "write", this.path);
          const _ = __addDisposableResource3(env_10, await this.vnode.lock("rw"), false);
          const slice = buffer.subarray(offset, offset + length);
          const start = position ?? this.position;
          await this.vnode.write(slice, start);
          if (position == null)
            this._position = start + slice.byteLength;
          if (this._isSync)
            await this.vnode.sync();
          return slice.byteLength;
        } catch (e_10) {
          env_10.error = e_10;
          env_10.hasError = true;
        } finally {
          __disposeResources3(env_10);
        }
      }
      /**
       * Read data from the file.
       * @param buffer The buffer that the data will be written to.
       * @param offset The offset within the buffer where writing will start.
       * @param length An integer specifying the number of bytes to read.
       * @param position An integer specifying where to begin reading from in the file.
       * If position is null, data will be read from the current file position, which is then advanced.
       * @returns number of bytes written
       */
      async read(buffer, offset = 0, length = buffer.byteLength - offset, position) {
        const env_11 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "read", this.path);
          if (this.flag & O_WRONLY)
            throw UV("EBADF", "read", this.path);
          const _ = __addDisposableResource3(env_11, await this.vnode.lock("ro"), false);
          if (!(this.inode.flags & InodeFlags.NoAtime) && !this.fs.attributes.has("no_atime")) {
            this.vnode.metadataDirty = true;
            this.inode.atimeMs = Date.now();
          }
          const start = position ?? this._position;
          let end = start + length;
          if (!isCharacterDevice(this.inode) && !isBlockDevice(this.inode) && end > this.inode.size) {
            end = start + Math.max(this.inode.size - start, 0);
          }
          if (position == null)
            this._position = end;
          const uint82 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          await this.vnode.read(uint82.subarray(offset, offset + length), start, end);
          if (this._isSync)
            await this.vnode.sync();
          return end - start;
        } catch (e_11) {
          env_11.error = e_11;
          env_11.hasError = true;
        } finally {
          __disposeResources3(env_11);
        }
      }
      async chmod(mode) {
        const env_12 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "chmod", this.path);
          assertOwner(this.context, this.inode, { syscall: "chmod", path: this.path });
          const _ = __addDisposableResource3(env_12, await this.vnode.lock("rw"), false);
          this.vnode.metadataDirty = true;
          _chmod(this.context, this.inode, mode);
          if (this._isSync || mode > S_IFMT)
            await this.vnode.sync();
        } catch (e_12) {
          env_12.error = e_12;
          env_12.hasError = true;
        } finally {
          __disposeResources3(env_12);
        }
      }
      async chown(uid, gid) {
        const env_13 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "chown", this.path);
          assertCanChown(this.context, this.inode, uid, gid, { syscall: "chown", path: this.path });
          const _ = __addDisposableResource3(env_13, await this.vnode.lock("rw"), false);
          this.vnode.metadataDirty = true;
          _chown(this.inode, uid, gid);
          if (this._isSync)
            await this.vnode.sync();
        } catch (e_13) {
          env_13.error = e_13;
          env_13.hasError = true;
        } finally {
          __disposeResources3(env_13);
        }
      }
      /**
       * Change the file timestamps of the file.
       */
      async utimes(atime, mtime) {
        const env_14 = { stack: [], error: void 0, hasError: false };
        try {
          if (this.closed)
            throw UV("EBADF", "utimes", this.path);
          assertOwner(this.context, this.inode, { syscall: "utimes", path: this.path });
          const _ = __addDisposableResource3(env_14, await this.vnode.lock("rw"), false);
          this.vnode.metadataDirty = true;
          this.inode.atimeMs = atime;
          this.inode.mtimeMs = mtime;
          if (this._isSync)
            await this.vnode.sync();
        } catch (e_14) {
          env_14.error = e_14;
          env_14.hasError = true;
        } finally {
          __disposeResources3(env_14);
        }
      }
      /**
       * Create a stream for reading the file from `start`, or from the current position (which is then advanced) if not given.
       */
      streamRead(options) {
        if (this.closed)
          throw UV("EBADF", "streamRead", this.path);
        const handle = this;
        const { chunkSize = streamChunkSize } = options;
        let position = options.start;
        let remaining = options.end === void 0 ? Infinity : options.end - (options.start ?? 0);
        return new ReadableStream({
          async pull(controller) {
            const size = Math.min(chunkSize, remaining);
            const buffer = new Uint8Array(Math.max(size, 0));
            const bytesRead = size > 0 ? await handle.read(buffer, 0, size, position ?? null) : 0;
            if (!bytesRead) {
              controller.close();
              return;
            }
            if (position !== void 0)
              position += bytesRead;
            remaining -= bytesRead;
            controller.enqueue(buffer.subarray(0, bytesRead));
          },
          type: "bytes"
        });
      }
      /**
       * Create a stream for writing the file at `start`, or at the current position (which is then advanced) if not given.
       * Chunks are written to the vnode's cache, then synced when the stream is closed.
       * @todo Don't repeat ourselves with the implementation in `FileSystem`
       */
      streamWrite(options) {
        if (this.closed)
          throw UV("EBADF", "write", this.path);
        if (this.inode.flags & InodeFlags.Immutable)
          throw UV("EPERM", "write", this.path);
        if (this.fs.attributes.has("readonly"))
          throw UV("EROFS", "write", this.path);
        const handle = this;
        const { vnode } = this;
        let position = options.start;
        return new WritableStream({
          async write(chunk, controller) {
            await handle.write(chunk, 0, chunk.byteLength, position ?? null).catch(controller.error.bind(controller));
            if (position !== void 0)
              position += chunk.byteLength;
          },
          async close() {
            const env_15 = { stack: [], error: void 0, hasError: false };
            try {
              const _ = __addDisposableResource3(env_15, await vnode.lock("rw"), false);
              await vnode.sync();
            } catch (e_15) {
              env_15.error = e_15;
              env_15.hasError = true;
            } finally {
              __disposeResources3(env_15);
            }
          }
        });
      }
    }, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
      __esDecorate5(_a12, null, _get_inode_decorators, { kind: "getter", name: "inode", static: false, private: false, access: { has: (obj) => "inode" in obj, get: (obj) => obj.inode }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate5(_a12, null, _get_fs_decorators, { kind: "getter", name: "fs", static: false, private: false, access: { has: (obj) => "fs" in obj, get: (obj) => obj.fs }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(_a12, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), _a12;
  })();
  function toFD(file, $ = file.context) {
    const map2 = contextOf($).descriptors;
    let fd = 0;
    while (map2.has(fd))
      fd++;
    map2.set(fd, file);
    return fd;
  }
  function fromFD($, fd) {
    validateFD(fd);
    const map2 = contextOf($).descriptors;
    const value = map2.get(fd);
    if (!value)
      throw withErrno("EBADF");
    return value;
  }
  function deleteFD($, fd) {
    return contextOf($).descriptors.delete(fd);
  }

  // node_modules/@zenfs/core/dist/vfs/flags.js
  var pattern = /[rwasx]{1,2}\+?/;
  function parse2(flag) {
    if (typeof flag == "number")
      return flag;
    if (!pattern.test(flag)) {
      throw withErrno("EINVAL", "Invalid flag string: " + flag);
    }
    return toNumber(flag);
  }
  function toNumber(flag) {
    if (!flag.includes("r") && !flag.includes("w") && !flag.includes("a")) {
      throw withErrno("EINVAL", "Invalid flag string: " + flag);
    }
    let n = flag.includes("r") ? O_RDONLY : O_CREAT;
    if (flag.includes("w"))
      n |= O_TRUNC;
    if (flag.includes("a"))
      n |= O_APPEND;
    if (flag.includes("+"))
      n |= O_RDWR;
    else if (!flag.includes("r"))
      n |= O_WRONLY;
    if (flag.includes("s"))
      n |= O_SYNC;
    if (flag.includes("x"))
      n |= O_EXCL;
    return n;
  }
  function toMode(flag) {
    let mode = 0;
    if (!(flag & O_WRONLY))
      mode |= R_OK;
    if (flag & O_WRONLY || flag & O_RDWR)
      mode |= W_OK;
    return mode;
  }

  // node_modules/@zenfs/core/dist/vfs/shared.js
  var mounts = defaultContext.mounts;
  mount("/", InMemory.create({ label: "root" }));
  function mount(mountPoint, fs) {
    const $ = contextOf(this);
    if (mountPoint[0] != "/")
      mountPoint = "/" + mountPoint;
    mountPoint = resolve.call($, mountPoint);
    if ($.mounts.has(mountPoint))
      throw err(withErrno("EINVAL", "Mount point is already in use: " + mountPoint));
    fs._mountPoint = mountPoint;
    $.mounts.set(mountPoint, fs);
    caches.getOrInsertComputed(fs.uuid, () => new VCache(fs));
    info(`Mounted ${fs.name} on ${mountPoint}`);
    debug(`${fs.name} attributes: ${[...fs.attributes].map(([k, v]) => v !== void 0 && v !== null ? k + "=" + v : k).join(", ")}`);
  }
  function umount(mountPoint) {
    const $ = contextOf(this);
    if (mountPoint[0] != "/")
      mountPoint = "/" + mountPoint;
    mountPoint = resolve.call(this, mountPoint);
    const fs = $.mounts.get(mountPoint);
    if (!fs) {
      warn(mountPoint + " is already unmounted");
      return;
    }
    const _done = () => {
      caches.delete(fs.uuid);
      info("Synced all changes to " + mountPoint);
    };
    try {
      caches.get(fs.uuid)?.syncSync();
      _done();
    } catch {
      warn(`Could not flush to ${mountPoint} synchronously.`);
      void caches.get(fs.uuid)?.sync().then(_done);
    }
    $.mounts.delete(mountPoint);
    notice("Unmounted " + mountPoint);
  }
  function resolveMount(path, ctx, extra) {
    const { root, mounts: mounts2 } = contextOf(ctx);
    const _exceptionContext = { path, ...extra };
    path = normalizePath(join(root, path), true);
    path = resolve.call(ctx, path);
    const sortedMounts = [...mounts2].sort((a, b) => a[0].length > b[0].length ? -1 : 1);
    for (const [mountPoint, fs] of sortedMounts) {
      if (!_isParentOf(mountPoint, path))
        continue;
      path = path.slice(mountPoint.length > 1 ? mountPoint.length : 0);
      if (path === "")
        path = "/";
      const case_fold = fs.attributes.get("case_fold");
      if (case_fold === "lower")
        path = path.toLowerCase();
      if (case_fold === "upper")
        path = path.toUpperCase();
      return { fs: withExceptionContext(fs, _exceptionContext), cache: cacheOf(fs), path, mountPoint, root };
    }
    throw alert(new Exception(Errno.EIO, "No file system for " + path));
  }
  function _statfs(fs, bigint) {
    const md = fs.usage();
    const bs = md.blockSize || 4096;
    const type = bigint ? BigInt : Number;
    return {
      type: type(fs.type),
      bsize: type(bs),
      frsize: type(bs),
      ffree: type(md.freeNodes || size_max),
      files: type(md.totalNodes || size_max),
      bavail: type(md.freeSpace / bs),
      bfree: type(md.freeSpace / bs),
      blocks: type(md.totalSpace / bs)
    };
  }
  function chroot(path) {
    const $ = contextOf(this);
    if (!credentialsAllowRoot($.credentials))
      throw withErrno("EPERM", "Can not chroot() as non-root user");
    $.root ?? ($.root = "/");
    const newRoot = join($.root, path);
    for (const handle of $.descriptors?.values() ?? []) {
      if (!handle.path.startsWith($.root))
        throw UV("EBUSY", "chroot", handle.path);
      handle.path = handle.path.slice($.root.length);
    }
    if (newRoot.length < $.root.length)
      throw withErrno("EPERM", "Can not chroot() outside of current root");
    $.root = newRoot;
  }
  function _isParentOf(parent, child) {
    if (parent === "/" || parent === child)
      return true;
    if (!parent.endsWith("/"))
      parent += "/";
    return child.startsWith(parent);
  }

  // node_modules/@zenfs/core/dist/node/sync.js
  var import_buffer5 = __toESM(require_buffer(), 1);

  // node_modules/@zenfs/core/dist/vfs/sync.js
  var __addDisposableResource4 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources4 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  function resolve2($, path, preserveSymlinks, extra) {
    path = resolve.call($, path);
    if (!resolveFullWalk)
      try {
        const resolved2 = resolveMount(path, $);
        const stats2 = resolved2.cache.statSync(resolved2.path);
        if (!isSymbolicLink(stats2) || preserveSymlinks) {
          return { ...resolved2, fullPath: path, stats: stats2 };
        }
        const target2 = resolve.call($, dirname(path), readlink.call($, path));
        return resolve2($, target2, preserveSymlinks, extra);
      } catch {
      }
    const { base, dir } = parse(path);
    const $ex = { syscall: "stat", path, ...extra };
    let realDir = "/";
    if (dir != "/") {
      const parent = resolve2($, dir, false, extra);
      if (parent.stats && isDirectory(parent.stats))
        assertSearchable($, parent.stats, $ex);
      realDir = parent.fullPath;
    } else if (base && checkAccess) {
      const root = resolveMount("/", $);
      assertSearchable($, root.cache.statSync(root.path), $ex);
    }
    const maybePath = join(realDir, base);
    const resolved = resolveMount(maybePath, $);
    let stats;
    try {
      stats = resolved.cache.statSync(resolved.path);
    } catch (e) {
      if (e.code === "ENOENT")
        return { ...resolved, fullPath: maybePath };
      throw setUVMessage(Object.assign(e, { syscall: "stat", path: maybePath, ...extra }));
    }
    if (!isSymbolicLink(stats) || preserveSymlinks) {
      return { ...resolved, fullPath: maybePath, stats };
    }
    const target = resolve.call($, realDir, readlink.call($, maybePath));
    return resolve2($, target, false, extra);
  }
  function open($, path, opt) {
    path = normalizePath.call($, path);
    const mode = normalizeMode(opt.mode, 420), flag = parse2(opt.flag);
    path = resolve2($, path, opt.preserveSymlinks).fullPath;
    const { fs, cache, path: resolved } = resolveMount(path, $);
    let stats;
    try {
      stats = cache.statSync(resolved);
    } catch {
    }
    if (!stats) {
      const env_1 = { stack: [], error: void 0, hasError: false };
      try {
        if (!(flag & O_CREAT)) {
          throw UV("ENOENT", "open", path);
        }
        const parentPath = dirname(resolved);
        const parentStats = cache.statSync(parentPath, { syscall: "open", path });
        if (checkAccess && !hasAccess($, parentStats, W_OK | X_OK)) {
          throw UV("EACCES", "open", path);
        }
        if (!isDirectory(parentStats)) {
          throw UV("ENOTDIR", "open", path);
        }
        if (!opt.allowDirectory && isDirectory({ mode }))
          throw UV("EISDIR", "open", path);
        const _ = __addDisposableResource4(env_1, cache.lockSync(parentPath, "rw", parentStats), false);
        const { euid: uid, egid: gid } = contextOf($).credentials;
        const inode = fs.createFileSync(resolved, {
          mode: applyUmask($, mode),
          uid: parentStats.mode & S_ISUID ? parentStats.uid : uid,
          gid: parentStats.mode & S_ISGID ? parentStats.gid : gid
        });
        emitChange($, "rename", path);
        return new Handle($, path, resolved, flag, cache.ref(resolved, inode));
      } catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
      } finally {
        __disposeResources4(env_1);
      }
    }
    if (checkAccess && !hasAccess($, stats, toMode(flag))) {
      throw UV("EACCES", "open", path);
    }
    if (flag & O_EXCL)
      throw UV("EEXIST", "open", path);
    if (!opt.allowDirectory && isDirectory(stats))
      throw UV("EISDIR", "open", path);
    const file = new Handle($, path, resolved, flag, cache.ref(resolved, stats));
    if (flag & O_TRUNC)
      file.truncateSync(0);
    return file;
  }
  function readlink(path) {
    path = normalizePath.call(this, path);
    const { fs, stats, path: resolved } = resolve2(this, path, true, { syscall: "readlink" });
    if (!stats)
      throw UV("ENOENT", "readlink", path);
    if (checkAccess && !hasAccess(this, stats, R_OK))
      throw UV("EACCES", "readlink", path);
    if (!isSymbolicLink(stats))
      throw UV("EINVAL", "readlink", path);
    const size = stats.size;
    const data = new Uint8Array(size);
    fs.readSync(resolved, data, 0, size);
    return decodeUTF8(data);
  }
  function mkdir(path, options = {}) {
    const original = normalizePath.call(this, path);
    const $ex = { syscall: "mkdir", path: original };
    const { fullPath: realParent } = resolve2(this, dirname(original), false, $ex);
    const { fs, cache, path: target } = resolveMount(join(realParent, basename(original)), this, $ex);
    const followed = realParent != dirname(original);
    const { euid: uid, egid: gid } = contextOf(this).credentials;
    const { recursive } = options;
    const mode = applyUmask(this, options.mode ?? 511);
    let firstCreated;
    const __create2 = (path2, resolved) => {
      const env_2 = { stack: [], error: void 0, hasError: false };
      try {
        const parentPath = dirname(resolved);
        const parent = recursive && parentPath != "/" ? __create2(dirname(path2), parentPath) : cache.statSync(parentPath, $ex);
        if (recursive) {
          let existing;
          try {
            existing = cache.statSync(resolved);
          } catch {
          }
          if (existing) {
            const stats = isSymbolicLink(existing) ? resolve2(this, path2, false, $ex).stats : existing;
            if (!stats)
              throw UV("ENOENT", $ex);
            if (!isDirectory(stats))
              throw UV(resolved == target ? "EEXIST" : "ENOTDIR", $ex);
            return existing;
          }
          if (followed && fs.existsSync(join(parentPath, basename(path2))))
            throw UV("ENOENT", $ex);
        }
        if (checkAccess && !hasAccess(this, parent, W_OK | X_OK))
          throw UV("EACCES", "mkdir", path2);
        const _ = __addDisposableResource4(env_2, cache.lockSync(parentPath, "rw", parent), false);
        const inode = wrap(fs, "mkdirSync", { path: path2, syscall: "mkdir" })(resolved, {
          mode,
          uid: parent.mode & S_ISUID ? parent.uid : uid,
          gid: parent.mode & S_ISGID ? parent.gid : gid
        });
        if (recursive)
          firstCreated ?? (firstCreated = path2);
        emitChange(this, "rename", path2);
        return inode;
      } catch (e_2) {
        env_2.error = e_2;
        env_2.hasError = true;
      } finally {
        __disposeResources4(env_2);
      }
    };
    __create2(original, target);
    return firstCreated;
  }
  function readdir(path, options = {}) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = resolve2(this, path);
    const stats = cache.statSync(resolved, { path, syscall: "scandir" });
    if (checkAccess && !hasAccess(this, stats, R_OK))
      throw UV("EACCES", "scandir", path);
    if (!isDirectory(stats))
      throw UV("ENOTDIR", "scandir", path);
    let entries2;
    {
      const env_3 = { stack: [], error: void 0, hasError: false };
      try {
        const _ = __addDisposableResource4(env_3, cache.lockSync(resolved, "ro", stats), false);
        entries2 = fs.readdirSync(resolved);
      } catch (e_3) {
        env_3.error = e_3;
        env_3.hasError = true;
      } finally {
        __disposeResources4(env_3);
      }
    }
    const values = [];
    const addEntry = (entry) => {
      let entryStat;
      try {
        entryStat = cache.statSync(join(resolved, entry), { syscall: "scandir", path });
      } catch (e) {
        if (e.code == "ENOENT")
          return;
        throw e;
      }
      const ent = new Dirent();
      ent.ino = entryStat.ino;
      ent.type = ifToDt(entryStat.mode);
      ent.path = entry;
      ent.name = basename(entry);
      values.push(ent);
      if (!isDirectory(entryStat) || !options?.recursive)
        return;
      const children = fs.readdirSync(join(resolved, entry));
      for (const child of children)
        addEntry(join(entry, child));
    };
    for (const entry of entries2)
      addEntry(entry);
    return values;
  }
  function rename(oldPath, newPath) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
      oldPath = normalizePath.call(this, oldPath);
      newPath = normalizePath.call(this, newPath);
      const $ex = { syscall: "rename", path: oldPath, dest: newPath };
      const src = resolve2(this, oldPath, true, $ex);
      const dst = resolve2(this, newPath, true, $ex);
      if (src.fs.uuid !== dst.fs.uuid)
        throw UV("EXDEV", $ex);
      if (dst.path.startsWith(src.path + "/"))
        throw UV("EINVAL", $ex);
      if (!src.stats)
        throw UV("ENOENT", $ex);
      const srcDir = dirname(src.path);
      const dstDir = dirname(dst.path);
      const oldParent = src.cache.statSync(srcDir, $ex);
      const newParent = src.cache.statSync(dstDir, $ex);
      let newStats;
      try {
        newStats = src.cache.statSync(dst.path, $ex);
      } catch (e) {
        if (e.code != "ENOENT")
          throw e;
      }
      assertRemovable(this, oldParent, src.stats, $ex);
      if (newStats)
        assertRemovable(this, newParent, newStats, $ex);
      if (checkAccess && !hasAccess(this, newParent, W_OK | X_OK))
        throw UV("EACCES", $ex);
      if (checkAccess && isDirectory(src.stats) && srcDir != dstDir && !hasAccess(this, src.stats, W_OK))
        throw UV("EACCES", $ex);
      if (newStats && !isDirectory(src.stats) && isDirectory(newStats))
        throw UV("EISDIR", $ex);
      if (newStats && isDirectory(src.stats) && !isDirectory(newStats))
        throw UV("ENOTDIR", $ex);
      const parents = [
        [srcDir, oldParent],
        [dstDir, newParent]
      ];
      if (oldParent.ino > newParent.ino)
        parents.reverse();
      const _first = __addDisposableResource4(env_4, src.cache.lockSync(parents[0][0], "rw", parents[0][1]), false);
      const _second = __addDisposableResource4(env_4, oldParent.ino == newParent.ino ? null : src.cache.lockSync(parents[1][0], "rw", parents[1][1]), false);
      src.fs.renameSync(src.path, dst.path);
      src.cache.rename(src.path, dst.path);
      emitChange(this, "rename", oldPath);
      emitChange(this, "rename", newPath);
    } catch (e_4) {
      env_4.error = e_4;
      env_4.hasError = true;
    } finally {
      __disposeResources4(env_4);
    }
  }
  function link(target, link5) {
    const env_5 = { stack: [], error: void 0, hasError: false };
    try {
      target = normalizePath.call(this, target);
      link5 = normalizePath.call(this, link5);
      const $ex = { syscall: "link", path: target, dest: link5 };
      const { fs, cache, path: resolved } = resolve2(this, target, true, $ex);
      const dst = resolve2(this, link5, true, $ex);
      if (fs.uuid !== dst.fs.uuid)
        throw UV("EXDEV", $ex);
      const stats = cache.statSync(resolved, $ex);
      if (checkAccess) {
        if (!hasAccess(this, stats, R_OK))
          throw UV("EACCES", $ex);
        const dirStats = cache.statSync(dirname(resolved), $ex);
        if (!hasAccess(this, dirStats, R_OK))
          throw UV("EACCES", $ex);
        const destStats = cache.statSync(dirname(dst.path), $ex);
        if (!hasAccess(this, destStats, W_OK))
          throw UV("EACCES", $ex);
      }
      const _ = __addDisposableResource4(env_5, cache.lockSync(dirname(dst.path), "rw"), false);
      fs.linkSync(resolved, dst.path);
      cache.link(resolved, dst.path);
    } catch (e_5) {
      env_5.error = e_5;
      env_5.hasError = true;
    } finally {
      __disposeResources4(env_5);
    }
  }
  function stat(path, lstat3) {
    path = normalizePath.call(this, path);
    const extra = { syscall: lstat3 ? "lstat" : "stat", path };
    let stats;
    if (!lstat3)
      stats = resolve2(this, path, false, extra).stats;
    else {
      const { base, dir } = parse(path);
      const parent = resolve2(this, dir, false, extra);
      if (parent.stats && isDirectory(parent.stats))
        assertSearchable(this, parent.stats, extra);
      const { root, mounts: mounts2 } = contextOf(this);
      const mounted = base && mounts2.get(join(root, parent.fullPath, base));
      const fs = mounted || parent.fs;
      const target = mounted ? "/" : join(parent.path, base);
      try {
        stats = cacheOf(fs).statSync(target);
      } catch (e) {
        setUVMessage(Object.assign(e, extra));
        throw e;
      }
    }
    if (!stats)
      throw UV("ENOENT", extra);
    return stats;
  }
  function _openMetadata($, path, syscall, noFollow) {
    const { fullPath, cache, path: resolved, stats } = resolve2($, path, noFollow, { syscall });
    if (!stats)
      throw UV("ENOENT", syscall, path);
    return new Handle($, fullPath, resolved, O_RDONLY, cache.ref(resolved, stats));
  }
  function chmod(path, mode, noFollow) {
    const env_6 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const numMode = normalizeMode(mode, -1);
      if (numMode < 0)
        throw UV("EINVAL", "chmod", path);
      const handle = __addDisposableResource4(env_6, _openMetadata(this, path, "chmod", noFollow), false);
      handle.chmodSync(numMode);
      emitChange(this, "change", handle.path);
    } catch (e_6) {
      env_6.error = e_6;
      env_6.hasError = true;
    } finally {
      __disposeResources4(env_6);
    }
  }
  function chown(path, uid, gid, noFollow) {
    const env_7 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const handle = __addDisposableResource4(env_7, _openMetadata(this, path, "chown", noFollow), false);
      handle.chownSync(uid, gid);
      emitChange(this, "change", handle.path);
    } catch (e_7) {
      env_7.error = e_7;
      env_7.hasError = true;
    } finally {
      __disposeResources4(env_7);
    }
  }
  function utimes(path, atime, mtime, noFollow) {
    const env_8 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const handle = __addDisposableResource4(env_8, _openMetadata(this, path, "utimes", noFollow), false);
      handle.utimesSync(normalizeTime(atime), normalizeTime(mtime));
      emitChange(this, "change", handle.path);
    } catch (e_8) {
      env_8.error = e_8;
      env_8.hasError = true;
    } finally {
      __disposeResources4(env_8);
    }
  }

  // node_modules/@zenfs/core/dist/node/dir.js
  var import_buffer4 = __toESM(require_buffer(), 1);
  var Dirent2 = class _Dirent {
    constructor() {
      __publicField(this, "ino");
      __publicField(this, "type");
      __publicField(this, "_name");
      /**
       * @internal @protected
       */
      __publicField(this, "_encoding");
      /**
       * @internal @protected
       */
      __publicField(this, "_parentPath");
    }
    get name() {
      const name = import_buffer4.Buffer.from(this._name);
      return this._encoding == "buffer" ? name : name.toString(this._encoding);
    }
    get parentPath() {
      return this._parentPath;
    }
    /**
     * `vfs.path` is relative to the directory that was read,
     * so `parentPath` is resolved against it— like Node does.
     * @internal
     */
    static from(vfs, encoding, parentPath = ".") {
      const dirent = new _Dirent();
      const { base, dir } = parse(vfs.path);
      dirent._parentPath = join(parentPath, dir);
      dirent._name = base;
      dirent.ino = vfs.ino;
      dirent.type = vfs.type;
      dirent._encoding = encoding;
      return dirent;
    }
    isFile() {
      return this.type === DirType.REG;
    }
    isDirectory() {
      return this.type === DirType.DIR;
    }
    isBlockDevice() {
      return this.type === DirType.BLK;
    }
    isCharacterDevice() {
      return this.type === DirType.CHR;
    }
    isSymbolicLink() {
      return this.type === DirType.LNK;
    }
    isFIFO() {
      return this.type === DirType.FIFO;
    }
    isSocket() {
      return this.type === DirType.SOCK;
    }
  };
  function dirClosed() {
    return Object.assign(new Error("Directory handle was closed"), { code: "ERR_DIR_CLOSED" });
  }
  var Dir = class {
    constructor(path, context, options = {}) {
      __publicField(this, "path");
      __publicField(this, "context");
      __publicField(this, "options");
      __publicField(this, "closed", false);
      __publicField(this, "_entries");
      this.path = path;
      this.context = context;
      this.options = options;
    }
    checkClosed() {
      if (this.closed)
        throw dirClosed();
    }
    close(cb) {
      const error2 = this.closed ? dirClosed() : null;
      this.closed = true;
      if (!cb)
        return error2 ? Promise.reject(error2) : Promise.resolve();
      queueMicrotask(() => cb(error2));
    }
    /**
     * Synchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    closeSync() {
      if (this.closed)
        throw dirClosed();
      this.closed = true;
    }
    async _read() {
      this.checkClosed();
      this._entries ?? (this._entries = await readdir2.call(this.context, this.path, {
        withFileTypes: true,
        recursive: this.options.recursive,
        encoding: this.options.encoding
      }));
      if (!this._entries.length)
        return null;
      return this._entries.shift() ?? null;
    }
    read(cb) {
      if (!cb) {
        return this._read();
      }
      this.checkClosed();
      this._read().then((value) => cb(null, value), (error2) => cb(error2));
    }
    /**
     * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
     * If there are no more directory entries to read, null will be returned.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    readSync() {
      this.checkClosed();
      this._entries ?? (this._entries = readdirSync.call(this.context, this.path, {
        withFileTypes: true,
        recursive: this.options.recursive,
        encoding: this.options.encoding
      }));
      if (!this._entries.length)
        return null;
      return this._entries.shift() ?? null;
    }
    async next() {
      const value = await this._read();
      if (value) {
        return { done: false, value };
      }
      await this.close();
      return { done: true, value: void 0 };
    }
    /**
     * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
     */
    [Symbol.asyncIterator]() {
      return this;
    }
    [Symbol.dispose]() {
      if (this.closed)
        return;
      this.closeSync();
    }
    async [Symbol.asyncDispose]() {
      if (this.closed)
        return;
      await this.close();
    }
  };

  // node_modules/@zenfs/core/dist/node/sync.js
  var __addDisposableResource5 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources5 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  function renameSync(oldPath, newPath) {
    return rename.call(this, oldPath, newPath);
  }
  function existsSync(path) {
    path = normalizePath.call(this, path);
    try {
      const { fs, path: resolvedPath } = resolve2(this, path);
      return fs.existsSync(resolvedPath);
    } catch (e) {
      if (e.errno == Errno.ENOENT || e.errno == Errno.ENOTDIR || e.errno == Errno.EACCES)
        return false;
      throw e;
    }
  }
  function statSync(path, options) {
    let stats;
    try {
      stats = stat.call(this, path, false);
    } catch (e) {
      if (options?.throwIfNoEntry === false && isNoEntry(e))
        return;
      throw e;
    }
    return options?.bigint ? new BigIntStats(stats) : new Stats(stats);
  }
  function lstatSync(path, options) {
    let stats;
    try {
      stats = stat.call(this, path, true);
    } catch (e) {
      if (options?.throwIfNoEntry === false && isNoEntry(e))
        return;
      throw e;
    }
    return options?.bigint ? new BigIntStats(stats) : new Stats(stats);
  }
  function truncateSync(path, len = 0) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
      const file = __addDisposableResource5(env_1, open(this, path, { flag: "r+" }), false);
      file.truncateSync(Math.max(0, len || 0));
    } catch (e_1) {
      env_1.error = e_1;
      env_1.hasError = true;
    } finally {
      __disposeResources5(env_1);
    }
  }
  function unlinkSync(path) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = resolve2(this, path, true, { syscall: "unlink", path });
    try {
      const env_2 = { stack: [], error: void 0, hasError: false };
      try {
        assertRemovable(this, cache.statSync(dirname(resolved)), cache.statSync(resolved));
        const _ = __addDisposableResource5(env_2, cache.lockSync(dirname(resolved), "rw"), false);
        fs.unlinkSync(resolved);
        cache.remove(resolved);
      } catch (e_2) {
        env_2.error = e_2;
        env_2.hasError = true;
      } finally {
        __disposeResources5(env_2);
      }
    } catch (e) {
      throw setUVMessage(Object.assign(e, { syscall: "unlink", path }));
    }
    emitChange(this, "rename", path.toString());
  }
  function openSync(path, flag, mode = F_OK) {
    return toFD(open(this, path, { flag: flag ?? "r", mode }));
  }
  function lopenSync(path, flag, mode) {
    return toFD(open(this, path, { flag, mode, preserveSymlinks: true }));
  }
  function readFileSync(path, _options = {}) {
    const env_3 = { stack: [], error: void 0, hasError: false };
    try {
      const options = normalizeOptions(_options, null, "r", 420);
      const flag = parse2(options.flag);
      if (flag & O_WRONLY)
        throw UV("EBADF", "read", path.toString());
      const opened = __addDisposableResource5(env_3, typeof path == "number" ? void 0 : open(this, path.toString(), { flag: options.flag, mode: 420, preserveSymlinks: false }), false);
      const file = opened ?? fromFD(this, path);
      const { size } = file.stat();
      const into = typeof _options == "object" && _options !== null ? _options.buffer : void 0;
      const buffer = into === void 0 ? import_buffer5.Buffer.alloc(size) : readFileBuffer(into, size);
      const data = buffer.subarray(0, file.readSync(buffer, 0, size, null));
      return options.encoding ? data.toString(options.encoding) : data;
    } catch (e_3) {
      env_3.error = e_3;
      env_3.hasError = true;
    } finally {
      __disposeResources5(env_3);
    }
  }
  function openAsBlobSync(path, options = {}) {
    const type = blobType(options);
    return new Blob([readFileSync.call(this, normalizePath.call(this, path), {})], { type });
  }
  function writeFileSync(path, data, _options = {}) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
      const options = normalizeOptions(_options, "utf8", "w+", 420);
      const flag = parse2(options.flag);
      if (!(flag & O_WRONLY || flag & O_RDWR)) {
        throw new Exception(Errno.EINVAL, "Flag passed to writeFile must allow for writing");
      }
      validateData(data);
      const encodedData = typeof data == "string" ? import_buffer5.Buffer.from(data, options.encoding) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      if (!encodedData) {
        throw new Exception(Errno.EINVAL, "Data not specified");
      }
      const opened = __addDisposableResource5(env_4, typeof path == "number" ? void 0 : open(this, path.toString(), { flag, mode: options.mode }), false);
      const file = opened ?? fromFD(this, path);
      file.writeSync(encodedData, 0, encodedData.byteLength);
      emitChange(this, "change", file.path);
    } catch (e_4) {
      env_4.error = e_4;
      env_4.hasError = true;
    } finally {
      __disposeResources5(env_4);
    }
  }
  function appendFileSync(filename, data, _options = {}) {
    const env_5 = { stack: [], error: void 0, hasError: false };
    try {
      const options = normalizeOptions(_options, "utf8", "a+", 420);
      const flag = parse2(options.flag);
      if (!(flag & O_APPEND)) {
        throw new Exception(Errno.EINVAL, "Flag passed to appendFile must allow for appending");
      }
      validateData(data);
      const encodedData = typeof data == "string" ? import_buffer5.Buffer.from(data, options.encoding) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const opened = __addDisposableResource5(env_5, typeof filename == "number" ? void 0 : open(this, normalizePath.call(this, filename), { flag, mode: options.mode }), false);
      const file = opened ?? fromFD(this, filename);
      file.writeSync(encodedData, 0, encodedData.byteLength);
      emitChange(this, "change", file.path);
    } catch (e_5) {
      env_5.error = e_5;
      env_5.hasError = true;
    } finally {
      __disposeResources5(env_5);
    }
  }
  function fstatSync(fd, options) {
    const stats = fromFD(this, fd).stat();
    return options?.bigint ? new BigIntStats(stats) : new Stats(stats);
  }
  function closeSync(fd) {
    fromFD(this, fd).closeSync();
    deleteFD(this, fd);
  }
  function ftruncateSync(fd, len = 0) {
    fromFD(this, fd).truncateSync(Math.max(0, len || 0));
  }
  function fsyncSync(fd) {
    fromFD(this, fd).syncSync();
  }
  function fdatasyncSync(fd) {
    fromFD(this, fd).datasyncSync();
  }
  function writeSync(fd, data, posOrOff, lenOrEnc, pos) {
    validateData(data, "buffer");
    let buffer, offset, length, position;
    if (typeof data === "string") {
      position = typeof posOrOff === "number" ? posOrOff : null;
      const encoding = typeof lenOrEnc === "string" ? lenOrEnc : "utf8";
      offset = 0;
      buffer = import_buffer5.Buffer.from(data, encoding);
      length = buffer.byteLength;
    } else if (typeof posOrOff == "object" && posOrOff !== null) {
      buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      offset = posOrOff.offset ?? 0;
      length = posOrOff.length ?? buffer.byteLength - offset;
      position = posOrOff.position ?? null;
    } else {
      buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      offset = posOrOff ?? 0;
      length = typeof lenOrEnc == "number" ? lenOrEnc : buffer.byteLength - offset;
      position = typeof pos === "number" ? pos : null;
    }
    const file = fromFD(this, fd);
    const bytesWritten = file.writeSync(buffer, offset, length, position);
    emitChange(this, "change", file.path);
    return bytesWritten;
  }
  function readSync(fd, buffer, options, length, position) {
    const file = fromFD(this, fd);
    const offset = typeof options == "object" ? options.offset : options;
    if (typeof options == "object") {
      length = options.length;
      position = options.position;
    }
    if (position && position > Number.MAX_SAFE_INTEGER)
      throw UV("EINVAL");
    if (typeof position == "bigint")
      position = Number(position);
    position = Number.isSafeInteger(position) ? position : null;
    if (length !== void 0)
      length |= 0;
    return file.readSync(buffer, offset, length, position);
  }
  function fchownSync(fd, uid, gid) {
    fromFD(this, fd).chownSync(uid, gid);
  }
  function fchmodSync(fd, mode) {
    const numMode = normalizeMode(mode, -1);
    if (numMode < 0) {
      throw new Exception(Errno.EINVAL, `Invalid mode.`);
    }
    fromFD(this, fd).chmodSync(numMode);
  }
  function futimesSync(fd, atime, mtime) {
    fromFD(this, fd).utimesSync(normalizeTime(atime), normalizeTime(mtime));
  }
  function rmdirSync(path) {
    const env_6 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const { fs, cache, path: resolved } = resolve2(this, path, true);
      const stats = cache.statSync(resolved, { path, syscall: "rmdir" });
      if (!isDirectory(stats))
        throw UV("ENOTDIR", "rmdir", path);
      assertRemovable(this, cache.statSync(dirname(resolved), { path, syscall: "rmdir" }), stats, { syscall: "rmdir", path });
      const _ = __addDisposableResource5(env_6, cache.lockSync(dirname(resolved), "rw"), false);
      wrap(fs, "rmdirSync", path)(resolved);
      cache.remove(resolved);
      emitChange(this, "rename", path.toString());
    } catch (e_6) {
      env_6.error = e_6;
      env_6.hasError = true;
    } finally {
      __disposeResources5(env_6);
    }
  }
  function mkdirSync(path, options) {
    options = typeof options === "object" ? options : { mode: options };
    const mode = normalizeMode(options?.mode, 511);
    return mkdir.call(this, path, { ...options, mode });
  }
  function readdirSync(path, options) {
    options = typeof options === "object" ? options : { encoding: options };
    path = normalizePath.call(this, path);
    const entries2 = [];
    const rawEntries = readdir.call(this, path, options ?? void 0);
    for (const raw of rawEntries) {
      if (options?.withFileTypes) {
        entries2.push(Dirent2.from(raw, options.encoding, path));
      } else if (options?.encoding == "buffer") {
        entries2.push(import_buffer5.Buffer.from(raw.path));
      } else {
        entries2.push(raw.path);
      }
    }
    return entries2;
  }
  function linkSync(targetPath, linkPath) {
    return link.call(this, targetPath, linkPath);
  }
  function symlinkSync(target, path, type = "file") {
    if (type != null && !["file", "dir", "junction"].includes(type))
      throw new TypeError("Invalid symlink type: " + type);
    path = normalizePath.call(this, path);
    target = normalizePath.call(this, target, true);
    try {
      const env_7 = { stack: [], error: void 0, hasError: false };
      try {
        const file = __addDisposableResource5(env_7, open(this, path, { flag: "wx", mode: 420, preserveSymlinks: true }), false);
        file.writeSync(encodeUTF8(target));
        file.chmodSync(S_IFLNK | 511);
      } catch (e_7) {
        env_7.error = e_7;
        env_7.hasError = true;
      } finally {
        __disposeResources5(env_7);
      }
    } catch (error2) {
      throw setUVMessage(Object.assign(error2, { syscall: "symlink", path: target, dest: path }));
    }
  }
  function readlinkSync(path, options) {
    const buf = import_buffer5.Buffer.from(readlink.call(this, path));
    const encoding = typeof options == "object" ? options?.encoding : options;
    if (encoding == "buffer") {
      return buf;
    }
    return buf.toString(encoding ?? "utf-8");
  }
  function chownSync(path, uid, gid) {
    chown.call(this, path, uid, gid);
  }
  function lchownSync(path, uid, gid) {
    chown.call(this, path, uid, gid, true);
  }
  function chmodSync(path, mode) {
    chmod.call(this, path, mode);
  }
  function lchmodSync(path, mode) {
    chmod.call(this, path, mode, true);
  }
  function utimesSync(path, atime, mtime) {
    utimes.call(this, path, atime, mtime);
  }
  function lutimesSync(path, atime, mtime) {
    utimes.call(this, path, atime, mtime, true);
  }
  function realpathSync(path, options) {
    const encoding = typeof options == "string" ? options : options?.encoding ?? "utf8";
    path = normalizePath.call(this, path, true);
    const { fullPath } = resolve2(this, path);
    if (encoding == "utf8" || encoding == "utf-8")
      return fullPath;
    const buf = import_buffer5.Buffer.from(fullPath, "utf-8");
    if (encoding == "buffer")
      return buf;
    return buf.toString(encoding);
  }
  realpathSync.native = realpathSync;
  function accessSync(path, mode = 384) {
    if (!checkAccess)
      return;
    if (!hasAccess(this, statSync.call(this, path), mode)) {
      throw new Exception(Errno.EACCES);
    }
  }
  function rmSync(path, options) {
    path = normalizePath.call(this, path);
    let stats;
    try {
      stats = lstatSync.call(this, path);
    } catch (error2) {
      if (error2.code != "ENOENT" || !options?.force)
        throw error2;
    }
    if (!stats)
      return;
    switch (stats.mode & S_IFMT) {
      case S_IFDIR:
        if (!options?.recursive)
          throw rmDirectoryError(path);
        for (const entry of readdirSync.call(this, path)) {
          rmSync.call(this, join(path, entry), options);
        }
        rmdirSync.call(this, path);
        break;
      case S_IFREG:
      case S_IFLNK:
      case S_IFBLK:
      case S_IFCHR:
        unlinkSync.call(this, path);
        break;
      case S_IFIFO:
      case S_IFSOCK:
      default:
        throw UV("ENOSYS", "rm", path);
    }
  }
  function mkdtempSync(prefix, options) {
    const path = tempDirName(prefix);
    mkdirSync.call(this, path);
    return tempResult(path, prefix, options);
  }
  function mkstempSync(prefix, options) {
    const path = tempFileName(prefix);
    try {
      return { path: tempResult(path, prefix, options), fd: openSync.call(this, path, "wx+", 384) };
    } catch (error2) {
      throw mkstempError(error2, prefix);
    }
  }
  function mkdtempDisposableSync(prefix, options) {
    const path = tempDirName(prefix);
    mkdirSync.call(this, path);
    const remove2 = () => rmSync(path, { recursive: true, force: true });
    return { path, remove: remove2, [Symbol.dispose]: remove2 };
  }
  function copyFileSync(source, destination, flags) {
    source = normalizePath.call(this, source);
    destination = normalizePath.call(this, destination);
    if (flags && flags & COPYFILE_EXCL && existsSync.call(this, destination))
      throw UV("EEXIST", "copyFile", destination);
    writeFileSync.call(this, destination, readFileSync.call(this, source, {}));
    emitChange(this, "rename", destination.toString());
  }
  function readvSync(fd, buffers, position) {
    const file = fromFD(this, fd);
    let bytesRead = 0;
    for (const buffer of buffers) {
      bytesRead += file.readSync(buffer, 0, buffer.byteLength, typeof position == "number" ? position + bytesRead : null);
    }
    return bytesRead;
  }
  function writevSync(fd, buffers, position) {
    const file = fromFD(this, fd);
    let bytesWritten = 0;
    for (const buffer of buffers) {
      bytesWritten += file.writeSync(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength), 0, buffer.byteLength, typeof position == "number" ? position + bytesWritten : null);
    }
    return bytesWritten;
  }
  function opendirSync(path, options) {
    path = normalizePath.call(this, path);
    return new Dir(path, this, options);
  }
  function cpSync(source, destination, opts) {
    source = normalizePath.call(this, source);
    destination = normalizePath.call(this, destination);
    if (opts?.filter) {
      const shouldCopy = opts.filter(source, destination);
      if (shouldCopy instanceof Promise)
        throw Object.assign(new TypeError('Expected boolean to be returned from the "filter" function but got an instance of Promise.'), {
          code: "ERR_INVALID_RETURN_VALUE"
        });
      if (!shouldCopy)
        return;
    }
    const statFn = opts?.dereference ? statSync : lstatSync;
    const srcStats = statFn.call(this, source);
    const destStats = statFn.call(this, destination, { throwIfNoEntry: false });
    const sameFileSystem = resolveMount(source, this).fs.uuid == resolveMount(destination, this).fs.uuid;
    cpCheckPaths(source, destination, sameFileSystem, srcStats, destStats);
    if (opts?.errorOnExist && opts.force === false && destStats)
      throw cpError("ERR_FS_CP_EEXIST", "EEXIST", `${destination} already exists`, destination);
    switch (srcStats.mode & S_IFMT) {
      case S_IFDIR: {
        if (!opts?.recursive)
          throw cpError("ERR_FS_EISDIR", "EISDIR", `${source} is a directory (not copied)`, source);
        const created = mkdirSync.call(this, destination, { recursive: true });
        for (const dirent of readdirSync.call(this, source, { withFileTypes: true })) {
          cpSync.call(this, join(source, dirent.name), join(destination, dirent.name), opts);
        }
        if (created !== void 0)
          chmodSync.call(this, destination, srcStats.mode & 4095);
        break;
      }
      case S_IFLNK: {
        const link5 = readlinkSync.call(this, source, "utf8");
        if (destStats?.isSymbolicLink())
          unlinkSync.call(this, destination);
        symlinkSync.call(this, opts?.verbatimSymlinks ? link5 : resolve.call(this, dirname(source), link5), destination);
        break;
      }
      case S_IFREG: {
        if (destStats && opts?.force === false)
          return;
        if (destStats)
          unlinkSync.call(this, destination);
        copyFileSync.call(this, source, destination, opts?.mode);
        break;
      }
      case S_IFBLK:
      case S_IFCHR:
        throw UV("ENOSYS", "cp", source);
      default:
        throw cpSpecialFileError(srcStats, destination);
    }
    if (opts?.preserveTimestamps) {
      utimesSync.call(this, destination, srcStats.atime, srcStats.mtime);
    }
  }
  function statfsSync(path, options) {
    path = normalizePath.call(this, path);
    const { fs } = resolve2(this, path);
    return _statfs(fs, options?.bigint);
  }
  function globSync(pattern2, options = {}) {
    pattern2 = Array.isArray(pattern2) ? pattern2 : [pattern2];
    const $ = contextOf(this);
    const { cwd = $.pwd, withFileTypes = false, exclude = () => false, followSymlinks = false, maxDepth = Infinity } = options;
    validateMaxDepth(maxDepth);
    const base = resolve.call($, cwd instanceof URL ? cwd.pathname : cwd);
    const normalizedPatterns = pattern2.map((p) => p.startsWith("/") ? relative.call($, base, p) : p);
    function shouldDescend(path, relativePath) {
      const descent = _globDescent(normalizedPatterns, relativePath);
      if (!descent)
        return false;
      try {
        const stats = lstatSync.call($, path);
        if (!stats.isSymbolicLink())
          return stats.isDirectory();
        return (followSymlinks || descent == "literal") && statSync.call($, path).isDirectory();
      } catch {
        return false;
      }
    }
    const results = [];
    function recursiveList(dir, depth = 1) {
      if (depth > maxDepth)
        return;
      let entries2;
      try {
        entries2 = readdirSync.call($, dir, { withFileTypes, encoding: "utf8" });
      } catch {
        return;
      }
      for (const entry of entries2) {
        const fullPath = join(dir, withFileTypes ? entry.name : entry);
        const relPath = relative.call($, base, fullPath);
        if (typeof exclude != "function" ? exclude.some((p) => matchesGlob(relPath, p)) : exclude(withFileTypes ? entry : relPath))
          continue;
        if (depth < maxDepth && shouldDescend(fullPath, relPath))
          recursiveList(fullPath, depth + 1);
        if (normalizedPatterns.some((pattern3) => matchesGlob(relPath, pattern3))) {
          results.push(withFileTypes ? entry : relPath);
        }
      }
    }
    recursiveList(base);
    return results;
  }

  // node_modules/@zenfs/core/dist/vfs/watchers.js
  var _statSync = statSync;
  var Watcher = class extends import_index.default {
    constructor(_context, path) {
      super();
      __publicField(this, "_context");
      __publicField(this, "path");
      this._context = _context;
      this.path = path;
    }
    off(event, fn, context, once2) {
      return super.off(event, fn, context, once2);
    }
    removeListener(event, fn, context, once2) {
      return super.removeListener(event, fn, context, once2);
    }
    setMaxListeners() {
      throw UV("ENOSYS", "Watcher.setMaxListeners");
    }
    getMaxListeners() {
      throw UV("ENOSYS", "Watcher.getMaxListeners");
    }
    prependListener() {
      throw UV("ENOSYS", "Watcher.prependListener");
    }
    prependOnceListener() {
      throw UV("ENOSYS", "Watcher.prependOnceListener");
    }
    rawListeners() {
      throw UV("ENOSYS", "Watcher.rawListeners");
    }
    ref() {
      return this;
    }
    unref() {
      return this;
    }
  };
  function createIgnoreMatcher(ignore) {
    if (ignore == null)
      return () => false;
    const isArray = Array.isArray(ignore);
    const matchers = isArray ? ignore : [ignore];
    const compiled = matchers.map((matcher, i) => {
      const name = isArray ? `options.ignore[${i}]` : "options.ignore";
      validateType(matcher, name, "string", "function", "RegExp");
      if (typeof matcher == "function")
        return matcher;
      if (matcher instanceof RegExp)
        return (filename) => matcher.test(filename);
      if (!matcher.length)
        throw invalidArgumentValue(name, matcher, "must be a non-empty string");
      return (filename) => matchesGlob(matcher.includes("/") ? filename : basename(filename), matcher);
    });
    return (filename) => compiled.some((matches) => matches(filename));
  }
  var FSWatcher = class extends Watcher {
    constructor(context, path, options) {
      const $ = contextOf(context);
      super($, path);
      __publicField(this, "options");
      __publicField(this, "realpath");
      __publicField(this, "closed", false);
      /** @internal */
      __publicField(this, "ignores");
      this.options = options;
      try {
        _statSync.call(this._context, path);
      } catch (error2) {
        if (error2 instanceof Exception)
          throw setUVMessage(Object.assign(error2, { syscall: "watch", path, filename: path }));
        throw error2;
      }
      this.ignores = createIgnoreMatcher(options.ignore);
      this.realpath = join($.root, path);
      addWatcher(this.realpath, this);
      const { signal } = options;
      if (signal?.aborted)
        queueMicrotask(() => this.close());
      else
        signal?.addEventListener("abort", () => this.close(), { once: true });
    }
    close() {
      if (this.closed)
        return;
      this.closed = true;
      removeWatcher(this.realpath, this);
      queueMicrotask(() => super.emit("close"));
    }
    [Symbol.dispose]() {
      this.close();
    }
  };
  var StatWatcher = class extends Watcher {
    constructor(context, path, options) {
      super(context, path);
      __publicField(this, "options");
      __publicField(this, "intervalId");
      __publicField(this, "previous");
      this.options = options;
      this.start();
    }
    stat() {
      return statSync.call(this._context, this.path, { bigint: this.options.bigint });
    }
    onInterval() {
      try {
        const current = this.stat();
        if (!isStatsEqual(this.previous, current)) {
          this.emit("change", current, this.previous);
          this.previous = current;
        }
      } catch (e) {
        this.emit("error", e);
      }
    }
    ref() {
      if (typeof this.intervalId == "object")
        this.intervalId.ref();
      return this;
    }
    unref() {
      if (typeof this.intervalId == "object")
        this.intervalId.unref();
      return this;
    }
    start() {
      const interval = this.options.interval || 5e3;
      try {
        this.previous = this.stat();
      } catch (e) {
        this.emit("error", e);
        return;
      }
      this.intervalId = setInterval(this.onInterval.bind(this), interval);
      if (!this.options.persistent && typeof this.intervalId == "object") {
        this.intervalId.unref();
      }
    }
    /**
     * Stops polling, emitting `stop` asynchronously.
     * @internal
     */
    stop() {
      if (!this.intervalId)
        return;
      clearInterval(this.intervalId);
      this.intervalId = void 0;
      queueMicrotask(() => this.emit("stop"));
    }
  };
  var watchers = /* @__PURE__ */ new Map();
  function addWatcher(path, watcher) {
    const normalizedPath = normalizePath(path);
    watchers.getOrInsertComputed(normalizedPath, () => /* @__PURE__ */ new Set()).add(watcher);
  }
  function removeWatcher(path, watcher) {
    const normalizedPath = normalizePath(path);
    if (watchers.has(normalizedPath)) {
      watchers.get(normalizedPath).delete(watcher);
      if (watchers.get(normalizedPath).size === 0) {
        watchers.delete(normalizedPath);
      }
    }
  }
  function emitChange(context, eventType, filename) {
    const $ = contextOf(context);
    if ($)
      filename = join($.root ?? "/", filename);
    filename = normalizePath.call(context, filename);
    for (let path = filename; ; path = dirname(path)) {
      const watchersForPath = watchers.get(path);
      const isNested = path != filename && path != dirname(filename);
      if (watchersForPath) {
        for (const watcher of watchersForPath) {
          if (isNested && !watcher.options.recursive)
            continue;
          const name = relative.call(watcher._context, path, filename) || basename(filename);
          if (watcher.ignores(name))
            continue;
          watcher.emit("change", eventType, name);
        }
      }
      if (path === "/")
        break;
    }
  }

  // node_modules/@zenfs/core/dist/vfs/async.js
  var __addDisposableResource6 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources6 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  async function resolve3($, path, preserveSymlinks, extra) {
    path = resolve.call($, path);
    if (!resolveFullWalk)
      try {
        const resolved2 = resolveMount(path, $);
        const stats2 = await resolved2.cache.stat(resolved2.path);
        if (!isSymbolicLink(stats2) || preserveSymlinks) {
          return { ...resolved2, fullPath: path, stats: stats2 };
        }
        const target2 = resolve.call($, dirname(path), await readlink2.call($, path));
        return await resolve3($, target2, preserveSymlinks, extra);
      } catch {
      }
    const { base, dir } = parse(path);
    const $ex = { syscall: "stat", path, ...extra };
    let realDir = "/";
    if (dir != "/") {
      const parent = await resolve3($, dir, false, extra);
      if (parent.stats && isDirectory(parent.stats))
        assertSearchable($, parent.stats, $ex);
      realDir = parent.fullPath;
    } else if (base && checkAccess) {
      const root = resolveMount("/", $);
      assertSearchable($, await root.cache.stat(root.path), $ex);
    }
    const maybePath = join(realDir, base);
    const resolved = resolveMount(maybePath, $);
    const stats = await resolved.cache.stat(resolved.path).catch((e) => {
      if (e.code == "ENOENT")
        return;
      throw setUVMessage(Object.assign(e, { syscall: "stat", path: maybePath, ...extra }));
    });
    if (!stats)
      return { ...resolved, fullPath: maybePath };
    if (!isSymbolicLink(stats) || preserveSymlinks) {
      return { ...resolved, fullPath: maybePath, stats };
    }
    const target = resolve.call($, realDir, await readlink2.call($, maybePath));
    return await resolve3($, target, false, extra);
  }
  async function open2($, path, opt) {
    path = normalizePath.call($, path);
    const mode = normalizeMode(opt.mode, 420), flag = parse2(opt.flag);
    const $ex = { syscall: "open", path };
    let { fs, cache, path: resolved, stats } = await resolve3($, path, opt.preserveSymlinks, $ex);
    if (!stats) {
      const env_1 = { stack: [], error: void 0, hasError: false };
      try {
        if (!(flag & O_CREAT))
          throw UV("ENOENT", $ex);
        const parentPath = dirname(resolved);
        const parentStats = await cache.stat(parentPath, $ex);
        if (checkAccess && !hasAccess($, parentStats, W_OK | X_OK))
          throw UV("EACCES", "open", dirname(path));
        if (!isDirectory(parentStats))
          throw UV("ENOTDIR", "open", dirname(path));
        if (!opt.allowDirectory && isDirectory({ mode }))
          throw UV("EISDIR", "open", path);
        const _ = __addDisposableResource6(env_1, await cache.lock(parentPath, "rw", parentStats), false);
        stats = await cache.stat(resolved).catch(() => void 0);
        if (!stats) {
          const { euid: uid, egid: gid } = contextOf($).credentials;
          const inode = await fs.createFile(resolved, {
            mode: applyUmask($, mode),
            uid: parentStats.mode & S_ISUID ? parentStats.uid : uid,
            gid: parentStats.mode & S_ISGID ? parentStats.gid : gid
          });
          emitChange($, "rename", path);
          return new Handle($, path, resolved, flag, cache.ref(resolved, inode));
        }
      } catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
      } finally {
        __disposeResources6(env_1);
      }
    }
    if (checkAccess && !hasAccess($, stats, toMode(flag)))
      throw UV("EACCES", $ex);
    if (flag & O_EXCL)
      throw UV("EEXIST", $ex);
    if (!opt.allowDirectory && isDirectory(stats))
      throw UV("EISDIR", "open", path);
    const handle = new Handle($, path, resolved, flag, cache.ref(resolved, stats));
    if (flag & O_TRUNC)
      await handle.truncate(0);
    return handle;
  }
  async function readlink2(path) {
    path = normalizePath.call(this, path);
    const $ex = { syscall: "readlink", path };
    const { fs, stats, path: resolved } = await resolve3(this, path, true, $ex);
    if (!stats)
      throw UV("ENOENT", $ex);
    if (checkAccess && !hasAccess(this, stats, R_OK))
      throw UV("EACCES", $ex);
    if (!isSymbolicLink(stats))
      throw UV("EINVAL", $ex);
    const size = stats.size;
    const data = new Uint8Array(size);
    await fs.read(resolved, data, 0, size);
    return decodeUTF8(data);
  }
  async function mkdir2(path, options = {}) {
    const original = normalizePath.call(this, path);
    const { euid: uid, egid: gid } = contextOf(this).credentials;
    const { recursive } = options;
    const mode = applyUmask(this, options.mode ?? 511);
    const $ex = { syscall: "mkdir", path: original };
    const { fullPath: realParent } = await resolve3(this, dirname(original), false, $ex);
    const { fs, cache, path: target } = resolveMount(join(realParent, basename(original)), this, $ex);
    const followed = realParent != dirname(original);
    let firstCreated;
    const __create2 = async (path2, resolved) => {
      const env_2 = { stack: [], error: void 0, hasError: false };
      try {
        const parentPath = dirname(resolved);
        const parent = recursive && parentPath != "/" ? await __create2(dirname(path2), parentPath) : await cache.stat(parentPath, $ex);
        const _ = __addDisposableResource6(env_2, await cache.lock(parentPath, "rw", parent), false);
        if (recursive) {
          const existing = await cache.stat(resolved).catch(() => null);
          if (existing) {
            const stats = isSymbolicLink(existing) ? (await resolve3(this, path2, false, $ex)).stats : existing;
            if (!stats)
              throw UV("ENOENT", $ex);
            if (!isDirectory(stats))
              throw UV(resolved == target ? "EEXIST" : "ENOTDIR", $ex);
            return existing;
          }
          if (followed && await fs.exists(join(parentPath, basename(path2))))
            throw UV("ENOTDIR", "mkdir", path2);
        }
        if (checkAccess && !hasAccess(this, parent, W_OK | X_OK))
          throw UV("EACCES", "mkdir", path2);
        const inode = await fs.mkdir(resolved, {
          mode,
          uid: parent.mode & S_ISUID ? parent.uid : uid,
          gid: parent.mode & S_ISGID ? parent.gid : gid
        }).catch(rethrow({ syscall: "mkdir", path: path2 }));
        if (recursive)
          firstCreated ?? (firstCreated = path2);
        emitChange(this, "rename", path2);
        return inode;
      } catch (e_2) {
        env_2.error = e_2;
        env_2.hasError = true;
      } finally {
        __disposeResources6(env_2);
      }
    };
    await __create2(original, target);
    return firstCreated;
  }
  async function readdir3(path, options = {}) {
    path = normalizePath.call(this, path);
    const $ex = { syscall: "scandir", path };
    const { fs, cache, path: resolved, stats } = await resolve3(this, path, false, $ex);
    if (!stats)
      throw UV("ENOENT", $ex);
    if (checkAccess && !hasAccess(this, stats, R_OK))
      throw UV("EACCES", $ex);
    if (!isDirectory(stats))
      throw UV("ENOTDIR", $ex);
    let entries2;
    {
      const env_3 = { stack: [], error: void 0, hasError: false };
      try {
        const _ = __addDisposableResource6(env_3, await cache.lock(resolved, "ro", stats), false);
        entries2 = await fs.readdir(resolved);
      } catch (e_3) {
        env_3.error = e_3;
        env_3.hasError = true;
      } finally {
        __disposeResources6(env_3);
      }
    }
    const values = [];
    const addEntry = async (entry) => {
      const entryStats = await cache.stat(join(resolved, entry), $ex).catch((e) => {
        if (e.code == "ENOENT")
          return;
        throw e;
      });
      if (!entryStats)
        return;
      const ent = new Dirent();
      ent.ino = entryStats.ino;
      ent.type = ifToDt(entryStats.mode);
      ent.path = entry;
      ent.name = basename(entry);
      values.push(ent);
      if (!options.recursive || !isDirectory(entryStats))
        return;
      const children = await fs.readdir(join(resolved, entry));
      for (const child of children)
        await addEntry(join(entry, child));
    };
    await Promise.all(entries2.map(addEntry));
    return values;
  }
  async function rename2(oldPath, newPath) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
      oldPath = normalizePath.call(this, oldPath);
      newPath = normalizePath.call(this, newPath);
      const $ex = { syscall: "rename", path: oldPath, dest: newPath };
      const src = await resolve3(this, oldPath, true, $ex);
      const dst = await resolve3(this, newPath, true, $ex);
      if (src.fs.uuid !== dst.fs.uuid)
        throw UV("EXDEV", $ex);
      if (dst.path.startsWith(src.path + "/"))
        throw UV("EINVAL", $ex);
      if (!src.stats)
        throw UV("ENOENT", $ex);
      const srcDir = dirname(src.path);
      const dstDir = dirname(dst.path);
      const oldParent = await src.cache.stat(srcDir, $ex);
      const newParent = await src.cache.stat(dstDir, $ex);
      const newStats = await src.cache.stat(dst.path, $ex).catch((e) => {
        if (e.code == "ENOENT")
          return null;
        throw e;
      });
      assertRemovable(this, oldParent, src.stats, $ex);
      if (newStats)
        assertRemovable(this, newParent, newStats, $ex);
      if (checkAccess && !hasAccess(this, newParent, W_OK | X_OK))
        throw UV("EACCES", $ex);
      if (checkAccess && isDirectory(src.stats) && srcDir != dstDir && !hasAccess(this, src.stats, W_OK))
        throw UV("EACCES", $ex);
      if (newStats && !isDirectory(src.stats) && isDirectory(newStats))
        throw UV("EISDIR", $ex);
      if (newStats && isDirectory(src.stats) && !isDirectory(newStats))
        throw UV("ENOTDIR", $ex);
      const parents = [
        [srcDir, oldParent],
        [dstDir, newParent]
      ];
      if (oldParent.ino > newParent.ino)
        parents.reverse();
      const _first = __addDisposableResource6(env_4, await src.cache.lock(parents[0][0], "rw", parents[0][1]), false);
      const _second = __addDisposableResource6(env_4, oldParent.ino == newParent.ino ? null : await src.cache.lock(parents[1][0], "rw", parents[1][1]), false);
      await src.fs.rename(src.path, dst.path);
      src.cache.rename(src.path, dst.path);
      emitChange(this, "rename", oldPath);
      emitChange(this, "rename", newPath);
    } catch (e_4) {
      env_4.error = e_4;
      env_4.hasError = true;
    } finally {
      __disposeResources6(env_4);
    }
  }
  async function link2(target, link5) {
    const env_5 = { stack: [], error: void 0, hasError: false };
    try {
      target = normalizePath.call(this, target);
      link5 = normalizePath.call(this, link5);
      const $ex = { syscall: "link", path: target, dest: link5 };
      const { fs, cache, path: resolved } = await resolve3(this, target, true, $ex);
      const dst = await resolve3(this, link5, true, $ex);
      if (fs.uuid != dst.fs.uuid)
        throw UV("EXDEV", $ex);
      const stats = await cache.stat(resolved, $ex);
      if (checkAccess) {
        if (!hasAccess(this, stats, R_OK))
          throw UV("EACCES", $ex);
        const dirStats = await cache.stat(dirname(resolved), $ex);
        if (!hasAccess(this, dirStats, R_OK))
          throw UV("EACCES", $ex);
        const destStats = await cache.stat(dirname(dst.path), $ex);
        if (!hasAccess(this, destStats, W_OK))
          throw UV("EACCES", $ex);
      }
      const _ = __addDisposableResource6(env_5, await cache.lock(dirname(dst.path), "rw"), false);
      await fs.link(resolved, dst.path);
      cache.link(resolved, dst.path);
    } catch (e_5) {
      env_5.error = e_5;
      env_5.hasError = true;
    } finally {
      __disposeResources6(env_5);
    }
  }
  async function stat2(path, lstat3) {
    path = normalizePath.call(this, path);
    const extra = { syscall: lstat3 ? "lstat" : "stat", path };
    let stats;
    if (!lstat3)
      stats = (await resolve3(this, path, false, extra)).stats;
    else {
      const { base, dir } = parse(path);
      const parent = await resolve3(this, dir, false, extra);
      if (parent.stats && isDirectory(parent.stats))
        assertSearchable(this, parent.stats, extra);
      const { root, mounts: mounts2 } = contextOf(this);
      const mounted = base && mounts2.get(join(root, parent.fullPath, base));
      const fs = mounted || parent.fs;
      const target = mounted ? "/" : join(parent.path, base);
      stats = await cacheOf(fs).stat(target).catch(rethrow(extra));
    }
    if (!stats)
      throw UV("ENOENT", extra);
    return stats;
  }
  async function _openMetadata2($, path, syscall, noFollow) {
    const { fullPath, cache, path: resolved, stats } = await resolve3($, path, noFollow, { syscall });
    if (!stats)
      throw UV("ENOENT", syscall, path);
    return new Handle($, fullPath, resolved, O_RDONLY, cache.ref(resolved, stats));
  }
  async function chmod2(path, mode, noFollow) {
    const env_6 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const numMode = normalizeMode(mode, -1);
      if (numMode < 0)
        throw UV("EINVAL", "chmod", path);
      const handle = __addDisposableResource6(env_6, await _openMetadata2(this, path, "chmod", noFollow), true);
      await handle.chmod(numMode);
      emitChange(this, "change", handle.path);
    } catch (e_6) {
      env_6.error = e_6;
      env_6.hasError = true;
    } finally {
      const result_1 = __disposeResources6(env_6);
      if (result_1)
        await result_1;
    }
  }
  async function chown2(path, uid, gid, noFollow) {
    const env_7 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const handle = __addDisposableResource6(env_7, await _openMetadata2(this, path, "chown", noFollow), true);
      await handle.chown(uid, gid);
      emitChange(this, "change", handle.path);
    } catch (e_7) {
      env_7.error = e_7;
      env_7.hasError = true;
    } finally {
      const result_2 = __disposeResources6(env_7);
      if (result_2)
        await result_2;
    }
  }
  async function utimes2(path, atime, mtime, noFollow) {
    const env_8 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const handle = __addDisposableResource6(env_8, await _openMetadata2(this, path, "utimes", noFollow), true);
      await handle.utimes(normalizeTime(atime), normalizeTime(mtime));
      emitChange(this, "change", handle.path);
    } catch (e_8) {
      env_8.error = e_8;
      env_8.hasError = true;
    } finally {
      const result_3 = __disposeResources6(env_8);
      if (result_3)
        await result_3;
    }
  }

  // node_modules/@zenfs/core/dist/node/readline.js
  var Interface = class extends import_index.default {
    constructor(input, output2, completer, terminal = false) {
      super();
      __publicField(this, "input");
      __publicField(this, "output");
      __publicField(this, "terminal");
      __publicField(this, "line", "");
      __publicField(this, "_cursor", 0);
      __publicField(this, "_buffer", "");
      __publicField(this, "_closed", false);
      __publicField(this, "_paused", false);
      __publicField(this, "_prompt", "");
      __publicField(this, "_history", []);
      __publicField(this, "_historyIndex", -1);
      __publicField(this, "_currentLine", "");
      __publicField(this, "_onData", (data) => {
        if (this._paused || this._closed)
          return;
        this._buffer += typeof data === "string" ? data : data.toString("utf8");
        for (let lineEnd = this._buffer.indexOf("\n"); lineEnd >= 0; lineEnd = this._buffer.indexOf("\n")) {
          let line = this._buffer.substring(0, lineEnd);
          if (line.endsWith("\r")) {
            line = line.substring(0, line.length - 1);
          }
          this._buffer = this._buffer.substring(lineEnd + 1);
          this.line = line;
          if (line.trim() && !line.trim().match(/^\s*$/) && this._history.at(-1) != line) {
            this._history.push(line);
            this._historyIndex = this._history.length;
            this.emit("history", this._history);
          }
          this.emit("line", line);
        }
      });
      this.input = input;
      this.output = output2;
      this.terminal = terminal;
      this.input.on("data", this._onData);
      this.input.on("end", this.close.bind(this));
      this.input.on("close", this.close.bind(this));
    }
    get cursor() {
      return this._cursor;
    }
    /**
     * Closes the interface and removes all event listeners
     */
    close() {
      if (this._closed)
        return;
      this._closed = true;
      this.input?.removeAllListeners?.();
      if (this._buffer.length) {
        const line = this._buffer;
        this._buffer = "";
        this.line = line;
        this.emit("line", line);
      }
      this.emit("history", this._history);
      this.emit("close");
      this.removeAllListeners();
    }
    /**
     * Pauses the input stream
     */
    pause() {
      if (this._paused)
        return this;
      this._paused = true;
      if ("pause" in this.input)
        this.input.pause();
      this.emit("pause");
      return this;
    }
    /**
     * Resumes the input stream
     */
    resume() {
      if (!this._paused)
        return this;
      this._paused = false;
      if ("resume" in this.input)
        this.input.resume();
      this.emit("resume");
      return this;
    }
    /**
     * Sets the prompt text
     */
    setPrompt(prompt) {
      this._prompt = prompt;
    }
    /**
     * Gets the current prompt text
     */
    getPrompt() {
      return this._prompt;
    }
    /**
     * Displays the prompt to the user
     */
    prompt(preserveCursor) {
      if (!this.output)
        return;
      if (!preserveCursor) {
        this.output.write(this._prompt);
        return;
      }
      const { cols } = this.getCursorPos();
      this.output.write(this._prompt);
      this._cursor = cols;
    }
    /**
     * Writes data to the interface and handles key events
     */
    write(data, key) {
      if (this._closed)
        return;
      if (data) {
        const str = typeof data === "string" ? data : data.toString("utf8");
        this._onData(str);
      }
      if (!key || !this.terminal)
        return;
      switch ((key.ctrl ? "^" : "") + key.name) {
        case "^c":
          this.emit("SIGINT");
          break;
        case "^z":
          this.emit("SIGTSTP");
          break;
        case "^q":
          this.emit("SIGCONT");
          break;
        case "home":
        case "^a":
          if (!this.output)
            return;
          moveCursor(this.output, -this._cursor, 0);
          this._cursor = 0;
          this._cursor = 0;
          break;
        case "^e":
        case "end": {
          if (!this.output)
            return;
          const dx = this.line.length - this._cursor;
          if (!dx)
            return;
          moveCursor(this.output, dx, 0);
          this._cursor = this.line.length;
          this._cursor = this.line.length;
          break;
        }
        case "^k": {
          if (!this.output)
            return;
          if (this._cursor >= this.line.length)
            return;
          const newLine = this.line.slice(0, this._cursor);
          clearLine(this.output, 1);
          this.line = newLine;
          break;
        }
        case "^u": {
          if (!this.output || !this._cursor)
            return;
          const newLine = this.line.slice(this._cursor);
          clearLine(this.output, 0);
          moveCursor(this.output, 0, 0);
          this.output.write(this._prompt + newLine);
          this.line = newLine;
          this._cursor = 0;
          this._cursor = 0;
          break;
        }
        case "^w": {
          if (!this.output || !this._cursor)
            return;
          let i = this._cursor - 1;
          while (i >= 0 && this.line[i] === " ")
            i--;
          while (i >= 0 && this.line[i] !== " ")
            i--;
          const newLine = this.line.slice(0, i + 1) + this.line.slice(this._cursor);
          const newCursorPos = i + 1;
          this._renderLine(newLine);
          this._cursor = newCursorPos;
          this._cursor = newCursorPos;
          moveCursor(this.output, -newLine.length, 0);
          moveCursor(this.output, newCursorPos, 0);
          break;
        }
        case "^return":
        case "^enter":
          this._onData("\n");
          break;
        case "return":
        case "enter":
          this._onData((!data ? "" : typeof data == "string" ? data : data.toString("utf8")) + "\n");
          break;
        case "up":
        case "down": {
          if (!this.output || !this._history.length)
            return;
          if (this._historyIndex === this._history.length) {
            this._currentLine = this.line || "";
          }
          if (key.name == "up" && this._historyIndex > 0) {
            this._historyIndex--;
          } else if (key.name == "down" && this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
          } else if (key.name == "down" && this._historyIndex == this._history.length - 1) {
            this._historyIndex = this._history.length;
            this._renderLine(this._currentLine);
            return;
          } else {
            return;
          }
          const historyItem = this._history[this._historyIndex];
          this._renderLine(historyItem);
          break;
        }
        case "left":
        case "right": {
          const dx = key.name == "left" ? -1 : 1;
          if (!this.output)
            return;
          const newPos = Math.max(0, Math.min(this.line.length, this._cursor + dx));
          if (newPos == this._cursor)
            return;
          moveCursor(this.output, dx, 0);
          this._cursor = newPos;
          this._cursor = newPos;
          break;
        }
        case "backspace": {
          if (!this.output || !this._cursor)
            return;
          const newLine = this.line.slice(0, this._cursor - 1) + this.line.slice(this._cursor);
          this._renderLine(newLine);
          this._cursor = --this._cursor;
          if (this._cursor > 0) {
            moveCursor(this.output, -this._cursor, 0);
            moveCursor(this.output, this._cursor, 0);
          }
          break;
        }
        case "delete": {
          if (!this.output)
            return;
          if (this._cursor >= this.line.length)
            return;
          const newLine = this.line.slice(0, this._cursor) + this.line.slice(this._cursor + 1);
          clearLine(this.output, 0);
          moveCursor(this.output, 0, 0);
          this.output.write(this._prompt + newLine);
          this.line = newLine;
          moveCursor(this.output, -newLine.length, 0);
          moveCursor(this.output, this._cursor, 0);
          break;
        }
      }
    }
    _renderLine(text) {
      if (!this.output)
        return;
      clearLine(this.output, 0);
      moveCursor(this.output, 0, 0);
      this.output.write(this._prompt + text);
      this.line = text;
      this._cursor = text.length;
      this._cursor = text.length;
    }
    question(query, optionsOrCallback, maybeCallback) {
      const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
      if (this._closed || !this.output) {
        callback("");
        return;
      }
      this.output.write(query);
      this.once("line", callback);
    }
    /**
     * Gets the current cursor position
     */
    getCursorPos() {
      return { rows: 0, cols: this.cursor };
    }
    /**
     * Prepends a listener for the specified event
     */
    prependListener(event, listener) {
      const listeners = this.listeners(event);
      this.removeAllListeners(event);
      this.on(event, listener);
      listeners.forEach(this.on.bind(this, event));
      return this;
    }
    /**
     * Prepends a one-time listener for the specified event
     */
    prependOnceListener(event, listener) {
      const listeners = this.listeners(event);
      this.removeAllListeners(event);
      this.once(event, listener);
      listeners.forEach(this.on.bind(this, event));
      return this;
    }
    /**
     * Sets the maximum number of listeners
     */
    setMaxListeners() {
      warn("Interface.prototype.setMaxListeners is not supported");
      return this;
    }
    /**
     * Gets the maximum number of listeners
     */
    getMaxListeners() {
      warn("Interface.prototype.getMaxListeners is not supported");
      return 10;
    }
    [Symbol.asyncIterator]() {
      let done = false;
      return {
        next: async () => {
          if (done)
            return { done, value: void 0 };
          const { resolve: resolve4, promise } = Promise.withResolvers();
          this.once("line", (line) => resolve4({ value: line, done: false }));
          this.once("close", () => {
            done = true;
            resolve4({ value: void 0, done });
          });
          return promise;
        },
        return: async (value) => {
          if (done)
            return { done, value };
          done = true;
          this.close();
          return { done, value };
        },
        throw: async (error2) => {
          if (!done) {
            done = true;
            this.close();
          }
          throw error2;
        },
        [Symbol.asyncIterator]() {
          return this;
        },
        [Symbol.asyncDispose]: async () => {
          if (done)
            return;
          done = true;
          this.close();
        }
      };
    }
    [Symbol.dispose]() {
      this.close();
    }
    async [Symbol.asyncDispose]() {
      if (this._closed)
        return;
      const { resolve: resolve4, promise } = Promise.withResolvers();
      this.once("close", () => resolve4());
      this.close();
      await promise;
    }
    rawListeners(event) {
      return this.listeners(event);
    }
  };
  function createInterface(input, output2, completer, terminal) {
    return "input" in input ? new Interface(input.input, input.output, input.completer, input.terminal) : new Interface(input, output2, completer, terminal);
  }
  function clearLine(stream, dir) {
    stream.write(dir >= 0 ? "\r\x1B[K" : "\x1B[K");
    return true;
  }
  function moveCursor(stream, dx, dy) {
    if (!stream.write)
      return false;
    let cmd = "";
    if (dx < 0) {
      cmd += `\x1B[${-dx}D`;
    } else if (dx > 0) {
      cmd += `\x1B[${dx}C`;
    }
    if (dy < 0) {
      cmd += `\x1B[${-dy}A`;
    } else if (dy > 0) {
      cmd += `\x1B[${dy}B`;
    }
    if (cmd)
      stream.write(cmd);
    return true;
  }

  // node_modules/@zenfs/streams/dist/errors.js
  var kTypes = ["string", "function", "number", "object", "Function", "Object", "boolean", "bigint", "symbol"];
  var classRegExp = /^([A-Z][a-z0-9]*)+$/;
  function formatList(array2, type = "and") {
    switch (array2.length) {
      case 0:
        return "";
      case 1:
        return array2[0];
      case 2:
        return `${array2[0]} ${type} ${array2[1]}`;
      case 3:
        return `${array2[0]}, ${array2[1]}, ${type} ${array2[2]}`;
      default:
        return `${array2.slice(0, -1).join(", ")}, ${type} ${array2[array2.length - 1]}`;
    }
  }
  function determineSpecificType(value) {
    if (value === null)
      return "null";
    if (value === void 0)
      return "undefined";
    switch (typeof value) {
      case "bigint":
        return `type bigint (${value}n)`;
      case "number":
        if (value === 0)
          return 1 / value === -Infinity ? "type number (-0)" : "type number (0)";
        if (Number.isNaN(value))
          return "type number (NaN)";
        if (value === Infinity || value === -Infinity)
          return `type number (${value})`;
        return `type number (${value})`;
      case "boolean":
        return `type boolean (${value})`;
      case "symbol":
        return `type symbol (${String(value)})`;
      case "function":
        return `function ${value.name}`;
      case "string":
        return `type string (${JSON.stringify(value.length > 28 ? value.slice(0, 25) + "..." : value)})`;
      default: {
        const name = value.constructor?.name;
        return name ? `an instance of ${name}` : "an instance of Object";
      }
    }
  }
  var CodedError = class extends Error {
    toString() {
      return `${this.name} [${this.code}]: ${this.message}`;
    }
  };
  var CodedTypeError = class extends TypeError {
    toString() {
      return `${this.name} [${this.code}]: ${this.message}`;
    }
  };
  var CodedRangeError = class extends RangeError {
    toString() {
      return `${this.name} [${this.code}]: ${this.message}`;
    }
  };
  var AbortError = class extends Error {
    constructor(message = "The operation was aborted", options) {
      super(message, options);
      __publicField(this, "code", "ABORT_ERR");
      __publicField(this, "name", "AbortError");
    }
  };
  function aggregateTwoErrors(innerError, outerError) {
    if (!innerError || !outerError || innerError === outerError)
      return innerError || outerError;
    if (Array.isArray(outerError.errors)) {
      outerError.errors.push(innerError);
      return outerError;
    }
    const error2 = new AggregateError([outerError, innerError], outerError.message);
    error2.code = outerError.code;
    return error2;
  }
  var ERR_INVALID_ARG_TYPE = class extends CodedTypeError {
    constructor(name, expected, actual) {
      if (!Array.isArray(expected))
        expected = [expected];
      let msg = "The ";
      if (name.endsWith(" argument"))
        msg += `${name} `;
      else
        msg += `"${name}" ${name.includes(".") ? "property" : "argument"} `;
      msg += "must be ";
      const types4 = [];
      const instances = [];
      const other = [];
      for (const value of expected) {
        if (kTypes.includes(value))
          types4.push(value.toLowerCase());
        else if (classRegExp.test(value))
          instances.push(value);
        else
          other.push(value);
      }
      if (instances.length) {
        const pos = types4.indexOf("object");
        if (pos !== -1) {
          types4.splice(pos, 1);
          instances.push("Object");
        }
      }
      if (types4.length) {
        msg += `${types4.length > 1 ? "one of type" : "of type"} ${formatList(types4, "or")}`;
        if (instances.length || other.length)
          msg += " or ";
      }
      if (instances.length) {
        msg += `an instance of ${formatList(instances, "or")}`;
        if (other.length)
          msg += " or ";
      }
      if (other.length > 1)
        msg += `one of ${formatList(other, "or")}`;
      else if (other.length)
        msg += (other[0].toLowerCase() !== other[0] ? "an " : "") + other[0];
      super(`${msg}. Received ${determineSpecificType(actual)}`);
      __publicField(this, "code", "ERR_INVALID_ARG_TYPE");
    }
  };
  var ERR_INVALID_ARG_VALUE = class extends CodedTypeError {
    constructor(name, value, reason = "is invalid") {
      super(`The ${name.includes(".") ? "property" : "argument"} '${name}' ${reason}. Received ${determineSpecificType(value)}`);
      __publicField(this, "code", "ERR_INVALID_ARG_VALUE");
    }
  };
  var ERR_MISSING_ARGS = class extends CodedTypeError {
    constructor(...args) {
      const names = args.map((arg) => Array.isArray(arg) ? arg.map((a) => `"${a}"`).join(" or ") : `"${arg}"`);
      super(`The ${formatList(names)} argument${args.length > 1 ? "s" : ""} must be specified`);
      __publicField(this, "code", "ERR_MISSING_ARGS");
    }
  };
  var ERR_OUT_OF_RANGE = class extends CodedRangeError {
    constructor(name, range, input) {
      super(`The value of "${name}" is out of range. It must be ${range}. Received ${determineSpecificType(input)}`);
      __publicField(this, "code", "ERR_OUT_OF_RANGE");
    }
  };
  var ERR_UNKNOWN_ENCODING = class extends CodedTypeError {
    constructor(encoding) {
      super(`Unknown encoding: ${String(encoding)}`);
      __publicField(this, "code", "ERR_UNKNOWN_ENCODING");
    }
  };
  var ERR_METHOD_NOT_IMPLEMENTED = class extends CodedError {
    constructor(method) {
      super(`The ${method} method is not implemented`);
      __publicField(this, "code", "ERR_METHOD_NOT_IMPLEMENTED");
    }
  };
  var ERR_MULTIPLE_CALLBACK = class extends CodedError {
    constructor() {
      super("Callback called multiple times");
      __publicField(this, "code", "ERR_MULTIPLE_CALLBACK");
    }
  };
  var ERR_ILLEGAL_CONSTRUCTOR = class extends CodedTypeError {
    constructor() {
      super("Illegal constructor");
      __publicField(this, "code", "ERR_ILLEGAL_CONSTRUCTOR");
    }
  };
  var ERR_UNHANDLED_ERROR = class extends CodedError {
    constructor(context) {
      super("Unhandled error." + (context === void 0 ? "" : ` (${String(context)})`));
      __publicField(this, "code", "ERR_UNHANDLED_ERROR");
    }
  };
  var ERR_STREAM_ALREADY_FINISHED = class extends CodedError {
    constructor(method) {
      super(`Cannot call ${method} after a stream was finished`);
      __publicField(this, "code", "ERR_STREAM_ALREADY_FINISHED");
    }
  };
  var ERR_STREAM_CANNOT_PIPE = class extends CodedError {
    constructor() {
      super("Cannot pipe, not readable");
      __publicField(this, "code", "ERR_STREAM_CANNOT_PIPE");
    }
  };
  var ERR_STREAM_DESTROYED = class extends CodedError {
    constructor(method) {
      super(`Cannot call ${method} after a stream was destroyed`);
      __publicField(this, "code", "ERR_STREAM_DESTROYED");
    }
  };
  var ERR_STREAM_NULL_VALUES = class extends CodedTypeError {
    constructor() {
      super("May not write null values to stream");
      __publicField(this, "code", "ERR_STREAM_NULL_VALUES");
    }
  };
  var ERR_STREAM_PREMATURE_CLOSE = class extends CodedError {
    constructor() {
      super("Premature close");
      __publicField(this, "code", "ERR_STREAM_PREMATURE_CLOSE");
    }
  };
  var ERR_STREAM_PUSH_AFTER_EOF = class extends CodedError {
    constructor() {
      super("stream.push() after EOF");
      __publicField(this, "code", "ERR_STREAM_PUSH_AFTER_EOF");
    }
  };
  var ERR_STREAM_UNSHIFT_AFTER_END_EVENT = class extends CodedError {
    constructor() {
      super("stream.unshift() after end event");
      __publicField(this, "code", "ERR_STREAM_UNSHIFT_AFTER_END_EVENT");
    }
  };
  var ERR_STREAM_WRITE_AFTER_END = class extends CodedError {
    constructor() {
      super("write after end");
      __publicField(this, "code", "ERR_STREAM_WRITE_AFTER_END");
    }
  };

  // node_modules/@zenfs/streams/dist/util.js
  function nop() {
  }
  var kEmptyObject = Object.freeze(/* @__PURE__ */ Object.create(null));
  function queueTick(callback, a, b, c, d) {
    switch (arguments.length) {
      case 1:
        return queueMicrotask(callback);
      case 2:
        return queueMicrotask(() => callback(a));
      case 3:
        return queueMicrotask(() => callback(a, b));
      case 4:
        return queueMicrotask(() => callback(a, b, c));
      case 5:
        return queueMicrotask(() => callback(a, b, c, d));
      default: {
        const args = Array.prototype.slice.call(arguments, 1);
        return queueMicrotask(() => callback(...args));
      }
    }
  }
  var nextTick = typeof globalThis.process?.nextTick == "function" ? globalThis.process.nextTick : queueTick;
  function once(callback) {
    let called = false;
    return function(...args) {
      if (called)
        return;
      called = true;
      callback.apply(this, args);
    };
  }
  function validateFunction(value, name) {
    if (typeof value !== "function")
      throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
  }
  function validateObject(value, name) {
    if (value === null || Array.isArray(value) || typeof value !== "object")
      throw new ERR_INVALID_ARG_TYPE(name, "Object", value);
  }
  function validateBoolean(value, name) {
    if (typeof value !== "boolean")
      throw new ERR_INVALID_ARG_TYPE(name, "boolean", value);
  }
  function validateAbortSignal(signal, name) {
    if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
      throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
  }
  function validateInteger(value, name, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== "number")
      throw new ERR_INVALID_ARG_TYPE(name, "number", value);
    if (!Number.isInteger(value))
      throw new ERR_OUT_OF_RANGE(name, "an integer", value);
    if (value < min || value > max)
      throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
  }
  function addAbortListener(signal, listener) {
    signal.addEventListener("abort", listener, { once: true });
    return { [Symbol.dispose]: () => signal.removeEventListener("abort", listener) };
  }

  // node_modules/@zenfs/streams/dist/utils.js
  var kIsDestroyed = Symbol.for("nodejs.stream.destroyed");
  var kIsErrored = Symbol.for("nodejs.stream.errored");
  var kIsReadable = Symbol.for("nodejs.stream.readable");
  var kIsWritable = Symbol.for("nodejs.stream.writable");
  var kIsDisturbed = Symbol.for("nodejs.stream.disturbed");
  var kState = Symbol("kState");
  var kOnConstructed = Symbol("kOnConstructed");
  var kObjectMode = 1 << 0;
  var kErrorEmitted = 1 << 1;
  var kAutoDestroy = 1 << 2;
  var kEmitClose = 1 << 3;
  var kDestroyed = 1 << 4;
  var kClosed = 1 << 5;
  var kCloseEmitted = 1 << 6;
  var kErrored = 1 << 7;
  var kConstructed = 1 << 8;
  var probe = (value) => value ?? {};
  function isReadableNodeStream(value, strict = false) {
    const s = probe(value);
    return !!(value && typeof s.pipe === "function" && typeof s.on === "function" && (!strict || typeof s.pause === "function" && typeof s.resume === "function") && (!s._writableState || s._readableState?.readable !== false) && (!s._writableState || !!s._readableState));
  }
  function isWritableNodeStream(value) {
    const s = probe(value);
    return !!(value && typeof s.write === "function" && typeof s.on === "function" && (!s._readableState || s._writableState?.writable !== false));
  }
  function isNodeStream(value) {
    const s = probe(value);
    return !!(value && (s._readableState || s._writableState || typeof s.write === "function" && typeof s.on === "function" || typeof s.pipe === "function" && typeof s.on === "function"));
  }
  function isReadableStream(value) {
    const s = probe(value);
    return !!(value && !isNodeStream(value) && typeof s.pipeThrough === "function" && typeof s.getReader === "function" && typeof s.cancel === "function");
  }
  function isWritableStream(value) {
    const s = probe(value);
    return !!(value && !isNodeStream(value) && typeof s.getWriter === "function" && typeof s.abort === "function");
  }
  function isTransformStream(value) {
    const s = probe(value);
    return !!(value && !isNodeStream(value) && typeof s.readable === "object" && typeof s.writable === "object");
  }
  function isWebStream(value) {
    return isReadableStream(value) || isWritableStream(value) || isTransformStream(value);
  }
  function isDestroyed(stream) {
    if (!isNodeStream(stream))
      return null;
    const s = probe(stream);
    const state = s._writableState || s._readableState;
    return !!(s.destroyed || s[kIsDestroyed] || state?.destroyed);
  }
  function isWritableEnded(stream) {
    if (!isWritableNodeStream(stream))
      return null;
    const s = probe(stream);
    if (s.writableEnded === true)
      return true;
    if (s._writableState?.errored)
      return false;
    if (typeof s._writableState?.ended !== "boolean")
      return null;
    return s._writableState.ended;
  }
  function isWritableFinished(stream, strict) {
    if (!isWritableNodeStream(stream))
      return null;
    const s = probe(stream);
    if (s.writableFinished === true)
      return true;
    const w = s._writableState;
    if (w?.errored)
      return false;
    if (typeof w?.finished !== "boolean")
      return null;
    return !!(w.finished || strict === false && w.ended === true && w.length === 0);
  }
  function isReadableFinished(stream, strict) {
    if (!isReadableNodeStream(stream))
      return null;
    const r = probe(stream)._readableState;
    if (r?.errored)
      return false;
    if (typeof r?.endEmitted !== "boolean")
      return null;
    return !!(r.endEmitted || strict === false && r.ended === true && r.length === 0);
  }
  function isReadable(stream) {
    const s = probe(stream);
    if (stream && s[kIsReadable] != null)
      return s[kIsReadable];
    if (typeof s.readable !== "boolean")
      return null;
    if (isDestroyed(stream))
      return false;
    return isReadableNodeStream(stream) && s.readable && !isReadableFinished(stream);
  }
  function isWritable(stream) {
    const s = probe(stream);
    if (stream && s[kIsWritable] != null)
      return s[kIsWritable];
    if (typeof s.writable !== "boolean")
      return null;
    if (isDestroyed(stream))
      return false;
    return isWritableNodeStream(stream) && s.writable && !isWritableEnded(stream);
  }
  function isFinished(stream, opts) {
    if (!isNodeStream(stream))
      return null;
    if (isDestroyed(stream))
      return true;
    if (opts?.readable !== false && isReadable(stream))
      return false;
    if (opts?.writable !== false && isWritable(stream))
      return false;
    return true;
  }
  function isWritableErrored(stream) {
    if (!isNodeStream(stream))
      return null;
    const s = probe(stream);
    return s.writableErrored || s._writableState?.errored || null;
  }
  function isReadableErrored(stream) {
    if (!isNodeStream(stream))
      return null;
    const s = probe(stream);
    return s.readableErrored || s._readableState?.errored || null;
  }
  function isClosed(stream) {
    if (!isNodeStream(stream))
      return null;
    const s = probe(stream);
    if (typeof s.closed === "boolean")
      return s.closed;
    const w = s._writableState;
    const r = s._readableState;
    if (typeof w?.closed === "boolean" || typeof r?.closed === "boolean")
      return w?.closed || r?.closed || false;
    return null;
  }
  function willEmitClose(stream) {
    if (!isNodeStream(stream))
      return null;
    const s = probe(stream);
    const state = s._writableState || s._readableState;
    return !!(state?.autoDestroy && state.emitClose && state.closed === false);
  }
  function isDisturbed(stream) {
    const s = probe(stream);
    return !!(stream && (s[kIsDisturbed] ?? (s.readableDidRead || s.readableAborted)));
  }
  var kIsClosedPromise = Symbol.for("nodejs.webstream.isClosedPromise");
  function trackClosed(stream, closed) {
    closed.catch(() => {
    });
    Object.defineProperty(stream, kIsClosedPromise, { value: { promise: closed }, configurable: true });
    return stream;
  }

  // node_modules/@zenfs/streams/dist/end-of-stream.js
  function getErrored(stream) {
    const errored = isWritableErrored(stream) || isReadableErrored(stream);
    return typeof errored !== "boolean" && errored || null;
  }
  function getOnCloseError(stream, readable, readableFinished, writable, writableFinished) {
    const errored = getErrored(stream);
    if (errored)
      return errored;
    if (readable && !readableFinished && isReadableNodeStream(stream, true) && !isReadableFinished(stream, false))
      return new ERR_STREAM_PREMATURE_CLOSE();
    if (writable && !writableFinished && !isWritableFinished(stream, false))
      return new ERR_STREAM_PREMATURE_CLOSE();
    return null;
  }
  function eos(stream, options, callback) {
    let opts;
    if (typeof options === "function") {
      callback = options;
      opts = kEmptyObject;
    } else if (options == null) {
      opts = kEmptyObject;
    } else {
      validateObject(options, "options");
      opts = options;
    }
    validateFunction(callback, "callback");
    validateAbortSignal(opts.signal, "options.signal");
    if (isReadableStream(stream) || isWritableStream(stream))
      return eosWeb(stream, opts, callback);
    if (!isNodeStream(stream))
      throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    const s = stream;
    const readable = opts.readable ?? isReadableNodeStream(stream);
    const writable = opts.writable ?? isWritableNodeStream(stream);
    let willEmitClose2 = !!willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
    let writableFinished = isWritableFinished(stream, false);
    let readableFinished = isReadableFinished(stream, false);
    const wState = s._writableState;
    const rState = s._readableState;
    let immediate;
    if (isClosed(stream)) {
      immediate = getOnCloseError(stream, readable, readableFinished, writable, writableFinished);
    } else if (wState?.errorEmitted || rState?.errorEmitted) {
      if (!willEmitClose2)
        immediate = getErrored(stream);
    } else if (!readable && (!willEmitClose2 || isReadable(stream)) && (writableFinished || isWritable(stream) === false) && (wState == null || wState.pendingcb === void 0 || wState.pendingcb === 0)) {
      immediate = getErrored(stream);
    } else if (!writable && (!willEmitClose2 || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) {
      immediate = getErrored(stream);
    }
    let cleanup = () => {
      callback = nop;
    };
    if (immediate !== void 0) {
      if (opts.error !== false) {
        s.on("error", nop);
        cleanup = () => {
          callback = nop;
          s.removeListener("error", nop);
        };
      }
    } else if (opts.signal?.aborted) {
      immediate = new AbortError(void 0, { cause: opts.signal.reason });
    }
    if (immediate !== void 0) {
      const settled = immediate;
      nextTick(() => settled === null ? callback.call(stream) : callback.call(stream, settled));
      return cleanup;
    }
    callback = once(callback);
    const onlegacyfinish = () => {
      if (!s.writable)
        onfinish();
    };
    const onfinish = () => {
      writableFinished = true;
      if (s.destroyed)
        willEmitClose2 = false;
      if (willEmitClose2 && (!s.readable || readable))
        return;
      if (!readable || readableFinished)
        callback.call(stream);
    };
    const onend = () => {
      readableFinished = true;
      if (s.destroyed)
        willEmitClose2 = false;
      if (willEmitClose2 && (!s.writable || writable))
        return;
      if (!writable || writableFinished)
        callback.call(stream);
    };
    const onerror = (err2) => {
      callback.call(stream, err2);
    };
    const onclose = () => {
      const error2 = getOnCloseError(stream, readable, readableFinished, writable, writableFinished);
      callback.call(stream, error2 ?? void 0);
    };
    if (writable && !wState) {
      s.on("end", onlegacyfinish);
      s.on("close", onlegacyfinish);
    }
    if (!willEmitClose2 && typeof s.aborted === "boolean")
      s.on("aborted", onclose);
    s.on("end", onend);
    s.on("finish", onfinish);
    if (opts.error !== false)
      s.on("error", onerror);
    s.on("close", onclose);
    cleanup = () => {
      callback = nop;
      s.removeListener("aborted", onclose);
      s.removeListener("end", onlegacyfinish);
      s.removeListener("close", onlegacyfinish);
      s.removeListener("finish", onfinish);
      s.removeListener("end", onend);
      s.removeListener("error", onerror);
      s.removeListener("close", onclose);
    };
    if (opts.signal) {
      const abort = () => {
        const endCallback = callback;
        cleanup();
        endCallback.call(stream, new AbortError(void 0, { cause: opts.signal.reason }));
      };
      const disposable = addAbortListener(opts.signal, abort);
      const original = callback;
      callback = once((err2) => {
        disposable[Symbol.dispose]();
        original.call(stream, err2);
      });
    }
    return cleanup;
  }
  function eosWeb(stream, options, callback) {
    const closed = stream[kIsClosedPromise];
    if (!closed) {
      throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    let done = once(callback);
    let aborted = false;
    if (options.signal) {
      const abort = () => {
        aborted = true;
        done.call(stream, new AbortError(void 0, { cause: options.signal.reason }));
      };
      if (options.signal.aborted) {
        nextTick(abort);
      } else {
        const disposable = addAbortListener(options.signal, abort);
        const original = done;
        done = once((err2) => {
          disposable[Symbol.dispose]();
          original.call(stream, err2);
        });
      }
    }
    const settle = (err2) => {
      if (!aborted)
        nextTick(() => done.call(stream, err2));
    };
    closed.promise.then(settle, settle);
    return nop;
  }
  function finished(stream, opts) {
    const options = opts ?? kEmptyObject;
    let autoCleanup = false;
    if ("cleanup" in options && options.cleanup !== void 0) {
      validateBoolean(options.cleanup, "cleanup");
      autoCleanup = options.cleanup;
    }
    return new Promise((resolve4, reject) => {
      const cleanup = eos(stream, options, (err2) => {
        if (autoCleanup)
          cleanup();
        if (err2)
          reject(err2);
        else
          resolve4();
      });
    });
  }

  // node_modules/@zenfs/streams/dist/readable.js
  var import_buffer8 = __toESM(require_buffer(), 1);

  // node_modules/@zenfs/streams/dist/add-abort-signal.js
  var kControllerErrorFunction = Symbol.for("nodejs.webstream.controllerErrorFunction");
  function addAbortSignal(signal, stream) {
    if (typeof signal !== "object" || !("aborted" in signal))
      throw new ERR_INVALID_ARG_TYPE("signal", "AbortSignal", signal);
    if (!isNodeStream(stream) && !isWebStream(stream)) {
      throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    return addAbortSignalNoValidate(signal, stream);
  }
  function addAbortSignalNoValidate(signal, stream) {
    if (typeof signal !== "object" || !("aborted" in signal))
      return stream;
    const onAbort = isNodeStream(stream) ? () => stream.destroy(new AbortError(void 0, { cause: signal.reason })) : () => {
      const error2 = stream[kControllerErrorFunction];
      error2?.(new AbortError(void 0, { cause: signal.reason }));
    };
    if (signal.aborted) {
      onAbort();
    } else {
      const disposable = addAbortListener(signal, onAbort);
      eos(stream, () => disposable[Symbol.dispose]());
    }
    return stream;
  }

  // node_modules/@zenfs/streams/dist/destroy.js
  var kDestroy = Symbol("kDestroy");
  var kConstruct = Symbol("kConstruct");
  function checkError(err2, w, r) {
    if (!err2)
      return;
    void err2.stack;
    if (w && !w.errored)
      w.errored = err2;
    if (r && !r.errored)
      r.errored = err2;
  }
  function destroy(err2, callback) {
    const r = this._readableState;
    const w = this._writableState;
    const s = w || r;
    if (w && (w[kState] & kDestroyed) !== 0 || r && (r[kState] & kDestroyed) !== 0) {
      callback?.();
      return this;
    }
    checkError(err2, w, r);
    if (w)
      w[kState] |= kDestroyed;
    if (r)
      r[kState] |= kDestroyed;
    if (s && (s[kState] & kConstructed) === 0) {
      this.once(kDestroy, function(er) {
        _destroy(this, aggregateTwoErrors(er, err2) ?? null, callback);
      });
    } else {
      _destroy(this, err2 ?? null, callback);
    }
    return this;
  }
  function _destroy(self, err2, callback) {
    let called = false;
    function onDestroy(err3) {
      if (called)
        return;
      called = true;
      const r = self._readableState;
      const w = self._writableState;
      checkError(err3, w, r);
      if (w)
        w[kState] |= kClosed;
      if (r)
        r[kState] |= kClosed;
      callback?.(err3);
      if (err3)
        nextTick(emitErrorCloseNT, self, err3);
      else
        nextTick(emitCloseNT, self);
    }
    try {
      self._destroy(err2, onDestroy);
    } catch (err3) {
      onDestroy(err3);
    }
  }
  function emitErrorCloseNT(self, err2) {
    emitErrorNT(self, err2);
    emitCloseNT(self);
  }
  function emitCloseNT(self) {
    const r = self._readableState;
    const w = self._writableState;
    if (w)
      w[kState] |= kCloseEmitted;
    if (r)
      r[kState] |= kCloseEmitted;
    if (w && (w[kState] & kEmitClose) !== 0 || r && (r[kState] & kEmitClose) !== 0)
      self.emit("close");
  }
  function emitErrorNT(self, err2) {
    const r = self._readableState;
    const w = self._writableState;
    if (w && (w[kState] & kErrorEmitted) !== 0 || r && (r[kState] & kErrorEmitted) !== 0)
      return;
    if (w)
      w[kState] |= kErrorEmitted;
    if (r)
      r[kState] |= kErrorEmitted;
    self.emit("error", err2);
  }
  function undestroy() {
    const r = this._readableState;
    const w = this._writableState;
    if (r) {
      r.constructed = true;
      r.closed = false;
      r.closeEmitted = false;
      r.destroyed = false;
      r.errored = null;
      r.errorEmitted = false;
      r.reading = false;
      r.ended = r.readable === false;
      r.endEmitted = r.readable === false;
    }
    if (w) {
      w.constructed = true;
      w.destroyed = false;
      w.closed = false;
      w.closeEmitted = false;
      w.errored = null;
      w.errorEmitted = false;
      w.finalCalled = false;
      w.prefinished = false;
      w.ended = w.writable === false;
      w.ending = w.writable === false;
      w.finished = w.writable === false;
    }
  }
  function errorOrDestroy(stream, err2, sync) {
    const r = stream._readableState;
    const w = stream._writableState;
    if (w && (w[kState] & kDestroyed) !== 0 || r && (r[kState] & kDestroyed) !== 0)
      return;
    if (r && (r[kState] & kAutoDestroy) !== 0 || w && (w[kState] & kAutoDestroy) !== 0) {
      stream.destroy(err2);
    } else if (err2) {
      void err2.stack;
      if (w && (w[kState] & kErrored) === 0)
        w.errored = err2;
      if (r && (r[kState] & kErrored) === 0)
        r.errored = err2;
      if (sync)
        nextTick(emitErrorNT, stream, err2);
      else
        emitErrorNT(stream, err2);
    }
  }
  function construct(stream, callback) {
    if (typeof stream._construct !== "function")
      return;
    const r = stream._readableState;
    const w = stream._writableState;
    if (r)
      r[kState] &= ~kConstructed;
    if (w)
      w[kState] &= ~kConstructed;
    stream.once(kConstruct, callback);
    if (stream.listenerCount(kConstruct) > 1)
      return;
    nextTick(constructNT, stream);
  }
  function constructNT(stream) {
    let called = false;
    function onConstruct(err2) {
      if (called) {
        errorOrDestroy(stream, err2 ?? new ERR_MULTIPLE_CALLBACK());
        return;
      }
      called = true;
      const r = stream._readableState;
      const w = stream._writableState;
      const s = w || r;
      if (r)
        r[kState] |= kConstructed;
      if (w)
        w[kState] |= kConstructed;
      if (s?.destroyed)
        stream.emit(kDestroy, err2);
      else if (err2)
        errorOrDestroy(stream, err2, true);
      else
        stream.emit(kConstruct);
    }
    try {
      stream._construct((err2) => nextTick(onConstruct, err2));
    } catch (err2) {
      nextTick(onConstruct, err2);
    }
  }
  function emitCloseLegacy(stream) {
    stream.emit("close");
  }
  function emitErrorCloseLegacy(stream, err2) {
    stream.emit("error", err2);
    nextTick(emitCloseLegacy, stream);
  }
  function destroyer(stream, err2) {
    if (!stream || isDestroyed(stream))
      return;
    if (!err2 && !isFinished(stream))
      err2 = new AbortError();
    const s = stream;
    if (typeof s.destroy === "function")
      s.destroy(err2);
    else if (typeof s.close === "function")
      s.close();
    else if (err2)
      nextTick(emitErrorCloseLegacy, s, err2);
    else
      nextTick(emitCloseLegacy, s);
    if (!s.destroyed)
      s[kIsDestroyed] = true;
  }

  // node_modules/@zenfs/streams/dist/events.js
  var errorMonitor = Symbol("events.errorMonitor");
  var captureRejectionSymbol = Symbol.for("nodejs.rejection");
  var kCapture = Symbol("kCapture");
  function checkListener(listener) {
    if (typeof listener !== "function")
      throw new ERR_INVALID_ARG_TYPE("listener", "Function", listener);
  }
  var _a7, _EventEmitter_instances, capture_fn, add_fn, wrapOnce_fn, listeners_fn;
  _a7 = kCapture;
  var _EventEmitter = class _EventEmitter {
    constructor(options) {
      __privateAdd(this, _EventEmitter_instances);
      __publicField(this, "_events", /* @__PURE__ */ Object.create(null));
      __publicField(this, "_eventsCount", 0);
      __publicField(this, "_maxListeners");
      __publicField(this, _a7);
      this[kCapture] = options?.captureRejections ?? _EventEmitter.captureRejections;
    }
    setMaxListeners(n) {
      if (typeof n !== "number" || n < 0 || Number.isNaN(n))
        throw new ERR_INVALID_ARG_TYPE("n", "a non-negative number", n);
      this._maxListeners = n;
      return this;
    }
    getMaxListeners() {
      return this._maxListeners ?? _EventEmitter.defaultMaxListeners;
    }
    emit(type, ...args) {
      const events = this._events;
      let doError = type === "error";
      if (doError) {
        if (events[errorMonitor] !== void 0)
          this.emit(errorMonitor, ...args);
        doError = events.error === void 0;
      }
      if (doError) {
        const er = args[0];
        if (er instanceof Error)
          throw er;
        const err2 = new ERR_UNHANDLED_ERROR(er);
        err2.context = er;
        throw err2;
      }
      const handler = events[type];
      if (handler === void 0)
        return false;
      if (typeof handler === "function") {
        const result = handler.apply(this, args);
        if (result != null)
          __privateMethod(this, _EventEmitter_instances, capture_fn).call(this, result, type, args);
        return true;
      }
      for (const listener of handler.slice()) {
        const result = listener.apply(this, args);
        if (result != null)
          __privateMethod(this, _EventEmitter_instances, capture_fn).call(this, result, type, args);
      }
      return true;
    }
    addListener(type, listener) {
      return __privateMethod(this, _EventEmitter_instances, add_fn).call(this, type, listener, false);
    }
    on(type, listener) {
      return __privateMethod(this, _EventEmitter_instances, add_fn).call(this, type, listener, false);
    }
    prependListener(type, listener) {
      return __privateMethod(this, _EventEmitter_instances, add_fn).call(this, type, listener, true);
    }
    once(type, listener) {
      checkListener(listener);
      return __privateMethod(this, _EventEmitter_instances, add_fn).call(this, type, __privateMethod(this, _EventEmitter_instances, wrapOnce_fn).call(this, type, listener), false);
    }
    prependOnceListener(type, listener) {
      checkListener(listener);
      return __privateMethod(this, _EventEmitter_instances, add_fn).call(this, type, __privateMethod(this, _EventEmitter_instances, wrapOnce_fn).call(this, type, listener), true);
    }
    removeListener(type, listener) {
      checkListener(listener);
      const events = this._events;
      const list3 = events[type];
      if (list3 === void 0)
        return this;
      if (list3 === listener || list3.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = /* @__PURE__ */ Object.create(null);
        else
          delete events[type];
        if (events.removeListener !== void 0)
          this.emit("removeListener", type, list3.listener ?? listener);
        return this;
      }
      if (typeof list3 === "function")
        return this;
      let position = -1;
      let original;
      for (let i = list3.length - 1; i >= 0; i--) {
        if (list3[i] === listener || list3[i].listener === listener) {
          original = list3[i].listener;
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      list3.splice(position, 1);
      if (list3.length === 1)
        events[type] = list3[0];
      if (events.removeListener !== void 0)
        this.emit("removeListener", type, original ?? listener);
      return this;
    }
    off(type, listener) {
      return this.removeListener(type, listener);
    }
    removeAllListeners(type) {
      const events = this._events;
      if (events.removeListener === void 0) {
        if (type === void 0) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== void 0) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else
            delete events[type];
        }
        return this;
      }
      if (type === void 0) {
        for (const key of Reflect.ownKeys(events)) {
          if (key === "removeListener")
            continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners("removeListener");
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
        return this;
      }
      const listeners = events[type];
      if (typeof listeners === "function")
        this.removeListener(type, listeners);
      else if (listeners !== void 0)
        for (let i = listeners.length - 1; i >= 0; i--)
          this.removeListener(type, listeners[i]);
      return this;
    }
    listeners(type) {
      return __privateMethod(this, _EventEmitter_instances, listeners_fn).call(this, type, true);
    }
    rawListeners(type) {
      return __privateMethod(this, _EventEmitter_instances, listeners_fn).call(this, type, false);
    }
    listenerCount(type, listener) {
      const handler = this._events[type];
      if (handler === void 0)
        return 0;
      if (typeof handler === "function")
        return listener === void 0 || handler === listener || handler.listener === listener ? 1 : 0;
      if (listener === void 0)
        return handler.length;
      let count = 0;
      for (const current of handler) {
        if (current === listener || current.listener === listener)
          count++;
      }
      return count;
    }
    eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    }
  };
  _EventEmitter_instances = new WeakSet();
  capture_fn = function(result, type, args) {
    if (!this[kCapture])
      return;
    try {
      const then = result.then;
      if (typeof then !== "function")
        return;
      then.call(result, void 0, (err2) => {
        nextTick(() => {
          const capture = this[captureRejectionSymbol];
          if (capture)
            capture.call(this, err2, type, args);
          else
            this.emit("error", err2);
        });
      });
    } catch (err2) {
      this.emit("error", err2);
    }
  };
  add_fn = function(type, listener, prepend) {
    checkListener(listener);
    const events = this._events;
    if (events.newListener !== void 0)
      this.emit("newListener", type, listener.listener ?? listener);
    const existing = events[type];
    if (existing === void 0) {
      events[type] = listener;
      ++this._eventsCount;
    } else if (typeof existing === "function") {
      events[type] = prepend ? [listener, existing] : [existing, listener];
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }
    return this;
  };
  wrapOnce_fn = function(type, listener) {
    let fired = false;
    const wrapped = (...args) => {
      if (fired)
        return;
      fired = true;
      this.removeListener(type, wrapped);
      return listener.apply(this, args);
    };
    wrapped.listener = listener;
    return wrapped;
  };
  listeners_fn = function(type, unwrap) {
    const handler = this._events[type];
    if (handler === void 0)
      return [];
    if (typeof handler === "function")
      return [unwrap ? handler.listener ?? handler : handler];
    return handler.map((listener) => unwrap ? listener.listener ?? listener : listener);
  };
  __publicField(_EventEmitter, "defaultMaxListeners", 10);
  /** The default for the `captureRejections` option of newly created emitters. */
  __publicField(_EventEmitter, "captureRejections", false);
  __publicField(_EventEmitter, "captureRejectionSymbol", captureRejectionSymbol);
  __publicField(_EventEmitter, "errorMonitor", errorMonitor);
  var EventEmitter2 = _EventEmitter;

  // node_modules/@zenfs/streams/dist/from.js
  var import_buffer6 = __toESM(require_buffer(), 1);
  function from(Readable2, iterable, opts) {
    if (typeof iterable === "string" || iterable instanceof import_buffer6.Buffer) {
      return new Readable2({
        objectMode: true,
        ...opts,
        read() {
          this.push(iterable);
          this.push(null);
        }
      });
    }
    let iterator;
    let isAsync;
    if (iterable?.[Symbol.asyncIterator]) {
      isAsync = true;
      iterator = iterable[Symbol.asyncIterator]();
    } else if (iterable?.[Symbol.iterator]) {
      isAsync = false;
      iterator = iterable[Symbol.iterator]();
    } else {
      throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
    }
    const readable = new Readable2({ objectMode: true, highWaterMark: 1, ...opts });
    const originalDestroy = readable._destroy;
    let reading = false;
    let isAsyncValues = false;
    readable._read = function() {
      if (reading)
        return;
      reading = true;
      if (isAsync)
        void nextAsync();
      else if (isAsyncValues)
        void nextSyncWithAsyncValues();
      else
        for (; ; ) {
          try {
            const { value, done } = iterator.next();
            if (done) {
              readable.push(null);
              return;
            }
            if (value && typeof value.then === "function") {
              void changeToAsyncValues(value);
              return;
            }
            if (value === null) {
              reading = false;
              throw new ERR_STREAM_NULL_VALUES();
            }
            if (readable.push(value))
              continue;
            reading = false;
          } catch (err2) {
            readable.destroy(err2);
          }
          break;
        }
    };
    readable._destroy = function(error2, cb) {
      originalDestroy.call(this, error2, (destroyError) => {
        const combined = destroyError || error2;
        close2(combined).then(
          // nextTick in case cb throws
          () => nextTick(cb, combined),
          (closeError) => nextTick(cb, aggregateTwoErrors(combined, closeError))
        );
      });
    };
    async function close2(error2) {
      if (error2 != null && typeof iterator.throw === "function") {
        const { value, done } = await iterator.throw(error2);
        await value;
        if (done)
          return;
      }
      if (typeof iterator.return === "function") {
        const { value } = await iterator.return();
        await value;
      }
    }
    async function changeToAsyncValues(value) {
      isAsyncValues = true;
      try {
        const res = await value;
        if (res === null) {
          reading = false;
          throw new ERR_STREAM_NULL_VALUES();
        }
        if (readable.push(res)) {
          await nextSyncWithAsyncValues();
          return;
        }
        reading = false;
      } catch (err2) {
        readable.destroy(err2);
      }
    }
    async function nextSyncWithAsyncValues() {
      for (; ; ) {
        try {
          const { value, done } = iterator.next();
          if (done) {
            readable.push(null);
            return;
          }
          const res = value && typeof value.then === "function" ? await value : value;
          if (res === null) {
            reading = false;
            throw new ERR_STREAM_NULL_VALUES();
          }
          if (readable.push(res))
            continue;
          reading = false;
        } catch (err2) {
          readable.destroy(err2);
        }
        break;
      }
    }
    async function nextAsync() {
      for (; ; ) {
        try {
          const { value, done } = await iterator.next();
          if (done) {
            readable.push(null);
            return;
          }
          if (value === null) {
            reading = false;
            throw new ERR_STREAM_NULL_VALUES();
          }
          if (readable.push(value))
            continue;
          reading = false;
        } catch (err2) {
          readable.destroy(err2);
        }
        break;
      }
    }
    return readable;
  }

  // node_modules/@zenfs/streams/dist/iter.js
  var toStreamable = Symbol.for("Stream.toStreamable");
  var toAsyncStreamable = Symbol.for("Stream.toAsyncStreamable");
  var MAX_DRAIN_BATCH = 128;
  var encoder2 = new TextEncoder();
  function hasProtocol(value, symbol) {
    return value !== null && typeof value === "object" && symbol in value && typeof value[symbol] === "function";
  }
  function toUint8Array(chunk) {
    if (typeof chunk === "string")
      return encoder2.encode(chunk);
    if (ArrayBuffer.isView(chunk))
      return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    return new Uint8Array(chunk);
  }
  async function* normalizeAsyncValue(value, allowNested = true) {
    if (value != null && typeof value.then === "function") {
      yield* normalizeAsyncValue(await value, allowNested);
      return;
    }
    if (typeof value === "string" || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      yield toUint8Array(value);
      return;
    }
    const isAsyncIterable = typeof value?.[Symbol.asyncIterator] === "function";
    if (!allowNested && (isAsyncIterable || hasProtocol(value, toAsyncStreamable))) {
      throw new ERR_INVALID_ARG_TYPE("value", ["string", "ArrayBuffer", "ArrayBufferView", "Iterable", "toStreamable"], value);
    }
    if (hasProtocol(value, toAsyncStreamable)) {
      yield* normalizeAsyncValue(await value[toAsyncStreamable].call(value), allowNested);
      return;
    }
    if (hasProtocol(value, toStreamable)) {
      yield* normalizeAsyncValue(value[toStreamable].call(value), allowNested);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value)
        yield* normalizeAsyncValue(item, allowNested);
      return;
    }
    if (isAsyncIterable) {
      for await (const item of value)
        yield* normalizeAsyncValue(item, allowNested);
      return;
    }
    if (typeof value !== "string" && typeof value?.[Symbol.iterator] === "function") {
      for (const item of value)
        yield* normalizeAsyncValue(item, allowNested);
      return;
    }
    throw new ERR_INVALID_ARG_TYPE("value", ["string", "ArrayBuffer", "ArrayBufferView", "Iterable", "AsyncIterable", "toStreamable", "toAsyncStreamable"], value);
  }
  async function normalizeBatch(raw) {
    const batch = [];
    for (const value of raw) {
      if (value instanceof Uint8Array) {
        batch.push(value);
        continue;
      }
      for await (const normalized of normalizeAsyncValue(value))
        batch.push(normalized);
    }
    return batch.length > 0 ? batch : null;
  }
  async function* createBatchedAsyncIterator(stream, normalize3) {
    let callback = nop;
    function next(resolve4) {
      if (this === stream) {
        callback();
        callback = nop;
      } else {
        callback = resolve4;
      }
    }
    stream.on("readable", next);
    let error2;
    const cleanup = eos(stream, { writable: false }, (err2) => {
      error2 = err2 ? aggregateTwoErrors(error2, err2) ?? null : null;
      callback();
      callback = nop;
    });
    try {
      for (; ; ) {
        const chunk = stream.destroyed ? null : stream.read();
        if (chunk !== null) {
          const batch = [chunk];
          while (batch.length < MAX_DRAIN_BATCH && stream._readableState.length > 0) {
            const c = stream.read();
            if (c === null)
              break;
            batch.push(c);
          }
          if (normalize3 === null) {
            yield batch;
          } else {
            const result = await normalize3(batch);
            if (result !== null)
              yield result;
          }
        } else if (error2) {
          throw error2;
        } else if (error2 === null) {
          return;
        } else {
          await new Promise(next);
        }
      }
    } catch (err2) {
      error2 = aggregateTwoErrors(error2, err2);
      throw error2;
    } finally {
      if (error2 === void 0 || stream._readableState.autoDestroy) {
        destroyer(stream, null);
      } else {
        stream.off("readable", next);
        cleanup();
      }
    }
  }

  // node_modules/@zenfs/streams/dist/legacy.js
  function prependListener(emitter, event, listener) {
    if (typeof emitter.prependListener === "function")
      emitter.prependListener(event, listener);
    else
      emitter.on(event, listener);
  }
  var Stream = class extends EventEmitter2 {
    pipe(dest, options) {
      const source = this;
      function ondata(chunk) {
        if (dest.writable && dest.write(chunk) === false && source.pause) {
          source.pause();
        }
      }
      source.on("data", ondata);
      function ondrain() {
        const src = source;
        if (src.readable && src.resume)
          src.resume();
      }
      dest.on("drain", ondrain);
      let didOnEnd = false;
      function onend() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        dest.end();
      }
      function onclose() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        if (typeof dest.destroy === "function")
          dest.destroy();
      }
      if (!dest._isStdio && options?.end !== false) {
        source.on("end", onend);
        source.on("close", onclose);
      }
      function onerror(err2) {
        cleanup();
        if (this.listenerCount?.("error") === 0)
          this.emit("error", err2);
      }
      prependListener(source, "error", onerror);
      prependListener(dest, "error", onerror);
      function cleanup() {
        source.removeListener("data", ondata);
        dest.removeListener("drain", ondrain);
        source.removeListener("end", onend);
        source.removeListener("close", onclose);
        source.removeListener("error", onerror);
        dest.removeListener("error", onerror);
        source.removeListener("end", cleanup);
        source.removeListener("close", cleanup);
        dest.removeListener("close", cleanup);
      }
      source.on("end", cleanup);
      source.on("close", cleanup);
      dest.on("close", cleanup);
      dest.emit("pipe", source);
      return dest;
    }
  };

  // node_modules/@zenfs/streams/dist/operators.js
  var kEmpty = Symbol("kEmpty");
  var kEof = Symbol("kEof");
  function map(fn, options) {
    validateFunction(fn, "fn");
    if (options != null)
      validateObject(options, "options");
    if (options?.signal != null)
      validateAbortSignal(options.signal, "options.signal");
    const concurrency = options?.concurrency != null ? Math.floor(options.concurrency) : 1;
    let highWaterMark = options?.highWaterMark != null ? Math.floor(options.highWaterMark) : concurrency - 1;
    validateInteger(concurrency, "options.concurrency", 1);
    validateInteger(highWaterMark, "options.highWaterMark", 0);
    highWaterMark += concurrency;
    return async function* map2() {
      const signal = AbortSignal.any(options?.signal ? [options.signal] : []);
      const stream = this;
      const queue = [];
      const signalOpt = { signal };
      let next = null;
      let resume2 = null;
      let done = false;
      let count = 0;
      function afterItemProcessed() {
        count -= 1;
        maybeResume();
      }
      function onCatch() {
        done = true;
        afterItemProcessed();
      }
      function releaseResume() {
        resume2?.resolve();
        resume2 = null;
      }
      function maybeResume() {
        if (resume2 && !done && count < concurrency && queue.length < highWaterMark)
          releaseResume();
      }
      async function pump() {
        try {
          for await (let val of stream) {
            if (done)
              return;
            if (signal.aborted)
              throw new AbortError();
            let promise;
            try {
              val = fn(val, signalOpt);
              if (val === kEmpty)
                continue;
              promise = Promise.resolve(val);
            } catch (err2) {
              promise = Promise.reject(err2);
            }
            count += 1;
            promise.then(afterItemProcessed, onCatch);
            queue.push(promise);
            next?.resolve();
            next = null;
            if (!done && (queue.length >= highWaterMark || count >= concurrency)) {
              resume2 = Promise.withResolvers();
              await resume2.promise;
            }
          }
          queue.push(kEof);
        } catch (err2) {
          const val = Promise.reject(err2);
          val.then(afterItemProcessed, onCatch);
          queue.push(val);
        } finally {
          done = true;
          next?.resolve();
          next = null;
        }
      }
      void pump();
      try {
        for (; ; ) {
          while (queue.length > 0) {
            const val = await queue[0];
            if (val === kEof)
              return;
            if (signal.aborted)
              throw new AbortError();
            if (val !== kEmpty)
              yield val;
            void queue.shift();
            maybeResume();
          }
          next = Promise.withResolvers();
          await next.promise;
        }
      } finally {
        done = true;
        releaseResume();
        destroyer(stream, null);
      }
    }.call(this);
  }
  function filter(fn, options) {
    validateFunction(fn, "fn");
    return map.call(this, async (value, opts) => await fn(value, opts) ? value : kEmpty, options);
  }
  function flatMap(fn, options) {
    const values = map.call(this, fn, options);
    return async function* flatMap2() {
      for await (const val of values)
        yield* val;
    }();
  }
  function toIntegerOrInfinity(number) {
    const n = Number(number);
    if (Number.isNaN(n))
      return 0;
    if (n < 0)
      throw new ERR_OUT_OF_RANGE("number", ">= 0", n);
    return n;
  }
  function drop(number, options) {
    if (options != null)
      validateObject(options, "options");
    if (options?.signal != null)
      validateAbortSignal(options.signal, "options.signal");
    let remaining = toIntegerOrInfinity(number);
    return async function* drop2() {
      if (options?.signal?.aborted)
        throw new AbortError();
      for await (const val of this) {
        if (options?.signal?.aborted)
          throw new AbortError();
        if (remaining-- <= 0)
          yield val;
      }
    }.call(this);
  }
  function take(number, options) {
    if (options != null)
      validateObject(options, "options");
    if (options?.signal != null)
      validateAbortSignal(options.signal, "options.signal");
    let remaining = toIntegerOrInfinity(number);
    return async function* take2() {
      if (options?.signal?.aborted)
        throw new AbortError();
      for await (const val of this) {
        if (options?.signal?.aborted)
          throw new AbortError();
        if (remaining-- > 0)
          yield val;
        if (remaining <= 0)
          return;
      }
    }.call(this);
  }
  async function some(fn, options) {
    for await (const value of filter.call(this, fn, options)) {
      return true;
    }
    return false;
  }
  async function every(fn, options) {
    validateFunction(fn, "fn");
    return !await some.call(this, async (...args) => !await fn(...args), options);
  }
  async function find(fn, options) {
    for await (const result of filter.call(this, fn, options))
      return result;
    return void 0;
  }
  async function forEach(fn, options) {
    validateFunction(fn, "fn");
    const mapped = map.call(this, async (value, opts) => {
      await fn(value, opts);
      return kEmpty;
    }, options);
    for await (const value of mapped)
      ;
  }
  async function toArray(options) {
    if (options != null)
      validateObject(options, "options");
    if (options?.signal != null)
      validateAbortSignal(options.signal, "options.signal");
    const result = [];
    for await (const val of this) {
      if (options?.signal?.aborted)
        throw new AbortError(void 0, { cause: options.signal.reason });
      result.push(val);
    }
    return result;
  }
  async function reduce(reducer, initialValue, options) {
    validateFunction(reducer, "reducer");
    if (options != null)
      validateObject(options, "options");
    if (options?.signal != null)
      validateAbortSignal(options.signal, "options.signal");
    let hasInitialValue = arguments.length > 1;
    if (options?.signal?.aborted) {
      const err2 = new AbortError(void 0, { cause: options.signal.reason });
      this.once("error", () => {
      });
      await finished(this.destroy(err2));
      throw err2;
    }
    const ac = new AbortController();
    const signal = ac.signal;
    if (options?.signal)
      options.signal.addEventListener("abort", () => ac.abort(), { once: true });
    let gotAnyItem = false;
    try {
      for await (const value of this) {
        gotAnyItem = true;
        if (options?.signal?.aborted)
          throw new AbortError();
        if (!hasInitialValue) {
          initialValue = value;
          hasInitialValue = true;
        } else {
          initialValue = await reducer(initialValue, value, { signal });
        }
      }
      if (!gotAnyItem && !hasInitialValue) {
        const err2 = new ERR_MISSING_ARGS("reduce");
        err2.message = "Reduce of an empty stream requires an initial value";
        throw err2;
      }
    } finally {
      ac.abort();
    }
    return initialValue;
  }
  var streamReturningOperators = { drop, filter, flatMap, map, take };
  var promiseReturningOperators = { every, forEach, reduce, toArray, some, find };
  function define(Readable2, key, fn) {
    Object.defineProperty(fn, "name", { value: key });
    Object.defineProperty(Readable2.prototype, key, { value: fn, enumerable: false, configurable: true, writable: true });
  }
  function installOperators(Readable2) {
    for (const [key, op] of Object.entries(streamReturningOperators)) {
      define(Readable2, key, function(...args) {
        if (new.target)
          throw new ERR_ILLEGAL_CONSTRUCTOR();
        return Readable2.from(op.apply(this, args));
      });
    }
    for (const [key, op] of Object.entries(promiseReturningOperators)) {
      define(Readable2, key, function(...args) {
        if (new.target)
          throw new ERR_ILLEGAL_CONSTRUCTOR();
        return op.apply(this, args);
      });
    }
  }

  // node_modules/@zenfs/streams/dist/state.js
  var defaultBytes = 64 * 1024;
  var defaultObjects = 16;
  function getDefaultHighWaterMark(objectMode) {
    return objectMode ? defaultObjects : defaultBytes;
  }
  function getHighWaterMark(objectMode, options, duplexKey, isDuplex) {
    const hwm = options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
    if (hwm == null)
      return getDefaultHighWaterMark(objectMode);
    if (!Number.isInteger(hwm) || hwm < 0)
      throw new ERR_INVALID_ARG_VALUE(isDuplex ? `options.${duplexKey}` : "options.highWaterMark", hwm);
    return Math.floor(hwm);
  }

  // node_modules/@zenfs/streams/dist/string_decoder.js
  var import_buffer7 = __toESM(require_buffer(), 1);
  function normalizeEncoding(encoding) {
    if (encoding == null || encoding === "utf8" || encoding === "utf-8")
      return "utf8";
    switch (encoding.length > 8 ? encoding.toLowerCase() : encoding) {
      case "utf8":
      case "utf-8":
        return "utf8";
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return "utf16le";
      case "latin1":
      case "binary":
        return "latin1";
      case "base64":
        return "base64";
      case "base64url":
        return "base64url";
      case "ascii":
        return "ascii";
      case "hex":
        return "hex";
      default:
        return encoding.toLowerCase() === encoding ? void 0 : normalizeEncoding(encoding.toLowerCase());
    }
  }
  var groupSize = { base64: 3, base64url: 3 };
  var _decoder, _pending, _StringDecoder_instances, writeUTF16_fn;
  var StringDecoder = class {
    constructor(encoding) {
      __privateAdd(this, _StringDecoder_instances);
      __publicField(this, "encoding");
      __privateAdd(this, _decoder);
      /** Bytes held back because they do not yet form a whole character. */
      __privateAdd(this, _pending);
      const normalized = normalizeEncoding(encoding);
      if (normalized === void 0)
        throw new ERR_UNKNOWN_ENCODING(encoding);
      this.encoding = normalized;
      if (normalized === "utf8")
        __privateSet(this, _decoder, new TextDecoder("utf-8", { ignoreBOM: true }));
    }
    write(buf) {
      if (typeof buf === "string")
        return buf;
      if (!ArrayBuffer.isView(buf))
        throw new ERR_INVALID_ARG_TYPE("buf", ["string", "Buffer", "TypedArray", "DataView"], buf);
      if (__privateGet(this, _decoder))
        return __privateGet(this, _decoder).decode(buf, { stream: true });
      let chunk = import_buffer7.Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
      if (__privateGet(this, _pending)) {
        chunk = import_buffer7.Buffer.concat([__privateGet(this, _pending), chunk]);
        __privateSet(this, _pending, void 0);
      }
      if (this.encoding === "utf16le")
        return __privateMethod(this, _StringDecoder_instances, writeUTF16_fn).call(this, chunk);
      const size = groupSize[this.encoding];
      if (!size)
        return chunk.toString(this.encoding);
      const partial = chunk.length % size;
      if (!partial)
        return chunk.toString(this.encoding);
      __privateSet(this, _pending, import_buffer7.Buffer.from(chunk.subarray(chunk.length - partial)));
      return chunk.toString(this.encoding, 0, chunk.length - partial);
    }
    end(buf) {
      let result = buf === void 0 ? "" : this.write(buf);
      if (__privateGet(this, _decoder))
        return result + __privateGet(this, _decoder).decode();
      if (__privateGet(this, _pending)) {
        if (this.encoding !== "utf16le")
          result += __privateGet(this, _pending).toString(this.encoding);
        else if (__privateGet(this, _pending).length === 2)
          result += __privateGet(this, _pending).toString("utf16le");
        __privateSet(this, _pending, void 0);
      }
      return result;
    }
  };
  _decoder = new WeakMap();
  _pending = new WeakMap();
  _StringDecoder_instances = new WeakSet();
  writeUTF16_fn = function(chunk) {
    if (chunk.length % 2 !== 0) {
      __privateSet(this, _pending, import_buffer7.Buffer.from(chunk.subarray(chunk.length - 1)));
      return chunk.toString("utf16le", 0, chunk.length - 1);
    }
    const text = chunk.toString("utf16le");
    const last = text.charCodeAt(text.length - 1);
    if (last >= 55296 && last <= 56319) {
      __privateSet(this, _pending, import_buffer7.Buffer.from(chunk.subarray(chunk.length - 2)));
      return text.slice(0, -1);
    }
    return text;
  };

  // node_modules/@zenfs/streams/dist/readable.js
  var kEnded = 1 << 9;
  var kEndEmitted = 1 << 10;
  var kReading = 1 << 11;
  var kSync = 1 << 12;
  var kNeedReadable = 1 << 13;
  var kEmittedReadable = 1 << 14;
  var kReadableListening = 1 << 15;
  var kResumeScheduled = 1 << 16;
  var kMultiAwaitDrain = 1 << 17;
  var kReadingMore = 1 << 18;
  var kDataEmitted = 1 << 19;
  var kDefaultUTF8Encoding = 1 << 20;
  var kDecoder = 1 << 21;
  var kEncoding = 1 << 22;
  var kHasFlowing = 1 << 23;
  var kFlowing = 1 << 24;
  var kHasPaused = 1 << 25;
  var kPaused = 1 << 26;
  var kDataListening = 1 << 27;
  var kEndScheduled = 1 << 28;
  var kEofReadablePending = 1 << 29;
  var kErroredValue = Symbol("kErroredValue");
  var kDefaultEncodingValue = Symbol("kDefaultEncodingValue");
  var kDecoderValue = Symbol("kDecoderValue");
  var kEncodingValue = Symbol("kEncodingValue");
  var _a8, _b, _c, _d, _e;
  var ReadableState = class {
    constructor(options, stream, isDuplex) {
      __publicField(this, _e);
      __publicField(this, _d, null);
      __publicField(this, _c, "utf8");
      __publicField(this, _b, null);
      __publicField(this, _a8, null);
      /** The point at which `_read()` stops being called ahead of demand. */
      __publicField(this, "highWaterMark");
      __publicField(this, "buffer", []);
      __publicField(this, "bufferIndex", 0);
      __publicField(this, "length", 0);
      __publicField(this, "pipes", []);
      /** The destination(s) whose `drain` we are waiting on before resuming flow. */
      __publicField(this, "awaitDrainWriters", null);
      /** `false` on a Duplex whose readable side was disabled at construction. */
      __publicField(this, "readable");
      this[kState] = kEmitClose | kAutoDestroy | kConstructed | kSync;
      if (options?.objectMode)
        this[kState] |= kObjectMode;
      if (isDuplex && options?.readableObjectMode)
        this[kState] |= kObjectMode;
      this.highWaterMark = options ? getHighWaterMark(this.objectMode, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      if (options?.emitClose === false)
        this[kState] &= ~kEmitClose;
      if (options?.autoDestroy === false)
        this[kState] &= ~kAutoDestroy;
      const defaultEncoding = options?.defaultEncoding;
      if (defaultEncoding == null || defaultEncoding === "utf8" || defaultEncoding === "utf-8") {
        this[kState] |= kDefaultUTF8Encoding;
      } else if (import_buffer8.Buffer.isEncoding(defaultEncoding)) {
        this.defaultEncoding = defaultEncoding;
      } else {
        throw new ERR_UNKNOWN_ENCODING(defaultEncoding);
      }
      if (options?.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    get objectMode() {
      return (this[kState] & kObjectMode) !== 0;
    }
    /** Set once `push(null)` has been seen. */
    get ended() {
      return (this[kState] & kEnded) !== 0;
    }
    set ended(value) {
      if (value)
        this[kState] |= kEnded;
      else
        this[kState] &= ~kEnded;
    }
    get endEmitted() {
      return (this[kState] & kEndEmitted) !== 0;
    }
    set endEmitted(value) {
      if (value)
        this[kState] |= kEndEmitted;
      else
        this[kState] &= ~kEndEmitted;
    }
    /** Whether a `_read()` call is outstanding. */
    get reading() {
      return (this[kState] & kReading) !== 0;
    }
    set reading(value) {
      if (value)
        this[kState] |= kReading;
      else
        this[kState] &= ~kReading;
    }
    get constructed() {
      return (this[kState] & kConstructed) !== 0;
    }
    set constructed(value) {
      if (value)
        this[kState] |= kConstructed;
      else
        this[kState] &= ~kConstructed;
    }
    get sync() {
      return (this[kState] & kSync) !== 0;
    }
    set sync(value) {
      if (value)
        this[kState] |= kSync;
      else
        this[kState] &= ~kSync;
    }
    get needReadable() {
      return (this[kState] & kNeedReadable) !== 0;
    }
    set needReadable(value) {
      if (value)
        this[kState] |= kNeedReadable;
      else
        this[kState] &= ~kNeedReadable;
    }
    get emittedReadable() {
      return (this[kState] & kEmittedReadable) !== 0;
    }
    set emittedReadable(value) {
      if (value)
        this[kState] |= kEmittedReadable;
      else
        this[kState] &= ~kEmittedReadable;
    }
    get readableListening() {
      return (this[kState] & kReadableListening) !== 0;
    }
    get resumeScheduled() {
      return (this[kState] & kResumeScheduled) !== 0;
    }
    get errorEmitted() {
      return (this[kState] & kErrorEmitted) !== 0;
    }
    set errorEmitted(value) {
      if (value)
        this[kState] |= kErrorEmitted;
      else
        this[kState] &= ~kErrorEmitted;
    }
    get emitClose() {
      return (this[kState] & kEmitClose) !== 0;
    }
    get autoDestroy() {
      return (this[kState] & kAutoDestroy) !== 0;
    }
    get destroyed() {
      return (this[kState] & kDestroyed) !== 0;
    }
    set destroyed(value) {
      if (value)
        this[kState] |= kDestroyed;
      else
        this[kState] &= ~kDestroyed;
    }
    get closed() {
      return (this[kState] & kClosed) !== 0;
    }
    set closed(value) {
      if (value)
        this[kState] |= kClosed;
      else
        this[kState] &= ~kClosed;
    }
    get closeEmitted() {
      return (this[kState] & kCloseEmitted) !== 0;
    }
    set closeEmitted(value) {
      if (value)
        this[kState] |= kCloseEmitted;
      else
        this[kState] &= ~kCloseEmitted;
    }
    get multiAwaitDrain() {
      return (this[kState] & kMultiAwaitDrain) !== 0;
    }
    get readingMore() {
      return (this[kState] & kReadingMore) !== 0;
    }
    /** Whether any `data` event has been emitted. */
    get dataEmitted() {
      return (this[kState] & kDataEmitted) !== 0;
    }
    get errored() {
      return (this[kState] & kErrored) !== 0 ? this[kErroredValue] : null;
    }
    set errored(value) {
      if (value) {
        this[kErroredValue] = value;
        this[kState] |= kErrored;
      } else {
        this[kState] &= ~kErrored;
      }
    }
    get defaultEncoding() {
      return (this[kState] & kDefaultUTF8Encoding) !== 0 ? "utf8" : this[kDefaultEncodingValue];
    }
    set defaultEncoding(value) {
      if (value === "utf8" || value === "utf-8") {
        this[kState] |= kDefaultUTF8Encoding;
      } else {
        this[kState] &= ~kDefaultUTF8Encoding;
        this[kDefaultEncodingValue] = value;
      }
    }
    get decoder() {
      return (this[kState] & kDecoder) !== 0 ? this[kDecoderValue] : null;
    }
    set decoder(value) {
      if (value) {
        this[kDecoderValue] = value;
        this[kState] |= kDecoder;
      } else {
        this[kState] &= ~kDecoder;
      }
    }
    get encoding() {
      return (this[kState] & kEncoding) !== 0 ? this[kEncodingValue] : null;
    }
    set encoding(value) {
      if (value) {
        this[kEncodingValue] = value;
        this[kState] |= kEncoding;
      } else {
        this[kState] &= ~kEncoding;
      }
    }
    /** `null` until the stream has been resumed or paused. */
    get flowing() {
      return (this[kState] & kHasFlowing) !== 0 ? (this[kState] & kFlowing) !== 0 : null;
    }
    set flowing(value) {
      if (value == null) {
        this[kState] &= ~(kHasFlowing | kFlowing);
      } else if (value) {
        this[kState] |= kHasFlowing | kFlowing;
      } else {
        this[kState] |= kHasFlowing;
        this[kState] &= ~kFlowing;
      }
    }
    get paused() {
      return (this[kState] & kPaused) !== 0;
    }
    set paused(value) {
      this[kState] |= kHasPaused;
      if (value)
        this[kState] |= kPaused;
      else
        this[kState] &= ~kPaused;
    }
    get pipesCount() {
      return this.pipes.length;
    }
    [(_e = kState, _d = kErroredValue, _c = kDefaultEncodingValue, _b = kDecoderValue, _a8 = kEncodingValue, kOnConstructed)](stream) {
      if ((this[kState] & kNeedReadable) !== 0)
        maybeReadMore(stream, this);
    }
  };
  var _Readable = class _Readable extends Stream {
    constructor(options) {
      super(options);
      __publicField(this, "_readableState");
      this._readableState = new ReadableState(options, this, false);
      if (options) {
        if (typeof options.read === "function")
          this._read = options.read;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.construct === "function")
          this._construct = options.construct;
        if (options.signal)
          addAbortSignal(options.signal, this);
      }
      if (this._construct != null)
        construct(this, () => this._readableState[kOnConstructed](this));
    }
    destroy(error2, callback) {
      destroy.call(this, error2, callback);
      return this;
    }
    _undestroy() {
      undestroy.call(this);
    }
    _destroy(error2, callback) {
      callback(error2);
    }
    [captureRejectionSymbol](err2) {
      this.destroy(err2);
    }
    async [Symbol.asyncDispose]() {
      let error2 = null;
      if (!this.destroyed) {
        error2 = this.readableEnded ? null : new AbortError();
        this.destroy(error2);
      }
      await new Promise((resolve4, reject) => eos(this, (err2) => err2 && err2 !== error2 ? reject(err2) : resolve4()));
    }
    /**
     * Adds a chunk to the read buffer, or ends the stream when passed `null`.
     * Returns `false` once the high water mark is reached.
     */
    push(chunk, encoding) {
      const state = this._readableState;
      return (state[kState] & kObjectMode) === 0 ? pushByteMode(this, state, chunk, encoding) : pushObjectMode(this, state, chunk, encoding);
    }
    /** Returns a chunk to the front of the read buffer. Should only ever be a chunk that came out of `read()`. */
    unshift(chunk, encoding) {
      const state = this._readableState;
      return (state[kState] & kObjectMode) === 0 ? unshiftByteMode(this, state, chunk, encoding) : unshiftObjectMode(this, state, chunk);
    }
    isPaused() {
      const state = this._readableState[kState];
      return (state & kPaused) !== 0 || (state & (kHasFlowing | kFlowing)) === kHasFlowing;
    }
    /** Makes the stream emit strings in `encoding` rather than Buffers, without splitting characters. */
    setEncoding(encoding) {
      const state = this._readableState;
      const decoder2 = new StringDecoder(encoding);
      state.decoder = decoder2;
      state.encoding = state.decoder.encoding;
      let content = "";
      for (const data of state.buffer.slice(state.bufferIndex))
        content += decoder2.write(data);
      if ((state[kState] & kEnded) !== 0)
        content += decoder2.end();
      state.buffer.length = 0;
      state.bufferIndex = 0;
      if (content !== "")
        state.buffer.push(content);
      state.length = content.length;
      return this;
    }
    read(n) {
      if (n === void 0 || n === null)
        n = NaN;
      else if (!Number.isInteger(n))
        n = Number.parseInt(n, 10);
      const state = this._readableState;
      const nOrig = n;
      if (n > state.highWaterMark)
        state.highWaterMark = computeNewHighWaterMark(n);
      if (n !== 0)
        state[kState] &= ~(kEmittedReadable | kEofReadablePending);
      const stateLength = state.length;
      if (n === 0 && (state[kState] & kNeedReadable) !== 0 && ((state.highWaterMark !== 0 ? stateLength >= state.highWaterMark : stateLength > 0) || (state[kState] & kEnded) !== 0)) {
        if (stateLength === 0 && (state[kState] & kEnded) !== 0)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && (state[kState] & kEnded) !== 0) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      const wantMore = (state[kState] & kNeedReadable) !== 0 || state.length === 0 || state.length - n < state.highWaterMark;
      const canRead = (state[kState] & (kReading | kEnded | kDestroyed | kErrored | kConstructed)) === kConstructed;
      if (wantMore && canRead) {
        state[kState] |= kReading | kSync;
        if (state.length === 0)
          state[kState] |= kNeedReadable;
        try {
          this._read(state.highWaterMark);
        } catch (err2) {
          errorOrDestroy(this, err2);
        }
        state[kState] &= ~kSync;
        if ((state[kState] & kReading) === 0)
          n = howMuchToRead(nOrig, state);
      }
      const ret = n > 0 ? fromList(n, state) : null;
      if (ret === null) {
        state[kState] |= state.length <= state.highWaterMark ? kNeedReadable : 0;
        n = 0;
      } else {
        state.length -= n;
        if ((state[kState] & kMultiAwaitDrain) !== 0)
          state.awaitDrainWriters.clear();
        else
          state.awaitDrainWriters = null;
      }
      if (state.length === 0) {
        if ((state[kState] & kEnded) === 0)
          state[kState] |= kNeedReadable;
        if (nOrig !== n && (state[kState] & kEnded) !== 0)
          endReadable(this);
      }
      if (ret !== null && (state[kState] & (kErrorEmitted | kCloseEmitted)) === 0) {
        state[kState] |= kDataEmitted;
        this.emit("data", ret);
      }
      return ret;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the contract subclasses implement
    _read(size) {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
    }
    pipe(dest, pipeOpts) {
      const src = this;
      const state = this._readableState;
      if (state.pipes.length === 1 && (state[kState] & kMultiAwaitDrain) === 0) {
        state[kState] |= kMultiAwaitDrain;
        state.awaitDrainWriters = new Set(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
      }
      state.pipes.push(dest);
      const doEnd = pipeOpts?.end !== false;
      const endFn = doEnd ? onend : unpipe;
      if ((state[kState] & kEndEmitted) !== 0)
        nextTick(endFn);
      else
        src.once("end", endFn);
      dest.on("unpipe", onunpipe);
      function onunpipe(readable, unpipeInfo) {
        if (readable !== src)
          return;
        if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
          unpipeInfo.hasUnpiped = true;
          cleanup();
        }
      }
      function onend() {
        dest.end();
      }
      let ondrain;
      let cleanedUp = false;
      function cleanup() {
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        if (ondrain)
          dest.removeListener("drain", ondrain);
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (ondrain && state.awaitDrainWriters)
          ondrain();
      }
      function pause() {
        if (!cleanedUp) {
          if (state.pipes.length === 1 && state.pipes[0] === dest) {
            state.awaitDrainWriters = dest;
            state[kState] &= ~kMultiAwaitDrain;
          } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
            state.awaitDrainWriters.add(dest);
          }
          src.pause();
        }
        if (!ondrain) {
          ondrain = pipeOnDrain(src, dest);
          dest.on("drain", ondrain);
        }
      }
      src.on("data", ondata);
      function ondata(chunk) {
        try {
          if (dest.write(chunk) === false)
            pause();
        } catch (error2) {
          dest.destroy?.(error2);
        }
      }
      function onerror(er) {
        unpipe();
        dest.removeListener("error", onerror);
        if (dest.listenerCount?.("error") !== 0)
          return;
        const s = dest._writableState || dest._readableState;
        if (s && !s.errorEmitted)
          errorOrDestroy(dest, er);
        else
          dest.emit("error", er);
      }
      prependListener(dest, "error", onerror);
      function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
      }
      dest.once?.("close", onclose);
      function onfinish() {
        dest.removeListener("close", onclose);
        unpipe();
      }
      dest.once?.("finish", onfinish);
      function unpipe() {
        src.unpipe(dest);
      }
      dest.emit("pipe", src);
      if (dest.writableNeedDrain === true)
        pause();
      else if ((state[kState] & kFlowing) === 0)
        src.resume();
      return dest;
    }
    unpipe(dest) {
      const state = this._readableState;
      if (state.pipes.length === 0)
        return this;
      if (!dest) {
        const dests = state.pipes;
        state.pipes = [];
        this.pause();
        for (const d of dests)
          d.emit("unpipe", this, { hasUnpiped: false });
        return this;
      }
      const index = state.pipes.indexOf(dest);
      if (index === -1)
        return this;
      state.pipes.splice(index, 1);
      if (state.pipes.length === 0)
        this.pause();
      dest.emit("unpipe", this, { hasUnpiped: false });
      return this;
    }
    on(ev, fn) {
      const res = super.on(ev, fn);
      const state = this._readableState;
      if (ev === "data") {
        state[kState] |= kDataListening;
        state[kState] |= this.listenerCount("readable") > 0 ? kReadableListening : 0;
        if ((state[kState] & (kHasFlowing | kFlowing)) !== kHasFlowing)
          this.resume();
      } else if (ev === "readable" && (state[kState] & (kEndEmitted | kReadableListening)) === 0) {
        state[kState] |= kReadableListening | kNeedReadable | kHasFlowing;
        state[kState] &= ~(kFlowing | kEmittedReadable);
        if (state.length) {
          emitReadable(this);
        } else {
          if ((state[kState] & kEofReadablePending) !== 0) {
            state[kState] &= ~kEofReadablePending;
            emitReadable(this);
          }
          if ((state[kState] & kReading) === 0)
            nextTick(nReadingNextTick, this);
        }
      }
      return res;
    }
    addListener(ev, fn) {
      return this.on(ev, fn);
    }
    removeListener(ev, fn) {
      const res = super.removeListener(ev, fn);
      if (ev === "readable") {
        nextTick(updateReadableListening, this);
      } else if (ev === "data" && this.listenerCount("data") === 0) {
        this._readableState[kState] &= ~kDataListening;
      }
      return res;
    }
    off(ev, fn) {
      return this.removeListener(ev, fn);
    }
    removeAllListeners(ev) {
      const res = super.removeAllListeners(ev);
      if (ev === "readable" || ev === void 0)
        nextTick(updateReadableListening, this);
      return res;
    }
    /** Switches the stream into flowing mode. */
    resume() {
      const state = this._readableState;
      if ((state[kState] & kDestroyed) !== 0)
        return this;
      if ((state[kState] & kFlowing) === 0) {
        state[kState] |= kHasFlowing;
        if ((state[kState] & kReadableListening) === 0)
          state[kState] |= kFlowing;
        else
          state[kState] &= ~kFlowing;
        resume(this, state);
      }
      state[kState] |= kHasPaused;
      state[kState] &= ~kPaused;
      return this;
    }
    pause() {
      const state = this._readableState;
      if ((state[kState] & kDestroyed) !== 0)
        return this;
      if ((state[kState] & (kHasFlowing | kFlowing)) !== kHasFlowing) {
        state[kState] |= kHasFlowing;
        state[kState] &= ~kFlowing;
        this.emit("pause");
      }
      state[kState] |= kHasPaused | kPaused;
      return this;
    }
    /** Uses an old-style (pre-streams2) stream as this stream's data source. */
    wrap(stream) {
      let paused = false;
      stream.on("data", (chunk) => {
        if (!this.push(chunk) && stream.pause) {
          paused = true;
          stream.pause();
        }
      });
      stream.on("end", () => void this.push(null));
      stream.on("error", (err2) => errorOrDestroy(this, err2));
      stream.on("close", () => void this.destroy());
      stream.on("destroy", () => void this.destroy());
      this._read = () => {
        if (paused && stream.resume) {
          paused = false;
          stream.resume();
        }
      };
      for (const key of Object.keys(stream)) {
        if (this[key] === void 0 && typeof stream[key] === "function") {
          this[key] = stream[key].bind(stream);
        }
      }
      return this;
    }
    [Symbol.asyncIterator]() {
      return streamToAsyncIterator(this);
    }
    iterator(options) {
      if (options !== void 0)
        validateObject(options, "options");
      return streamToAsyncIterator(this, options);
    }
    get readable() {
      const r = this._readableState;
      return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
    }
    set readable(value) {
      if (this._readableState)
        this._readableState.readable = !!value;
    }
    get readableDidRead() {
      return this._readableState.dataEmitted;
    }
    get readableAborted() {
      const r = this._readableState;
      return !!(r.readable !== false && (r.destroyed || r.errored) && !r.endEmitted);
    }
    get readableHighWaterMark() {
      return this._readableState.highWaterMark;
    }
    get readableBuffer() {
      return this._readableState?.buffer;
    }
    get readableFlowing() {
      return this._readableState.flowing;
    }
    set readableFlowing(value) {
      if (this._readableState)
        this._readableState.flowing = value;
    }
    get readableLength() {
      return this._readableState.length;
    }
    get readableObjectMode() {
      return this._readableState ? this._readableState.objectMode : false;
    }
    get readableEncoding() {
      return this._readableState ? this._readableState.encoding : null;
    }
    get errored() {
      return this._readableState ? this._readableState.errored : null;
    }
    get closed() {
      return this._readableState ? this._readableState.closed : false;
    }
    get destroyed() {
      return this._readableState ? this._readableState.destroyed : false;
    }
    set destroyed(value) {
      if (this._readableState)
        this._readableState.destroyed = value;
    }
    get readableEnded() {
      return this._readableState ? this._readableState.endEmitted : false;
    }
    /** Builds a Readable from an iterable, async iterable, string or Buffer. */
    static from(iterable, options) {
      return from(_Readable, iterable, options);
    }
    static isDisturbed(stream) {
      return isDisturbed(stream);
    }
    /** Wraps an old-style stream, or any object with a compatible `data`/`end` event surface. */
    static wrap(src, options) {
      return new _Readable({
        objectMode: src.readableObjectMode ?? src.objectMode ?? true,
        ...options,
        destroy(err2, callback) {
          destroyer(src, err2);
          callback(err2);
        }
      }).wrap(src);
    }
    /** Wraps a WHATWG `ReadableStream`. */
    static fromWeb(readableStream, options) {
      if (!isReadableStream(readableStream))
        throw new ERR_INVALID_ARG_TYPE("readableStream", "ReadableStream", readableStream);
      const reader = readableStream.getReader();
      let closed = false;
      const readable = new _Readable({
        objectMode: false,
        ...options,
        read() {
          reader.read().then((chunk) => {
            if (chunk.done)
              readable.push(null);
            else
              readable.push(chunk.value);
          }, (error2) => destroyer(readable, error2));
        },
        destroy(error2, callback) {
          const done = () => callback(error2);
          if (closed)
            done();
          else
            reader.cancel(error2 ?? void 0).then(done, done);
        }
      });
      reader.closed.then(() => closed = true, (error2) => {
        closed = true;
        destroyer(readable, error2);
      });
      return readable;
    }
    /** Exposes this stream as a WHATWG `ReadableStream`. */
    static toWeb(streamReadable, options = {}) {
      const objectMode = streamReadable.readableObjectMode;
      const highWaterMark = streamReadable.readableHighWaterMark;
      const strategy = options.strategy ?? (objectMode ? new CountQueuingStrategy({ highWaterMark }) : new ByteLengthQueuingStrategy({ highWaterMark }));
      let controller;
      const closed = Promise.withResolvers();
      streamReadable.pause();
      const cleanup = eos(streamReadable, (error2) => {
        if (error2?.code === "ERR_STREAM_PREMATURE_CLOSE") {
          error2 = new AbortError(void 0, { cause: error2 });
        }
        cleanup();
        streamReadable.on("error", () => {
        });
        if (error2) {
          controller.error(error2);
          closed.reject(error2);
        } else {
          controller.close();
          closed.resolve();
        }
      });
      streamReadable.on("data", (chunk) => {
        controller.enqueue(objectMode || typeof chunk === "string" ? chunk : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        if ((controller.desiredSize ?? 0) <= 0)
          streamReadable.pause();
      });
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
        pull() {
          streamReadable.resume();
        },
        cancel(reason) {
          destroyer(streamReadable, reason);
        }
      }, strategy);
      return trackClosed(stream, closed.promise);
    }
    [toAsyncStreamable]() {
      const state = this._readableState;
      const iter = createBatchedAsyncIterator(this, state.objectMode || state.encoding ? normalizeBatch : null);
      iter.stream = this;
      return iter;
    }
  };
  __publicField(_Readable, "ReadableState", ReadableState);
  /** Exposed for tests. */
  __publicField(_Readable, "_fromList", fromList);
  var Readable = _Readable;
  installOperators(Readable);
  function unshiftByteMode(stream, state, chunk, encoding) {
    if (chunk === null) {
      state[kState] &= ~kReading;
      onEofChunk(stream, state);
      return false;
    }
    if (typeof chunk === "string") {
      encoding || (encoding = state.defaultEncoding);
      if (state.encoding !== encoding) {
        chunk = state.encoding ? import_buffer8.Buffer.from(chunk, encoding).toString(state.encoding) : import_buffer8.Buffer.from(chunk, encoding);
      }
    } else if (ArrayBuffer.isView(chunk)) {
      chunk = import_buffer8.Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    } else if (chunk !== void 0 && !(chunk instanceof import_buffer8.Buffer)) {
      errorOrDestroy(stream, new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "TypedArray", "DataView"], chunk));
      return false;
    }
    if (!(chunk && chunk.length > 0))
      return canPushMore(state);
    return unshiftValue(stream, state, chunk);
  }
  function unshiftObjectMode(stream, state, chunk) {
    if (chunk === null) {
      state[kState] &= ~kReading;
      onEofChunk(stream, state);
      return false;
    }
    return unshiftValue(stream, state, chunk);
  }
  function unshiftValue(stream, state, chunk) {
    if ((state[kState] & kEndEmitted) !== 0)
      errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
    else if ((state[kState] & (kDestroyed | kErrored)) !== 0)
      return false;
    else
      addChunk(stream, state, chunk, true);
    return canPushMore(state);
  }
  function pushByteMode(stream, state, chunk, encoding) {
    if (chunk === null) {
      state[kState] &= ~kReading;
      onEofChunk(stream, state);
      return false;
    }
    if (typeof chunk === "string") {
      encoding || (encoding = state.defaultEncoding);
      if (state.encoding !== encoding) {
        chunk = import_buffer8.Buffer.from(chunk, encoding);
        encoding = "";
      }
    } else if (chunk instanceof import_buffer8.Buffer) {
      encoding = "";
    } else if (ArrayBuffer.isView(chunk)) {
      chunk = import_buffer8.Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      encoding = "";
    } else if (chunk !== void 0) {
      errorOrDestroy(stream, new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "TypedArray", "DataView"], chunk));
      return false;
    }
    if (!chunk || chunk.length <= 0) {
      state[kState] &= ~kReading;
      maybeReadMore(stream, state);
      return canPushMore(state);
    }
    if ((state[kState] & kEnded) !== 0) {
      errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      return false;
    }
    if ((state[kState] & (kDestroyed | kErrored)) !== 0)
      return false;
    state[kState] &= ~kReading;
    if ((state[kState] & kDecoder) !== 0 && !encoding) {
      chunk = state[kDecoderValue].write(chunk);
      if (chunk.length === 0) {
        maybeReadMore(stream, state);
        return canPushMore(state);
      }
    }
    addChunk(stream, state, chunk, false);
    return canPushMore(state);
  }
  function pushObjectMode(stream, state, chunk, encoding) {
    if (chunk === null) {
      state[kState] &= ~kReading;
      onEofChunk(stream, state);
      return false;
    }
    if ((state[kState] & kEnded) !== 0) {
      errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      return false;
    }
    if ((state[kState] & (kDestroyed | kErrored)) !== 0)
      return false;
    state[kState] &= ~kReading;
    if ((state[kState] & kDecoder) !== 0 && !encoding)
      chunk = state[kDecoderValue].write(chunk);
    addChunk(stream, state, chunk, false);
    return canPushMore(state);
  }
  function canPushMore(state) {
    return (state[kState] & kEnded) === 0 && (state.length < state.highWaterMark || state.length === 0);
  }
  function addChunk(stream, state, chunk, addToFront) {
    if ((state[kState] & (kFlowing | kSync | kDataListening)) === (kFlowing | kDataListening) && state.length === 0) {
      if ((state[kState] & kMultiAwaitDrain) !== 0)
        state.awaitDrainWriters.clear();
      else
        state.awaitDrainWriters = null;
      state[kState] |= kDataEmitted;
      stream.emit("data", chunk);
    } else {
      state.length += (state[kState] & kObjectMode) !== 0 ? 1 : chunk.length;
      if (addToFront) {
        if (state.bufferIndex > 0)
          state.buffer[--state.bufferIndex] = chunk;
        else
          state.buffer.unshift(chunk);
      } else {
        state.buffer.push(chunk);
      }
      if ((state[kState] & kNeedReadable) !== 0)
        emitReadable(stream);
    }
    maybeReadMore(stream, state);
  }
  var MAX_HWM = 1073741824;
  function computeNewHighWaterMark(n) {
    if (n > MAX_HWM)
      throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return n + 1;
  }
  function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && (state[kState] & kEnded) !== 0)
      return 0;
    if ((state[kState] & kObjectMode) !== 0)
      return 1;
    if (Number.isNaN(n)) {
      if ((state[kState] & kDecoder) === 0 && state.length)
        return state.buffer[state.bufferIndex].length;
      if ((state[kState] & kFlowing) !== 0 && state.length)
        return state.buffer[state.bufferIndex].length;
      return state.length;
    }
    if (n <= state.length)
      return n;
    return (state[kState] & kEnded) !== 0 ? state.length : 0;
  }
  function onEofChunk(stream, state) {
    if ((state[kState] & kEnded) !== 0)
      return;
    const decoder2 = (state[kState] & kDecoder) !== 0 ? state[kDecoderValue] : null;
    if (decoder2) {
      const chunk = decoder2.end();
      if (chunk?.length) {
        state.buffer.push(chunk);
        state.length += (state[kState] & kObjectMode) !== 0 ? 1 : chunk.length;
      }
    }
    state[kState] |= kEnded;
    if ((state[kState] & kSync) !== 0) {
      if ((state[kState] & (kFlowing | kNeedReadable)) !== 0 || stream.listenerCount("readable") > 0) {
        emitReadable(stream);
      } else {
        state[kState] |= kEofReadablePending;
      }
    } else {
      state[kState] &= ~kNeedReadable;
      state[kState] |= kEmittedReadable;
      emitReadable_(stream);
    }
  }
  function emitReadable(stream) {
    const state = stream._readableState;
    state[kState] &= ~kNeedReadable;
    if ((state[kState] & kEmittedReadable) === 0) {
      state[kState] |= kEmittedReadable;
      nextTick(emitReadable_, stream);
    }
  }
  function emitReadable_(stream) {
    const state = stream._readableState;
    if ((state[kState] & (kDestroyed | kErrored)) === 0 && (state.length || (state[kState] & kEnded) !== 0)) {
      stream.emit("readable");
      state[kState] &= ~kEmittedReadable;
    }
    state[kState] |= (state[kState] & (kFlowing | kEnded)) === 0 && state.length <= state.highWaterMark ? kNeedReadable : 0;
    flow(stream);
  }
  function maybeReadMore(stream, state) {
    if ((state[kState] & (kReadingMore | kReading | kConstructed)) === kConstructed) {
      state[kState] |= kReadingMore;
      nextTick(maybeReadMore_, stream, state);
    }
  }
  function maybeReadMore_(stream, state) {
    while ((state[kState] & (kReading | kEnded)) === 0 && (state.length < state.highWaterMark || (state[kState] & kFlowing) !== 0 && state.length === 0)) {
      const len = state.length;
      stream.read(0);
      if (len === state.length)
        break;
    }
    state[kState] &= ~kReadingMore;
  }
  function pipeOnDrain(src, dest) {
    return function pipeOnDrainFunctionResult() {
      const state = src._readableState;
      if (state.awaitDrainWriters === dest)
        state.awaitDrainWriters = null;
      else if ((state[kState] & kMultiAwaitDrain) !== 0)
        state.awaitDrainWriters.delete(dest);
      if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && (state[kState] & kDataListening) !== 0) {
        src.resume();
      }
    };
  }
  function updateReadableListening(self) {
    const state = self._readableState;
    if (self.listenerCount("readable") > 0)
      state[kState] |= kReadableListening;
    else
      state[kState] &= ~kReadableListening;
    if ((state[kState] & (kHasPaused | kPaused | kResumeScheduled)) === (kHasPaused | kResumeScheduled)) {
      state[kState] |= kHasFlowing | kFlowing;
    } else if ((state[kState] & kDataListening) !== 0) {
      self.resume();
    } else if ((state[kState] & kReadableListening) === 0) {
      state[kState] &= ~(kHasFlowing | kFlowing);
    }
  }
  function nReadingNextTick(self) {
    self.read(0);
  }
  function resume(stream, state) {
    if ((state[kState] & kResumeScheduled) === 0) {
      state[kState] |= kResumeScheduled;
      nextTick(resume_, stream, state);
    }
  }
  function resume_(stream, state) {
    if ((state[kState] & kReading) === 0)
      stream.read(0);
    state[kState] &= ~kResumeScheduled;
    stream.emit("resume");
    flow(stream);
    if ((state[kState] & (kFlowing | kReading)) === kFlowing)
      stream.read(0);
  }
  function flow(stream) {
    const state = stream._readableState;
    while ((state[kState] & kFlowing) !== 0 && stream.read() !== null)
      ;
  }
  function fromList(n, state) {
    const stateLength = state.length;
    if (stateLength === 0)
      return null;
    let idx = state.bufferIndex;
    let ret;
    const buf = state.buffer;
    const len = buf.length;
    if ((state[kState] & kObjectMode) !== 0) {
      ret = buf[idx];
      buf[idx++] = null;
    } else if (!n || n >= stateLength) {
      if ((state[kState] & kDecoder) !== 0) {
        ret = "";
        while (idx < len) {
          ret += buf[idx];
          buf[idx++] = null;
        }
      } else if (len - idx === 0) {
        ret = import_buffer8.Buffer.alloc(0);
      } else if (len - idx === 1) {
        ret = buf[idx];
        buf[idx++] = null;
      } else {
        ret = import_buffer8.Buffer.allocUnsafe(stateLength);
        let i = 0;
        while (idx < len) {
          const data = buf[idx];
          ret.set(data, i);
          i += data.length;
          buf[idx++] = null;
        }
      }
    } else {
      const first = buf[idx];
      const firstLength = first.length;
      if (n < firstLength) {
        ret = first.slice(0, n);
        buf[idx] = first.slice(n);
      } else if (n === firstLength) {
        ret = first;
        buf[idx++] = null;
      } else if ((state[kState] & kDecoder) !== 0) {
        ret = "";
        while (idx < len) {
          const str = buf[idx];
          const strLength = str.length;
          if (n > strLength) {
            ret += str;
            n -= strLength;
            buf[idx++] = null;
            continue;
          }
          if (n === strLength) {
            ret += str;
            buf[idx++] = null;
          } else {
            ret += str.slice(0, n);
            buf[idx] = str.slice(n);
          }
          break;
        }
      } else {
        ret = import_buffer8.Buffer.allocUnsafe(n);
        const retLen = n;
        while (idx < len) {
          const data = buf[idx];
          const dataLength = data.length;
          if (n > dataLength) {
            ret.set(data, retLen - n);
            n -= dataLength;
            buf[idx++] = null;
            continue;
          }
          if (n === dataLength) {
            ret.set(data, retLen - n);
            buf[idx++] = null;
          } else {
            ret.set(import_buffer8.Buffer.from(data.buffer, data.byteOffset, n), retLen - n);
            buf[idx] = import_buffer8.Buffer.from(data.buffer, data.byteOffset + n, dataLength - n);
          }
          break;
        }
      }
    }
    if (idx === len) {
      state.buffer.length = 0;
      state.bufferIndex = 0;
    } else if (idx > 1024) {
      state.buffer.splice(0, idx);
      state.bufferIndex = 0;
    } else {
      state.bufferIndex = idx;
    }
    return ret;
  }
  function endReadable(stream) {
    const state = stream._readableState;
    if ((state[kState] & (kEndEmitted | kEndScheduled)) === 0) {
      state[kState] |= kEnded | kEndScheduled;
      nextTick(endReadableNT, state, stream);
    }
  }
  function endReadableNT(state, stream) {
    state[kState] &= ~kEndScheduled;
    if ((state[kState] & (kErrored | kCloseEmitted | kEndEmitted)) !== 0 || state.length !== 0)
      return;
    state[kState] |= kEndEmitted;
    stream.emit("end");
    const s = stream;
    if (s.writable && s.allowHalfOpen === false) {
      nextTick(endWritableNT, stream);
    } else if (state.autoDestroy) {
      const wState = stream._writableState;
      if (!wState || wState.autoDestroy && (wState.finished || wState.writable === false))
        stream.destroy();
    }
  }
  function endWritableNT(stream) {
    const s = stream;
    if (s.writable && !s.writableEnded && !s.destroyed)
      s.end();
  }
  var AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
  }).prototype);
  function streamToAsyncIterator(stream, options) {
    if (typeof stream.read !== "function")
      stream = Readable.wrap(stream, { objectMode: true });
    const iter = createAsyncIterator(stream, options);
    iter.stream = stream;
    return iter;
  }
  function createAsyncIterator(stream, options) {
    let callback = nop;
    let error2;
    let started = false;
    let completed = false;
    let inFlight = false;
    let queue = null;
    let draining = false;
    let cleanup;
    function wakeup(resolve4) {
      if (this === stream) {
        callback();
        callback = nop;
      } else {
        callback = resolve4;
      }
    }
    function start() {
      started = true;
      stream.on("readable", wakeup);
      cleanup = eos(stream, { writable: false }, (err2) => {
        error2 = err2 ? aggregateTwoErrors(error2, err2) ?? null : null;
        callback();
        callback = nop;
      });
    }
    function finalize() {
      completed = true;
      const s = stream;
      const preserveHalfOpenDuplex = error2 === null && s.allowHalfOpen === true && s.writable === true && s.writableEnded !== true;
      if ((error2 || options?.destroyOnReturn !== false) && (error2 === void 0 || stream._readableState.autoDestroy) && !preserveHalfOpenDuplex) {
        destroyer(stream, null);
      } else {
        stream.off("readable", wakeup);
        cleanup();
      }
    }
    function settleError(err2, reject) {
      error2 = aggregateTwoErrors(error2, err2) ?? null;
      finalize();
      reject(error2);
    }
    function drain() {
      if (draining)
        return;
      draining = true;
      try {
        while (!inFlight && queue.length) {
          const req = queue.shift();
          if (req.type === "next")
            processNext(req.resolve, req.reject);
          else if (req.type === "return")
            processReturn(req.value, req.resolve);
          else
            processThrow(req.value, req.reject);
        }
      } finally {
        draining = false;
      }
    }
    function pump(resolve4, reject) {
      const chunk = stream.destroyed ? null : stream.read();
      if (chunk !== null) {
        const then = chunk.then;
        if (typeof then === "function") {
          then.call(chunk, (value) => {
            inFlight = false;
            resolve4({ done: false, value });
            if (queue !== null)
              drain();
          }, (err2) => {
            inFlight = false;
            settleError(err2, reject);
            if (queue !== null)
              drain();
          });
          return;
        }
        inFlight = false;
        resolve4({ done: false, value: chunk });
      } else if (error2) {
        inFlight = false;
        settleError(error2, reject);
      } else if (error2 === null) {
        inFlight = false;
        finalize();
        resolve4({ done: true, value: void 0 });
      } else {
        void new Promise(wakeup).then(() => pump(resolve4, reject));
        return;
      }
      if (queue !== null)
        drain();
    }
    function processNext(resolve4, reject) {
      if (completed) {
        resolve4({ done: true, value: void 0 });
        return;
      }
      if (!started)
        start();
      inFlight = true;
      pump(resolve4, reject);
    }
    function processReturn(value, resolve4) {
      if (!completed) {
        if (started)
          finalize();
        else
          completed = true;
      }
      resolve4({ done: true, value });
    }
    function processThrow(err2, reject) {
      if (completed || !started) {
        completed = true;
        reject(err2);
        return;
      }
      settleError(err2, reject);
    }
    function enqueue(type, value) {
      return new Promise((resolve4, reject) => {
        if (inFlight) {
          queue ?? (queue = []);
          queue.push({ type, value, resolve: resolve4, reject });
        } else if (type === "next") {
          resolve4({ done: true, value: void 0 });
        } else if (type === "return") {
          processReturn(value, resolve4);
        } else {
          processThrow(value, reject);
        }
      });
    }
    return Object.assign(Object.create(AsyncIteratorPrototype), {
      [Symbol.asyncIterator]() {
        return this;
      },
      async [Symbol.asyncDispose]() {
        await this.return(void 0);
      },
      next() {
        if (inFlight || completed)
          return enqueue("next", void 0);
        if (!started)
          start();
        const chunk = stream.destroyed ? null : stream.read();
        if (chunk !== null) {
          const then = chunk.then;
          if (typeof then === "function") {
            inFlight = true;
            return then.call(chunk, (value) => {
              inFlight = false;
              if (queue !== null)
                drain();
              return { done: false, value };
            }, (err2) => {
              inFlight = false;
              error2 = aggregateTwoErrors(error2, err2);
              finalize();
              if (queue !== null)
                drain();
              throw error2;
            });
          }
          return Promise.resolve({ done: false, value: chunk });
        }
        if (error2) {
          finalize();
          return Promise.reject(error2);
        }
        if (error2 === null) {
          finalize();
          return Promise.resolve({ done: true, value: void 0 });
        }
        inFlight = true;
        return new Promise((resolve4, reject) => {
          void new Promise(wakeup).then(() => pump(resolve4, reject));
        });
      },
      return(value) {
        return enqueue("return", value);
      },
      throw(err2) {
        return enqueue("throw", err2);
      }
    });
  }

  // node_modules/@zenfs/streams/dist/writable.js
  var import_buffer9 = __toESM(require_buffer(), 1);
  var kSync2 = 1 << 9;
  var kFinalCalled = 1 << 10;
  var kNeedDrain = 1 << 11;
  var kEnding = 1 << 12;
  var kFinished = 1 << 13;
  var kDecodeStrings = 1 << 14;
  var kWriting = 1 << 15;
  var kBufferProcessing = 1 << 16;
  var kPrefinished = 1 << 17;
  var kAllBuffers = 1 << 18;
  var kAllNoop = 1 << 19;
  var kOnFinished = 1 << 20;
  var kHasWritable = 1 << 21;
  var kWritable = 1 << 22;
  var kCorked = 1 << 23;
  var kDefaultUTF8Encoding2 = 1 << 24;
  var kWriteCb = 1 << 25;
  var kExpectWriteCb = 1 << 26;
  var kAfterWriteTickInfo = 1 << 27;
  var kAfterWritePending = 1 << 28;
  var kBuffered = 1 << 29;
  var kEnded2 = 1 << 30;
  var kErroredValue2 = Symbol("kErroredValue");
  var kDefaultEncodingValue2 = Symbol("kDefaultEncodingValue");
  var kWriteCbValue = Symbol("kWriteCbValue");
  var kAfterWriteTickInfoValue = Symbol("kAfterWriteTickInfoValue");
  var kBufferedValue = Symbol("kBufferedValue");
  var kOnFinishedValue = Symbol("kOnFinishedValue");
  var _a9, _b2, _c2, _d2, _e2, _f, _g;
  var WritableState = class {
    constructor(options, stream, isDuplex) {
      __publicField(this, _g);
      __publicField(this, _f, null);
      __publicField(this, _e2, "utf8");
      __publicField(this, _d2, null);
      __publicField(this, _c2, null);
      __publicField(this, _b2, null);
      __publicField(this, _a9, null);
      /** The point at which `write()` starts returning false. */
      __publicField(this, "highWaterMark");
      /** Bytes (or, in object mode, chunks) waiting to reach `_write()`. */
      __publicField(this, "length", 0);
      __publicField(this, "corked", 0);
      __publicField(this, "writelen", 0);
      /** Number of pending user write callbacks; must reach 0 before `finish`. */
      __publicField(this, "pendingcb", 0);
      __publicField(this, "bufferedIndex", 0);
      __publicField(this, "onwrite");
      this[kState] = kSync2 | kConstructed | kEmitClose | kAutoDestroy;
      if (options?.objectMode)
        this[kState] |= kObjectMode;
      if (isDuplex && options?.writableObjectMode)
        this[kState] |= kObjectMode;
      this.highWaterMark = options ? getHighWaterMark(this.objectMode, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      if (!options || options.decodeStrings !== false)
        this[kState] |= kDecodeStrings;
      if (options?.emitClose === false)
        this[kState] &= ~kEmitClose;
      if (options?.autoDestroy === false)
        this[kState] &= ~kAutoDestroy;
      const defaultEncoding = options?.defaultEncoding;
      if (defaultEncoding == null || defaultEncoding === "utf8" || defaultEncoding === "utf-8") {
        this[kState] |= kDefaultUTF8Encoding2;
      } else if (import_buffer9.Buffer.isEncoding(defaultEncoding)) {
        this[kState] &= ~kDefaultUTF8Encoding2;
        this[kDefaultEncodingValue2] = defaultEncoding;
      } else {
        throw new ERR_UNKNOWN_ENCODING(defaultEncoding);
      }
      this.onwrite = (er) => onwrite(stream, er);
      resetBuffer(this);
    }
    get objectMode() {
      return (this[kState] & kObjectMode) !== 0;
    }
    get finalCalled() {
      return (this[kState] & kFinalCalled) !== 0;
    }
    set finalCalled(value) {
      if (value)
        this[kState] |= kFinalCalled;
      else
        this[kState] &= ~kFinalCalled;
    }
    get needDrain() {
      return (this[kState] & kNeedDrain) !== 0;
    }
    set needDrain(value) {
      if (value)
        this[kState] |= kNeedDrain;
      else
        this[kState] &= ~kNeedDrain;
    }
    /** Set as soon as `end()` is entered. */
    get ending() {
      return (this[kState] & kEnding) !== 0;
    }
    set ending(value) {
      if (value)
        this[kState] |= kEnding;
      else
        this[kState] &= ~kEnding;
    }
    /** Set once `end()` has returned. */
    get ended() {
      return (this[kState] & kEnded2) !== 0;
    }
    set ended(value) {
      if (value)
        this[kState] |= kEnded2;
      else
        this[kState] &= ~kEnded2;
    }
    get finished() {
      return (this[kState] & kFinished) !== 0;
    }
    set finished(value) {
      if (value)
        this[kState] |= kFinished;
      else
        this[kState] &= ~kFinished;
    }
    get destroyed() {
      return (this[kState] & kDestroyed) !== 0;
    }
    set destroyed(value) {
      if (value)
        this[kState] |= kDestroyed;
      else
        this[kState] &= ~kDestroyed;
    }
    get decodeStrings() {
      return (this[kState] & kDecodeStrings) !== 0;
    }
    get writing() {
      return (this[kState] & kWriting) !== 0;
    }
    /** Whether the `_write()` callback fired synchronously. */
    get sync() {
      return (this[kState] & kSync2) !== 0;
    }
    get bufferProcessing() {
      return (this[kState] & kBufferProcessing) !== 0;
    }
    get constructed() {
      return (this[kState] & kConstructed) !== 0;
    }
    set constructed(value) {
      if (value)
        this[kState] |= kConstructed;
      else
        this[kState] &= ~kConstructed;
    }
    get prefinished() {
      return (this[kState] & kPrefinished) !== 0;
    }
    set prefinished(value) {
      if (value)
        this[kState] |= kPrefinished;
      else
        this[kState] &= ~kPrefinished;
    }
    get errorEmitted() {
      return (this[kState] & kErrorEmitted) !== 0;
    }
    set errorEmitted(value) {
      if (value)
        this[kState] |= kErrorEmitted;
      else
        this[kState] &= ~kErrorEmitted;
    }
    get emitClose() {
      return (this[kState] & kEmitClose) !== 0;
    }
    get autoDestroy() {
      return (this[kState] & kAutoDestroy) !== 0;
    }
    get closed() {
      return (this[kState] & kClosed) !== 0;
    }
    set closed(value) {
      if (value)
        this[kState] |= kClosed;
      else
        this[kState] &= ~kClosed;
    }
    get closeEmitted() {
      return (this[kState] & kCloseEmitted) !== 0;
    }
    set closeEmitted(value) {
      if (value)
        this[kState] |= kCloseEmitted;
      else
        this[kState] &= ~kCloseEmitted;
    }
    get allBuffers() {
      return (this[kState] & kAllBuffers) !== 0;
    }
    get allNoop() {
      return (this[kState] & kAllNoop) !== 0;
    }
    get errored() {
      return (this[kState] & kErrored) !== 0 ? this[kErroredValue2] : null;
    }
    set errored(value) {
      if (value) {
        this[kErroredValue2] = value;
        this[kState] |= kErrored;
      } else {
        this[kState] &= ~kErrored;
      }
    }
    /** `false` on a Duplex whose writable side was disabled at construction. */
    get writable() {
      return (this[kState] & kHasWritable) !== 0 ? (this[kState] & kWritable) !== 0 : void 0;
    }
    set writable(value) {
      if (value == null) {
        this[kState] &= ~(kHasWritable | kWritable);
      } else if (value) {
        this[kState] |= kHasWritable | kWritable;
      } else {
        this[kState] |= kHasWritable;
        this[kState] &= ~kWritable;
      }
    }
    get defaultEncoding() {
      return (this[kState] & kDefaultUTF8Encoding2) !== 0 ? "utf8" : this[kDefaultEncodingValue2];
    }
    set defaultEncoding(value) {
      if (value === "utf8" || value === "utf-8") {
        this[kState] |= kDefaultUTF8Encoding2;
      } else {
        this[kState] &= ~kDefaultUTF8Encoding2;
        this[kDefaultEncodingValue2] = value;
      }
    }
    get writecb() {
      return (this[kState] & kWriteCb) !== 0 ? this[kWriteCbValue] : nop;
    }
    set writecb(value) {
      this[kWriteCbValue] = value;
      if (value)
        this[kState] |= kWriteCb;
      else
        this[kState] &= ~kWriteCb;
    }
    get afterWriteTickInfo() {
      return (this[kState] & kAfterWriteTickInfo) !== 0 ? this[kAfterWriteTickInfoValue] : null;
    }
    get buffered() {
      return (this[kState] & kBuffered) !== 0 ? this[kBufferedValue] : [];
    }
    set buffered(value) {
      this[kBufferedValue] = value;
      if (value)
        this[kState] |= kBuffered;
      else
        this[kState] &= ~kBuffered;
    }
    get bufferedRequestCount() {
      return (this[kState] & kBuffered) === 0 ? 0 : this[kBufferedValue].length - this.bufferedIndex;
    }
    getBuffer() {
      return (this[kState] & kBuffered) === 0 ? [] : this[kBufferedValue].slice(this.bufferedIndex);
    }
    [(_g = kState, _f = kErroredValue2, _e2 = kDefaultEncodingValue2, _d2 = kWriteCbValue, _c2 = kAfterWriteTickInfoValue, _b2 = kBufferedValue, _a9 = kOnFinishedValue, kOnConstructed)](stream) {
      if ((this[kState] & kWriting) === 0)
        clearBuffer(stream, this);
      if ((this[kState] & kEnding) !== 0)
        finishMaybe(stream, this);
    }
  };
  function resetBuffer(state) {
    state[kBufferedValue] = null;
    state.bufferedIndex = 0;
    state[kState] |= kAllBuffers | kAllNoop;
    state[kState] &= ~kBuffered;
  }
  var _Writable = class _Writable extends Stream {
    constructor(options) {
      super(options);
      __publicField(this, "_writableState");
      this._writableState = new WritableState(options, this, false);
      if (options) {
        if (typeof options.write === "function")
          this._write = options.write;
        if (typeof options.writev === "function")
          this._writev = options.writev;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.final === "function")
          this._final = options.final;
        if (typeof options.construct === "function")
          this._construct = options.construct;
        if (options.signal)
          addAbortSignal(options.signal, this);
      }
      if (this._construct != null)
        construct(this, () => this._writableState[kOnConstructed](this));
    }
    /** Recognizes a Duplex, which inherits from Readable and so is not a structural subclass. */
    static [Symbol.hasInstance](instance) {
      if (Function.prototype[Symbol.hasInstance].call(this, instance))
        return true;
      if (this !== _Writable)
        return false;
      return !!instance && instance._writableState instanceof WritableState;
    }
    /** Writables are not readable, so piping from one is always an error. */
    pipe(dest) {
      errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
      return dest;
    }
    write(chunk, encoding, callback) {
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      return writeChunk(this, chunk, encoding ?? null, callback) === true;
    }
    /** Buffers writes until a matching number of `uncork()` calls. */
    cork() {
      const state = this._writableState;
      state[kState] |= kCorked;
      state.corked++;
    }
    uncork() {
      const state = this._writableState;
      if (!state.corked)
        return;
      state.corked--;
      if (!state.corked)
        state[kState] &= ~kCorked;
      if ((state[kState] & kWriting) === 0)
        clearBuffer(this, state);
    }
    setDefaultEncoding(encoding) {
      if (typeof encoding === "string")
        encoding = encoding.toLowerCase();
      if (!import_buffer9.Buffer.isEncoding(encoding))
        throw new ERR_UNKNOWN_ENCODING(encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    }
    _write(chunk, encoding, callback) {
      if (this._writev)
        this._writev([{ chunk, encoding }], callback);
      else
        throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
    }
    end(chunk, encoding, callback) {
      const state = this._writableState;
      if (typeof chunk === "function") {
        callback = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      let err2;
      if (chunk != null) {
        const ret = writeChunk(this, chunk, encoding ?? null);
        if (ret instanceof Error)
          err2 = ret;
      }
      if ((state[kState] & kCorked) !== 0) {
        state.corked = 1;
        this.uncork();
      }
      if (err2) {
      } else if ((state[kState] & (kEnding | kErrored)) === 0) {
        state[kState] |= kEnding;
        finishMaybe(this, state, true);
        state[kState] |= kEnded2;
      } else if ((state[kState] & kFinished) !== 0) {
        err2 = new ERR_STREAM_ALREADY_FINISHED("end");
      } else if ((state[kState] & kDestroyed) !== 0) {
        err2 = new ERR_STREAM_DESTROYED("end");
      }
      if (typeof callback === "function") {
        if (err2)
          nextTick(callback, err2);
        else if ((state[kState] & kErrored) !== 0)
          nextTick(callback, state[kErroredValue2]);
        else if ((state[kState] & kFinished) !== 0)
          nextTick(callback, null);
        else {
          state[kState] |= kOnFinished;
          state[kOnFinishedValue] ?? (state[kOnFinishedValue] = []);
          state[kOnFinishedValue].push(callback);
        }
      }
      return this;
    }
    get closed() {
      return this._writableState ? (this._writableState[kState] & kClosed) !== 0 : false;
    }
    get destroyed() {
      return this._writableState ? (this._writableState[kState] & kDestroyed) !== 0 : false;
    }
    set destroyed(value) {
      if (!this._writableState)
        return;
      if (value)
        this._writableState[kState] |= kDestroyed;
      else
        this._writableState[kState] &= ~kDestroyed;
    }
    get writable() {
      const w = this._writableState;
      return !!w && w.writable !== false && (w[kState] & (kEnding | kEnded2 | kDestroyed | kErrored)) === 0;
    }
    set writable(value) {
      if (this._writableState)
        this._writableState.writable = !!value;
    }
    get writableFinished() {
      return this._writableState ? (this._writableState[kState] & kFinished) !== 0 : false;
    }
    get writableObjectMode() {
      return this._writableState ? (this._writableState[kState] & kObjectMode) !== 0 : false;
    }
    get writableBuffer() {
      return this._writableState?.getBuffer();
    }
    get writableEnded() {
      return this._writableState ? (this._writableState[kState] & kEnding) !== 0 : false;
    }
    get writableNeedDrain() {
      return this._writableState ? (this._writableState[kState] & (kDestroyed | kEnding | kNeedDrain)) === kNeedDrain : false;
    }
    get writableHighWaterMark() {
      return this._writableState?.highWaterMark;
    }
    get writableCorked() {
      return this._writableState ? this._writableState.corked : 0;
    }
    get writableLength() {
      return this._writableState?.length;
    }
    get errored() {
      return this._writableState ? this._writableState.errored : null;
    }
    get writableAborted() {
      const state = this._writableState[kState];
      return (state & (kHasWritable | kWritable)) !== kHasWritable && (state & (kDestroyed | kErrored)) !== 0 && (state & kFinished) === 0;
    }
    destroy(error2, callback) {
      const state = this._writableState;
      if ((state[kState] & (kBuffered | kOnFinished)) !== 0 && (state[kState] & kDestroyed) === 0)
        nextTick(errorBuffer, state);
      destroy.call(this, error2, callback);
      return this;
    }
    _undestroy() {
      undestroy.call(this);
    }
    _destroy(error2, callback) {
      callback(error2);
    }
    [captureRejectionSymbol](err2) {
      this.destroy(err2);
    }
    /** Wraps a WHATWG `WritableStream`. */
    static fromWeb(writableStream, options = {}) {
      if (!isWritableStream(writableStream))
        throw new ERR_INVALID_ARG_TYPE("writableStream", "WritableStream", writableStream);
      const writer = writableStream.getWriter();
      let closed = false;
      const writable = new _Writable({
        decodeStrings: false,
        ...options,
        write(chunk, encoding, callback) {
          writer.ready.then(() => writer.write(chunk).then(() => callback(), callback), callback);
        },
        final(callback) {
          if (closed) {
            callback();
            return;
          }
          writer.close().then(() => callback(), callback);
        },
        destroy(error2, callback) {
          const done = () => callback(error2);
          if (closed)
            done();
          else
            writer.abort(error2 ?? void 0).then(done, done);
        }
      });
      writer.closed.then(() => closed = true, (error2) => {
        closed = true;
        destroyer(writable, error2);
      });
      return writable;
    }
    /** Exposes this stream as a WHATWG `WritableStream`. */
    static toWeb(streamWritable) {
      if (isDestroyed(streamWritable) || !isWritable(streamWritable)) {
        const closedStream = new WritableStream();
        void closedStream.close();
        return trackClosed(closedStream, Promise.resolve());
      }
      const highWaterMark = streamWritable.writableHighWaterMark;
      const strategy = streamWritable.writableObjectMode ? new CountQueuingStrategy({ highWaterMark }) : (
        // Strings are sized by length; anything unmeasurable counts as one, as in node.
        { highWaterMark, size: (chunk) => chunk?.byteLength ?? chunk?.length ?? 1 }
      );
      let controller;
      const closed = Promise.withResolvers();
      let backpressure = null;
      const cleanup = eos(streamWritable, (error2) => {
        if (error2?.code === "ERR_STREAM_PREMATURE_CLOSE") {
          error2 = new AbortError(void 0, { cause: error2 });
        }
        cleanup();
        streamWritable.on("error", () => {
        });
        if (error2) {
          controller.error(error2);
          closed.reject(error2);
        } else {
          closed.resolve();
        }
        backpressure?.resolve();
        backpressure = null;
      });
      streamWritable.on("drain", () => {
        backpressure?.resolve();
        backpressure = null;
      });
      const stream = new WritableStream({
        start(c) {
          controller = c;
        },
        async write(chunk) {
          if (streamWritable.writableNeedDrain || !streamWritable.write(chunk)) {
            backpressure ?? (backpressure = Promise.withResolvers());
            await backpressure.promise;
          }
        },
        close() {
          if (streamWritable.destroyed)
            return Promise.resolve();
          const ended = Promise.withResolvers();
          streamWritable.end((err2) => err2 ? ended.reject(err2) : ended.resolve());
          return ended.promise;
        },
        abort(reason) {
          destroyer(streamWritable, reason);
        }
      }, strategy);
      return trackClosed(stream, closed.promise);
    }
    async [Symbol.asyncDispose]() {
      if (!this.destroyed)
        this.destroy(this.writableFinished ? null : new AbortError());
      await new Promise((resolve4, reject) => eos(this, (err2) => err2 && err2.name !== "AbortError" ? reject(err2) : resolve4()));
    }
  };
  __publicField(_Writable, "WritableState", WritableState);
  var Writable = _Writable;
  function writeChunk(stream, chunk, encoding, callback) {
    const state = stream._writableState;
    if (typeof callback !== "function")
      callback = nop;
    if (chunk === null)
      throw new ERR_STREAM_NULL_VALUES();
    let enc;
    if ((state[kState] & kObjectMode) === 0) {
      enc = encoding || ((state[kState] & kDefaultUTF8Encoding2) !== 0 ? "utf8" : state.defaultEncoding);
      if (encoding && encoding !== "buffer" && !import_buffer9.Buffer.isEncoding(encoding))
        throw new ERR_UNKNOWN_ENCODING(encoding);
      if (typeof chunk === "string") {
        if (enc === "buffer")
          throw new ERR_UNKNOWN_ENCODING(enc);
        if ((state[kState] & kDecodeStrings) !== 0) {
          chunk = import_buffer9.Buffer.from(chunk, enc);
          enc = "buffer";
        }
      } else if (chunk instanceof import_buffer9.Buffer) {
        enc = "buffer";
      } else if (ArrayBuffer.isView(chunk)) {
        chunk = import_buffer9.Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        enc = "buffer";
      } else {
        throw new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "TypedArray", "DataView"], chunk);
      }
    } else {
      enc = encoding ?? "";
    }
    let err2;
    if ((state[kState] & kEnding) !== 0)
      err2 = new ERR_STREAM_WRITE_AFTER_END();
    else if ((state[kState] & kDestroyed) !== 0)
      err2 = new ERR_STREAM_DESTROYED("write");
    if (err2) {
      nextTick(callback, err2);
      errorOrDestroy(stream, err2, true);
      return err2;
    }
    state.pendingcb++;
    return writeOrBuffer(stream, state, chunk, enc, callback);
  }
  function writeOrBuffer(stream, state, chunk, encoding, callback) {
    const len = (state[kState] & kObjectMode) !== 0 ? 1 : chunk.length;
    state.length += len;
    if ((state[kState] & (kWriting | kErrored | kCorked | kConstructed)) !== kConstructed) {
      if ((state[kState] & kBuffered) === 0) {
        state[kState] |= kBuffered;
        state[kBufferedValue] = [];
      }
      state[kBufferedValue].push({ chunk, encoding, callback });
      if ((state[kState] & kAllBuffers) !== 0 && encoding !== "buffer")
        state[kState] &= ~kAllBuffers;
      if ((state[kState] & kAllNoop) !== 0 && callback !== nop)
        state[kState] &= ~kAllNoop;
    } else {
      state.writelen = len;
      if (callback !== nop)
        state.writecb = callback;
      state[kState] |= kWriting | kSync2 | kExpectWriteCb;
      stream._write(chunk, encoding, state.onwrite);
      state[kState] &= ~kSync2;
    }
    const ret = state.length < state.highWaterMark || state.length === 0;
    if (!ret)
      state[kState] |= kNeedDrain;
    return ret && (state[kState] & (kDestroyed | kErrored)) === 0;
  }
  function doWrite(stream, state, writev2, len, chunk, encoding, cb) {
    state.writelen = len;
    if (cb !== nop)
      state.writecb = cb;
    state[kState] |= kWriting | kSync2 | kExpectWriteCb;
    if ((state[kState] & kDestroyed) !== 0)
      state.onwrite(new ERR_STREAM_DESTROYED("write"));
    else if (writev2)
      stream._writev(chunk, state.onwrite);
    else
      stream._write(chunk, encoding, state.onwrite);
    state[kState] &= ~kSync2;
  }
  function onwriteError(stream, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy(stream, er);
  }
  function onwrite(stream, er) {
    const state = stream._writableState;
    if ((state[kState] & kExpectWriteCb) === 0) {
      errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK());
      return;
    }
    const sync = (state[kState] & kSync2) !== 0;
    const cb = (state[kState] & kWriteCb) !== 0 ? state[kWriteCbValue] : nop;
    state.writecb = null;
    state[kState] &= ~(kWriting | kExpectWriteCb);
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
      void er.stack;
      if ((state[kState] & kErrored) === 0) {
        state[kErroredValue2] = er;
        state[kState] |= kErrored;
      }
      if (stream._readableState && !stream._readableState.errored)
        stream._readableState.errored = er;
      if (sync)
        nextTick(onwriteError, stream, state, er, cb);
      else
        onwriteError(stream, state, er, cb);
      return;
    }
    if ((state[kState] & kBuffered) !== 0)
      clearBuffer(stream, state);
    if (!sync) {
      afterWrite(stream, state, 1, cb);
      return;
    }
    const needDrain = (state[kState] & kNeedDrain) !== 0 && state.length === 0;
    const needTick = needDrain || (state[kState] & kDestroyed) !== 0 || cb !== nop;
    if (cb === nop) {
      if ((state[kState] & kAfterWritePending) === 0 && needTick) {
        nextTick(afterWrite, stream, state, 1, cb);
        state[kState] |= kAfterWritePending;
      } else {
        state.pendingcb--;
        if ((state[kState] & kEnding) !== 0)
          finishMaybe(stream, state, true);
      }
    } else if ((state[kState] & kAfterWriteTickInfo) !== 0 && state[kAfterWriteTickInfoValue].cb === cb) {
      state[kAfterWriteTickInfoValue].count++;
    } else if (needTick) {
      state[kAfterWriteTickInfoValue] = { count: 1, cb, stream, state };
      nextTick(afterWriteTick, state[kAfterWriteTickInfoValue]);
      state[kState] |= kAfterWritePending | kAfterWriteTickInfo;
    } else {
      state.pendingcb--;
      if ((state[kState] & kEnding) !== 0)
        finishMaybe(stream, state, true);
    }
  }
  function afterWriteTick({ stream, state, count, cb }) {
    state[kState] &= ~kAfterWriteTickInfo;
    state[kAfterWriteTickInfoValue] = null;
    afterWrite(stream, state, count, cb);
  }
  function afterWrite(stream, state, count, cb) {
    state[kState] &= ~kAfterWritePending;
    const needDrain = (state[kState] & (kEnding | kNeedDrain | kDestroyed)) === kNeedDrain && state.length === 0;
    if (needDrain) {
      state[kState] &= ~kNeedDrain;
      stream.emit("drain");
    }
    while (count-- > 0) {
      state.pendingcb--;
      cb(null);
    }
    if ((state[kState] & kDestroyed) !== 0)
      errorBuffer(state);
    if ((state[kState] & kEnding) !== 0)
      finishMaybe(stream, state, true);
  }
  function errorBuffer(state) {
    if ((state[kState] & kWriting) !== 0)
      return;
    if ((state[kState] & kBuffered) !== 0) {
      const buffered = state[kBufferedValue];
      for (let n = state.bufferedIndex; n < buffered.length; ++n) {
        const { chunk, callback } = buffered[n];
        state.length -= (state[kState] & kObjectMode) !== 0 ? 1 : chunk.length;
        callback(state.errored ?? new ERR_STREAM_DESTROYED("write"));
      }
    }
    callFinishedCallbacks(state, state.errored ?? new ERR_STREAM_DESTROYED("end"));
    resetBuffer(state);
  }
  function clearBuffer(stream, state) {
    if ((state[kState] & (kDestroyed | kBufferProcessing | kCorked | kBuffered | kConstructed)) !== (kBuffered | kConstructed))
      return;
    const objectMode = (state[kState] & kObjectMode) !== 0;
    const buffered = state[kBufferedValue];
    const { bufferedIndex } = state;
    const bufferedLength = buffered.length - bufferedIndex;
    if (!bufferedLength)
      return;
    let i = bufferedIndex;
    state[kState] |= kBufferProcessing;
    if (bufferedLength > 1 && stream._writev) {
      state.pendingcb -= bufferedLength - 1;
      const callback = (state[kState] & kAllNoop) !== 0 ? nop : (err2) => {
        for (let n = i; n < buffered.length; ++n)
          buffered[n].callback(err2);
      };
      const chunks = (state[kState] & kAllNoop) !== 0 && i === 0 ? buffered : buffered.slice(i);
      chunks.allBuffers = (state[kState] & kAllBuffers) !== 0;
      doWrite(stream, state, true, state.length, chunks, "", callback);
      resetBuffer(state);
    } else {
      do {
        const { chunk, encoding, callback } = buffered[i];
        buffered[i++] = null;
        doWrite(stream, state, false, objectMode ? 1 : chunk.length, chunk, encoding, callback);
      } while (i < buffered.length && (state[kState] & kWriting) === 0);
      if (i === buffered.length)
        resetBuffer(state);
      else if (i > 256) {
        buffered.splice(0, i);
        state.bufferedIndex = 0;
      } else {
        state.bufferedIndex = i;
      }
    }
    state[kState] &= ~kBufferProcessing;
  }
  function needFinish(state) {
    return (state[kState] & (kEnding | kDestroyed | kConstructed | kFinished | kWriting | kErrorEmitted | kCloseEmitted | kErrored | kBuffered)) === (kEnding | kConstructed) && state.length === 0;
  }
  function onFinish(stream, state, err2) {
    if ((state[kState] & kPrefinished) !== 0) {
      errorOrDestroy(stream, err2 ?? new ERR_MULTIPLE_CALLBACK());
      return;
    }
    state.pendingcb--;
    if (err2) {
      callFinishedCallbacks(state, err2);
      errorOrDestroy(stream, err2, (state[kState] & kSync2) !== 0);
    } else if (needFinish(state)) {
      state[kState] |= kPrefinished;
      stream.emit("prefinish");
      state.pendingcb++;
      nextTick(finish, stream, state);
    }
  }
  function prefinish(stream, state) {
    if ((state[kState] & (kPrefinished | kFinalCalled)) !== 0)
      return;
    if (typeof stream._final === "function" && (state[kState] & kDestroyed) === 0) {
      state[kState] |= kFinalCalled | kSync2;
      state.pendingcb++;
      try {
        stream._final((err2) => onFinish(stream, state, err2));
      } catch (err2) {
        onFinish(stream, state, err2);
      }
      state[kState] &= ~kSync2;
    } else {
      state[kState] |= kFinalCalled | kPrefinished;
      stream.emit("prefinish");
    }
  }
  function finishMaybe(stream, state, sync) {
    if (!needFinish(state))
      return;
    prefinish(stream, state);
    if (state.pendingcb !== 0)
      return;
    if (sync) {
      state.pendingcb++;
      nextTick((stream2, state2) => {
        if (needFinish(state2))
          finish(stream2, state2);
        else
          state2.pendingcb--;
      }, stream, state);
    } else if (needFinish(state)) {
      state.pendingcb++;
      finish(stream, state);
    }
  }
  function finish(stream, state) {
    state.pendingcb--;
    state[kState] |= kFinished;
    callFinishedCallbacks(state, null);
    stream.emit("finish");
    if ((state[kState] & kAutoDestroy) === 0)
      return;
    const rState = stream._readableState;
    if (!rState || rState.autoDestroy && (rState.endEmitted || rState.readable === false))
      stream.destroy();
  }
  function callFinishedCallbacks(state, err2) {
    if ((state[kState] & kOnFinished) === 0)
      return;
    const callbacks = state[kOnFinishedValue];
    state[kOnFinishedValue] = null;
    state[kState] &= ~kOnFinished;
    for (const callback of callbacks)
      callback(err2);
  }
  Writable.prototype._writev = null;

  // node_modules/@zenfs/core/dist/node/streams.js
  var operationsChunkSize = 64 * 1024;
  function callOperation(run) {
    const { promise, resolve: resolve4, reject } = Promise.withResolvers();
    run((error2, result) => error2 ? reject(error2) : resolve4(result));
    return promise;
  }
  var OperationsHandle = class _OperationsHandle {
    constructor(operations, fd, path) {
      __publicField(this, "operations");
      __publicField(this, "fd");
      __publicField(this, "path");
      this.operations = operations;
      this.fd = fd;
      this.path = path;
    }
    /**
     * Opens `path` with the `open` operation, unless `fd` is given.
     */
    static open(operations, path, fd, flags, mode) {
      if (typeof fd == "number")
        return new _OperationsHandle(operations, fd, path?.toString() ?? "");
      if (fd != null)
        throw Object.assign(new Error("The FileHandle with fs method is not implemented"), { code: "ERR_METHOD_NOT_IMPLEMENTED" });
      return callOperation((callback) => operations.open(path, flags, mode, callback)).then((fd2) => new _OperationsHandle(operations, fd2, path.toString()));
    }
    readableWebStream({ start, end, chunkSize = operationsChunkSize }) {
      const { operations, fd } = this;
      let position = start;
      let remaining = end === void 0 ? Infinity : end - (start ?? 0);
      return new ReadableStream({
        async pull(controller) {
          const size = Math.min(chunkSize, remaining);
          const buffer = new Uint8Array(Math.max(size, 0));
          const bytesRead = size > 0 ? await callOperation((callback) => operations.read(fd, buffer, 0, size, position ?? null, callback)) : 0;
          if (!bytesRead) {
            controller.close();
            return;
          }
          if (position !== void 0)
            position += bytesRead;
          remaining -= bytesRead;
          controller.enqueue(buffer.subarray(0, bytesRead));
        }
      });
    }
    writableWebStream({ start }) {
      const { operations, fd } = this;
      let position = start;
      const write2 = (chunk) => callOperation((callback) => operations.write ? operations.write(fd, chunk, 0, chunk.byteLength, position ?? null, callback) : operations.writev(fd, [chunk], position ?? null, callback));
      return new WritableStream({
        async write(chunk) {
          const bytesWritten = await write2(chunk);
          if (position !== void 0)
            position += bytesWritten;
        }
      });
    }
    async close() {
      if (this.operations.close)
        await callOperation((callback) => this.operations.close(this.fd, callback));
    }
  };
  function validateOperations(operations, kind, options) {
    if (options.fd == null)
      validateType(operations.open, "options.fs.open", "function");
    if (kind == "read")
      validateType(operations.read, "options.fs.read", "function");
    else if (!operations.write && !operations.writev)
      validateType(operations.write, "options.fs.write", "function");
    else {
      if (operations.write)
        validateType(operations.write, "options.fs.write", "function");
      if (operations.writev)
        validateType(operations.writev, "options.fs.writev", "function");
    }
    if (options.autoClose ?? true)
      validateType(operations.close, "options.fs.close", "function");
  }
  function closeHandle(stream, ready, handle, error2, callback) {
    ready.then(() => handle()?.close()).then(() => stream.fd = null).then(() => callback(error2), (closeError) => callback(error2 ?? closeError));
  }
  function emitOpen(stream, fd) {
    stream.emit("open", fd);
    stream.emit("ready");
  }
  var ReadStream = class extends Readable {
    constructor(opts = {}, handleOrPromise) {
      super({ ...opts, encoding: opts.encoding ?? void 0, autoDestroy: opts.autoClose ?? true });
      __publicField(this, "pending", true);
      /** The file descriptor, or `null` before the file is opened and after it is closed */
      __publicField(this, "fd", null);
      __publicField(this, "_path", "<unknown>");
      __publicField(this, "_bytesRead", 0);
      __publicField(this, "reader");
      __publicField(this, "handle");
      __publicField(this, "ready");
      this.ready = Promise.resolve(handleOrPromise).then((handle) => {
        this.handle = handle;
        this.fd = handle.fd;
        this._path = handle instanceof OperationsHandle ? handle.path : handle["vfs"].path;
        const internal = handle.readableWebStream({
          start: opts.start,
          end: opts.end === void 0 ? void 0 : opts.end + 1,
          chunkSize: opts.highWaterMark
        });
        this.reader = internal.getReader();
        this.pending = false;
        if (handleOrPromise instanceof Promise)
          emitOpen(this, handle.fd);
      }).catch((err2) => {
        this.destroy(err2);
      });
    }
    async _read() {
      try {
        await this.ready;
        if (!this.reader)
          return;
        const { done, value } = await this.reader.read();
        if (done) {
          this.push(null);
          return;
        }
        this._bytesRead += value.byteLength;
        this.push(value);
      } catch (err2) {
        this.destroy(new Exception(Errno.EIO, err2.toString()));
      }
    }
    _destroy(error2, callback) {
      closeHandle(this, this.ready, () => this.handle, error2, callback);
    }
    /**
     * Like Node, the callback is invoked once the stream is closed.
     * Closing before the stream has finished reports `ERR_STREAM_PREMATURE_CLOSE`.
     */
    close(callback = () => null) {
      eos(this, (error2) => callback(error2 ?? null));
      this.destroy();
    }
    get path() {
      return this._path;
    }
    get bytesRead() {
      return this._bytesRead;
    }
    wrap(oldStream) {
      super.wrap(oldStream);
      return this;
    }
  };
  var WriteStream = class extends Writable {
    constructor(opts = {}, handleOrPromise) {
      super({ ...opts, autoDestroy: opts.autoClose ?? true });
      __publicField(this, "pending", true);
      /** The file descriptor, or `null` before the file is opened and after it is closed */
      __publicField(this, "fd", null);
      __publicField(this, "_path", "<unknown>");
      __publicField(this, "_bytesWritten", 0);
      __publicField(this, "writer");
      __publicField(this, "handle");
      __publicField(this, "ready");
      this.ready = Promise.resolve(handleOrPromise).then((handle) => {
        this.handle = handle;
        this.fd = handle.fd;
        this._path = handle instanceof OperationsHandle ? handle.path : handle["vfs"].path;
        const internal = handle.writableWebStream({ start: opts.start });
        this.writer = internal.getWriter();
        this.pending = false;
        if (handleOrPromise instanceof Promise)
          emitOpen(this, handle.fd);
      }).catch((err2) => this.destroy(err2));
    }
    async _write(chunk, encoding, callback) {
      await this.ready;
      if (!this.writer)
        return callback(warn(UV("EAGAIN", "write", this._path)));
      if (encoding != "buffer")
        return callback(warn(UV("ENOTSUP", "write", this._path)));
      const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      try {
        await this.writer.write(data);
        this._bytesWritten += chunk.byteLength;
        callback();
      } catch (error2) {
        callback(new Exception(Errno.EIO, error2.toString()));
      }
    }
    async _final(callback) {
      await this.ready;
      if (!this.writer)
        return callback();
      try {
        await this.writer.close();
        callback();
      } catch (error2) {
        callback(new Exception(Errno.EIO, error2.toString()));
      }
    }
    _destroy(error2, callback) {
      closeHandle(this, this.ready, () => this.handle, error2, callback);
    }
    /**
     * Like Node, the stream is ended and the callback is invoked once it is closed.
     */
    close(callback) {
      if (this.closed) {
        callback?.(null);
        return;
      }
      if (callback)
        this.once("close", () => callback(null));
      if (!this._writableState.autoDestroy)
        this.once("finish", () => this.destroy());
      this.end();
    }
    get path() {
      return this._path;
    }
    get bytesWritten() {
      return this._bytesWritten;
    }
  };

  // node_modules/@zenfs/core/dist/node/promises.js
  var __addDisposableResource7 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources7 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  function _validateWatchQueue(maxQueue, overflow) {
    validateType(maxQueue, "options.maxQueue", "number");
    if (!Number.isInteger(maxQueue))
      throw outOfRange("options.maxQueue", "an integer", maxQueue);
    if (overflow != "ignore" && overflow != "error")
      throw invalidArgumentValue("options.overflow", overflow, "must be one of: 'ignore', 'error'");
  }
  async function* rejectOnIteration(error2) {
    throw error2;
  }
  async function* normalizeTransformResult(result) {
    if (result == null)
      return;
    if (typeof result == "string") {
      yield encodeUTF8(result);
      return;
    }
    if (result instanceof Uint8Array) {
      yield result;
      return;
    }
    if (ArrayBuffer.isView(result)) {
      yield new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
      return;
    }
    if (result instanceof ArrayBuffer || typeof SharedArrayBuffer != "undefined" && result instanceof SharedArrayBuffer) {
      yield new Uint8Array(result);
      return;
    }
    if (typeof result[Symbol.asyncIterator] == "function" || typeof result[Symbol.iterator] == "function") {
      for await (const part of result)
        yield* normalizeTransformResult(part);
      return;
    }
    throw new TypeError("Invalid transform result");
  }
  async function* applyTransform(source, transform, signal) {
    const options = { signal };
    if (typeof transform == "function") {
      for await (const chunks of source) {
        signal?.throwIfAborted();
        const out2 = [];
        for await (const chunk of normalizeTransformResult(await transform(chunks, options)))
          out2.push(chunk);
        if (out2.length)
          yield out2;
      }
      const out = [];
      for await (const chunk of normalizeTransformResult(await transform(null, options)))
        out.push(chunk);
      if (out.length)
        yield out;
      return;
    }
    async function* withFlush() {
      for await (const chunks of source)
        yield chunks;
      yield null;
    }
    for await (const result of transform.transform(withFlush(), options)) {
      signal?.throwIfAborted();
      const out = [];
      for await (const chunk of normalizeTransformResult(result))
        out.push(chunk);
      if (out.length)
        yield out;
    }
  }
  function* normalizeTransformResultSync(result) {
    if (result === null)
      return;
    if (typeof result == "string") {
      yield encodeUTF8(result);
      return;
    }
    if (ArrayBuffer.isView(result)) {
      yield new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
      return;
    }
    if (result instanceof ArrayBuffer || typeof SharedArrayBuffer != "undefined" && result instanceof SharedArrayBuffer) {
      yield new Uint8Array(result);
      return;
    }
    if (typeof result[Symbol.iterator] == "function") {
      for (const part of result)
        yield* normalizeTransformResultSync(part);
      return;
    }
    throw new TypeError("Invalid transform result");
  }
  function* applyTransformSync(source, transform) {
    if (typeof transform == "function") {
      for (const chunks of source) {
        const out2 = [...normalizeTransformResultSync(transform(chunks))];
        if (out2.length)
          yield out2;
      }
      const out = [...normalizeTransformResultSync(transform(null))];
      if (out.length)
        yield out;
      return;
    }
    function* withFlush() {
      yield* source;
      yield null;
    }
    for (const result of transform.transform(withFlush())) {
      const out = [...normalizeTransformResultSync(result)];
      if (out.length)
        yield out;
    }
  }
  function parsePullArgs(args) {
    const last = args.at(-1);
    const hasOptions = last != null && typeof last == "object" && typeof last.transform != "function";
    const options = hasOptions ? args.at(-1) : {};
    return { transforms: hasOptions ? args.slice(0, -1) : args, options };
  }
  var FileHandle = class {
    constructor(context, fd) {
      __publicField(this, "context");
      __publicField(this, "vfs");
      __publicField(this, "_fd");
      this.context = context;
      this._fd = fd;
      this.vfs = fromFD(context, fd);
    }
    /** The file descriptor, or -1 once the handle has been closed */
    get fd() {
      return this._fd;
    }
    _emitChange() {
      emitChange(this.context, "change", this.vfs.path);
    }
    /**
     * Asynchronous fchown(2) - Change ownership of a file.
     */
    async chown(uid, gid) {
      await this.vfs.chown(uid, gid);
      this._emitChange();
    }
    /**
     * Asynchronous fchmod(2) - Change permissions of a file.
     * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
     */
    async chmod(mode) {
      const numMode = normalizeMode(mode, -1);
      if (numMode < 0)
        throw UV("EINVAL", "chmod", this.vfs.path);
      await this.vfs.chmod(numMode);
      this._emitChange();
    }
    /**
     * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
     */
    datasync() {
      return this.sync();
    }
    /**
     * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
     */
    async sync() {
      await this.vfs.sync();
    }
    /**
     * Asynchronous ftruncate(2) - Truncate a file to a specified length.
     * @param length If not specified, defaults to `0`. Negative lengths are treated as `0`.
     */
    async truncate(length = 0) {
      await this.vfs.truncate(Math.max(0, length || 0));
      this._emitChange();
    }
    /**
     * Asynchronously change file timestamps of the file.
     * @param atime The last access time. If a string is provided, it will be coerced to number.
     * @param mtime The last modified time. If a string is provided, it will be coerced to number.
     */
    async utimes(atime, mtime) {
      atime = normalizeTime(atime);
      mtime = normalizeTime(mtime);
      await this.vfs.utimes(atime, mtime);
      this._emitChange();
    }
    /**
     * Asynchronously append data to a file, creating the file if it does not exist. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for appending.
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'a'`.
     */
    async appendFile(data, _options = {}) {
      if (!isIterableData(data))
        validateData(data);
      const options = normalizeOptions(_options, "utf8", "a", 420);
      const flag = parse2(options.flag);
      if (!(flag & O_APPEND))
        throw UV("EBADF", "write", this.vfs.path);
      await this._writeData(data, options.encoding, typeof _options == "object" ? _options.signal : void 0);
    }
    /**
     * Writes `data` at the current position, encoding strings with `encoding`.
     * Iterables are written one chunk at a time, and `signal` is checked before each write.
     */
    async _writeData(data, encoding, signal) {
      const chunks = isIterableData(data) ? data : [data];
      for await (const chunk of chunks) {
        checkAborted(signal);
        validateData(chunk);
        const encoded = typeof chunk == "string" ? import_buffer10.Buffer.from(chunk, encoding) : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        await this.vfs.write(encoded, 0, encoded.byteLength);
      }
      this._emitChange();
    }
    async read(buffer, offset, length, position) {
      if (typeof offset == "object" && offset != null) {
        position = offset.position;
        length = offset.length;
        offset = offset.offset;
      }
      if (!ArrayBuffer.isView(buffer) && typeof buffer == "object") {
        position = buffer.position;
        length = buffer.length;
        offset = buffer.offset;
        buffer = buffer.buffer;
      }
      if (position && position > Number.MAX_SAFE_INTEGER)
        throw UV("EINVAL");
      if (typeof position == "bigint")
        position = Number(position);
      position = Number.isSafeInteger(position) ? position : null;
      buffer || (buffer = import_buffer10.Buffer.alloc(16384));
      offset ?? (offset = 0);
      length = (length ?? buffer.byteLength - offset) | 0;
      const bytesRead = await this.vfs.read(buffer, offset, length, position);
      return { bytesRead, buffer };
    }
    async readFile(_options) {
      const options = normalizeOptions(_options, null, "r", 292);
      const flag = parse2(options.flag);
      if (flag & O_WRONLY)
        throw UV("EBADF", "read", this.vfs.path);
      const { signal, buffer: into } = typeof _options == "object" && _options !== null ? _options : {};
      checkAborted(signal);
      const { size } = await this.stat();
      const data = into === void 0 ? import_buffer10.Buffer.alloc(size) : readFileBuffer(into, size);
      checkAborted(signal);
      const buffer = data.subarray(0, await this.vfs.read(data, 0, size, null));
      checkAborted(signal);
      return options.encoding ? buffer.toString(options.encoding) : buffer;
    }
    /**
     * Read file data using a `ReadableStream`.
     * The handle is closed when the stream ends or is cancelled if `autoClose` is set.
     */
    readableWebStream(options = {}) {
      if (this.vfs.isClosed)
        throw UV("EBADF", "readableWebStream", this.vfs.path);
      const stream = this.vfs.streamRead(options);
      if (!options.autoClose)
        return stream;
      const reader = stream.getReader();
      const handle = this;
      return new ReadableStream({
        type: "bytes",
        async pull(controller) {
          const { done, value } = await reader.read();
          if (!done)
            return controller.enqueue(value);
          await handle.close();
          controller.close();
        },
        async cancel(reason) {
          await reader.cancel(reason);
          await handle.close();
        }
      });
    }
    /**
     * Not part of the Node.js API!
     *
     * Write file data using a `WritableStream`.
     * The handle will not be closed automatically.
     * @internal
     */
    writableWebStream(options = {}) {
      if (this.vfs.isClosed)
        throw UV("EBADF", "writableWebStream", this.vfs.path);
      if (this.vfs.inode.flags & InodeFlags.Immutable)
        throw UV("EPERM", "writableWebStream", this.vfs.path);
      return this.vfs.streamWrite(options);
    }
    /**
     * Creates a readline Interface object that allows reading the file line by line
     * @param options Options for creating a read stream
     * @returns A readline interface for reading the file line by line
     */
    readLines(options) {
      if (this.vfs.isClosed || this.vfs.flag & O_WRONLY)
        throw UV("EBADF", "read", this.vfs.path);
      return createInterface({ input: this.createReadStream(options), crlfDelay: Infinity });
    }
    [Symbol.asyncDispose]() {
      return this.close();
    }
    async stat(opts) {
      if (this.vfs.isClosed)
        throw UV("EBADF", "stat", this.vfs.path);
      if (checkAccess && !hasAccess(this.context, this.vfs.inode, R_OK))
        throw UV("EACCES", "stat", this.vfs.path);
      return opts?.bigint ? new BigIntStats(this.vfs.inode) : new Stats(this.vfs.inode);
    }
    /**
     * Asynchronously writes `string` to the file.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `write()` multiple times on the same file without waiting for the `Promise`
     * to be resolved (or rejected). For this scenario, `createWriteStream` is strongly recommended.
     */
    async write(data, options, lenOrEnc, position) {
      validateData(data, "buffer");
      let buffer, offset, length;
      if (typeof options == "object" && options != null) {
        lenOrEnc = options.length;
        position = options.position;
        options = options.offset;
      }
      if (typeof data === "string") {
        position = typeof options === "number" ? options : null;
        offset = 0;
        buffer = import_buffer10.Buffer.from(data, typeof lenOrEnc === "string" ? lenOrEnc : "utf8");
        length = buffer.length;
      } else {
        buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        offset = options ?? 0;
        length = typeof lenOrEnc == "number" ? lenOrEnc : buffer.byteLength;
        position = typeof position === "number" ? position : null;
      }
      const bytesWritten = await this.vfs.write(buffer, offset, length, position);
      this._emitChange();
      return { buffer: data, bytesWritten };
    }
    /**
     * Asynchronously writes data to a file, replacing the file if it already exists. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `writeFile()` multiple times on the same file without waiting for the `Promise` to be resolved (or rejected).
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'w'`.
     */
    async writeFile(data, _options = {}) {
      if (!isIterableData(data))
        validateData(data);
      const options = normalizeOptions(_options, "utf8", "w", 420);
      const flag = parse2(options.flag);
      if (!(flag & O_WRONLY || flag & O_RDWR))
        throw UV("EBADF", "writeFile", this.vfs.path);
      await this._writeData(data, options.encoding, typeof _options == "object" ? _options?.signal : void 0);
    }
    /**
     * Asynchronous close(2) - close a `FileHandle`.
     */
    /** @internal */
    _closeSync() {
      if (this._fd == -1)
        return;
      this.vfs.closeSync();
      deleteFD(this.context, this._fd);
      this._fd = -1;
    }
    async close() {
      if (this._fd == -1)
        return;
      await this.vfs.close();
      deleteFD(this.context, this._fd);
      this._fd = -1;
    }
    /**
     * Asynchronous `writev`. Writes from multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin writing.
     * @returns The number of bytes written.
     */
    async writev(buffers, position) {
      let bytesWritten = 0;
      for (const buffer of buffers) {
        const at = typeof position == "number" ? position + bytesWritten : null;
        bytesWritten += (await this.write(buffer, 0, buffer.byteLength, at)).bytesWritten;
      }
      return { bytesWritten, buffers };
    }
    /**
     * Asynchronous `readv`. Reads into multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin reading.
     * @returns The number of bytes read.
     */
    async readv(buffers, position) {
      let bytesRead = 0;
      for (const buffer of buffers) {
        const at = typeof position == "number" ? position + bytesRead : null;
        bytesRead += (await this.read(buffer, 0, buffer.byteLength, at)).bytesRead;
      }
      return { bytesRead, buffers };
    }
    /**
     * Creates a stream for reading from the file.
     * @param options Options for the readable stream
     */
    createReadStream(options = {}) {
      validateFD(this._fd);
      if (this.vfs.isClosed || this.vfs.flag & O_WRONLY)
        throw UV("EBADF", "createReadStream", this.vfs.path);
      return new ReadStream(options, this);
    }
    /**
     * Creates a stream for writing to the file.
     * @param options Options for the writeable stream.
     */
    createWriteStream(options = {}) {
      validateFD(this._fd);
      if (this.vfs.isClosed)
        throw UV("EBADF", "createWriteStream", this.vfs.path);
      if (this.vfs.inode.flags & InodeFlags.Immutable)
        throw UV("EPERM", "createWriteStream", this.vfs.path);
      if (this.vfs.fs.attributes.has("readonly"))
        throw UV("EROFS", "createWriteStream", this.vfs.path);
      return new WriteStream(options, this);
    }
    pull(...args) {
      if (this.vfs.isClosed || this.vfs.flag & O_WRONLY)
        throw UV("EBADF", "read", this.vfs.path);
      const { transforms, options } = parsePullArgs(args);
      const { autoClose, start, limit, chunkSize = 131072, signal } = options;
      const handle = this;
      async function* source() {
        let position = typeof start == "number" ? start : null;
        let remaining = typeof limit == "number" ? limit : Infinity;
        try {
          while (remaining > 0) {
            signal?.throwIfAborted();
            const size = Math.min(chunkSize, remaining);
            const buffer = new Uint8Array(size);
            const bytesRead = await handle.vfs.read(buffer, 0, size, position);
            if (bytesRead <= 0)
              break;
            if (position !== null)
              position += bytesRead;
            remaining -= bytesRead;
            yield [buffer.subarray(0, bytesRead)];
          }
        } finally {
          if (autoClose)
            await handle.close();
        }
      }
      let stream = source();
      for (const transform of transforms)
        stream = applyTransform(stream, transform, signal);
      return stream;
    }
    pullSync(...args) {
      if (this.vfs.isClosed || this.vfs.flag & O_WRONLY)
        throw UV("EBADF", "read", this.vfs.path);
      const { transforms, options } = parsePullArgs(args);
      const { autoClose, start, limit, chunkSize = 131072 } = options;
      const handle = this;
      function* source() {
        let position = typeof start == "number" ? start : null;
        let remaining = typeof limit == "number" ? limit : Infinity;
        try {
          while (remaining > 0) {
            const size = Math.min(chunkSize, remaining);
            const buffer = new Uint8Array(size);
            const bytesRead = handle.vfs.readSync(buffer, 0, size, position);
            if (bytesRead <= 0)
              break;
            if (position !== null)
              position += bytesRead;
            remaining -= bytesRead;
            yield [buffer.subarray(0, bytesRead)];
          }
        } finally {
          if (autoClose)
            handle._closeSync();
        }
      }
      let stream = source();
      for (const transform of transforms)
        stream = applyTransformSync(stream, transform);
      return stream;
    }
    /**
     * Return a `node:stream/iter` writer backed by this file handle.
     * @experimental
     */
    writer(options = {}) {
      if (this.vfs.isClosed)
        throw UV("EBADF", "write", this.vfs.path);
      if (this.vfs.inode.flags & InodeFlags.Immutable)
        throw UV("EPERM", "write", this.vfs.path);
      if (this.vfs.fs.attributes.has("readonly"))
        throw UV("EROFS", "write", this.vfs.path);
      const { autoClose, start, limit } = options;
      const handle = this;
      let position = typeof start == "number" ? start : null;
      let written = 0;
      let done = false;
      let failed = false;
      let queue = Promise.resolve();
      function enqueue(task, signal) {
        const operation = queue.then(() => {
          if (failed)
            throw UV("EBADF", "write", handle.vfs.path);
          signal?.throwIfAborted();
          return task();
        });
        queue = operation.catch(() => {
        });
        return operation;
      }
      async function finish2() {
        if (done)
          return;
        done = true;
        if (autoClose)
          await handle.close();
      }
      const toBuffer = (chunk) => typeof chunk == "string" ? import_buffer10.Buffer.from(chunk, "utf8") : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      async function writeChunk2(chunk) {
        const buffer = toBuffer(chunk);
        if (typeof limit == "number" && written + buffer.byteLength > limit) {
          throw new RangeError(`Writer limit of ${limit} bytes exceeded`);
        }
        const bytesWritten = await handle.vfs.write(buffer, 0, buffer.byteLength, position);
        if (position !== null)
          position += bytesWritten;
        written += bytesWritten;
        handle._emitChange();
      }
      return {
        get canWrite() {
          if (done || handle.vfs.isClosed)
            return null;
          return typeof limit != "number" || written < limit;
        },
        async write(chunk, opts) {
          opts?.signal?.throwIfAborted();
          await enqueue(() => writeChunk2(chunk), opts?.signal);
        },
        async writev(chunks, opts) {
          opts?.signal?.throwIfAborted();
          await enqueue(async () => {
            for (const chunk of chunks)
              await writeChunk2(chunk);
          }, opts?.signal);
        },
        writeSync() {
          throw UV("ENOSYS", "writeSync", handle.vfs.path);
        },
        writevSync() {
          throw UV("ENOSYS", "writevSync", handle.vfs.path);
        },
        async end() {
          await queue;
          await finish2();
          return written;
        },
        endSync() {
          throw UV("ENOSYS", "endSync", handle.vfs.path);
        },
        fail() {
          failed = true;
          void finish2();
        },
        [Symbol.dispose]() {
          failed = true;
          void finish2();
        },
        async [Symbol.asyncDispose]() {
          await queue;
          await finish2();
        }
      };
    }
  };
  async function rename3(oldPath, newPath) {
    await rename2.call(this, oldPath, newPath);
  }
  async function exists(path) {
    path = normalizePath.call(this, path);
    try {
      const { fs, path: resolved } = await resolve3(this, path);
      return await fs.exists(resolved);
    } catch (e) {
      if (e instanceof Exception && (e.code == "ENOENT" || e.code == "ENOTDIR" || e.code == "EACCES")) {
        return false;
      }
      throw e;
    }
  }
  async function stat3(path, options) {
    let stats;
    try {
      stats = await raceSignal(() => stat2.call(this, path, false), options?.signal);
    } catch (e) {
      if (options?.throwIfNoEntry === false && isNoEntry(e))
        return;
      throw e;
    }
    return options?.bigint ? new BigIntStats(stats) : new Stats(stats);
  }
  async function lstat(path, options) {
    const stats = await raceSignal(() => stat2.call(this, path, true), options?.signal);
    return options?.bigint ? new BigIntStats(stats) : new Stats(stats);
  }
  async function truncate(path, len = 0) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
      const handle = __addDisposableResource7(env_1, await open3.call(this, path, "r+"), true);
      await handle.truncate(len);
    } catch (e_1) {
      env_1.error = e_1;
      env_1.hasError = true;
    } finally {
      const result_1 = __disposeResources7(env_1);
      if (result_1)
        await result_1;
    }
  }
  async function unlink(path) {
    const env_2 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const $ex = { syscall: "unlink", path };
      const { fs, cache, path: resolved } = await resolve3(this, path, true, $ex);
      const stats = await cache.stat(resolved).catch(rethrow($ex));
      assertRemovable(this, await cache.stat(dirname(resolved)).catch(rethrow($ex)), stats, $ex);
      const _ = __addDisposableResource7(env_2, await cache.lock(dirname(resolved), "rw"), false);
      await fs.unlink(resolved).catch(rethrow($ex));
      cache.remove(resolved);
      emitChange(this, "rename", path.toString());
    } catch (e_2) {
      env_2.error = e_2;
      env_2.hasError = true;
    } finally {
      __disposeResources7(env_2);
    }
  }
  async function open3(path, flag, mode = 420) {
    const handle = await open2(this, path, { flag: flag ?? "r", mode });
    return new FileHandle(this, toFD(handle));
  }
  async function readFile(path, _options) {
    const env_3 = { stack: [], error: void 0, hasError: false };
    try {
      const options = normalizeOptions(_options, null, "r", 292);
      checkAborted(typeof _options == "object" ? _options?.signal : void 0);
      const opened = __addDisposableResource7(env_3, typeof path == "object" && "fd" in path ? void 0 : await open3.call(this, path, options.flag, options.mode), true);
      const handle = opened ?? path;
      return await handle.readFile(_options);
    } catch (e_3) {
      env_3.error = e_3;
      env_3.hasError = true;
    } finally {
      const result_2 = __disposeResources7(env_3);
      if (result_2)
        await result_2;
    }
  }
  async function writeFile(path, data, _options) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
      if (!isIterableData(data))
        validateData(data);
      const signal = typeof _options == "object" ? _options?.signal : void 0;
      checkAborted(signal);
      const options = normalizeOptions(_options, "utf8", "w+", 420);
      const opened = __addDisposableResource7(env_4, path instanceof FileHandle ? void 0 : await open3.call(this, path.toString(), options.flag, options.mode), true);
      const handle = opened ?? path;
      await handle.writeFile(data, { ...options, signal });
    } catch (e_4) {
      env_4.error = e_4;
      env_4.hasError = true;
    } finally {
      const result_3 = __disposeResources7(env_4);
      if (result_3)
        await result_3;
    }
  }
  async function appendFile(path, data, _options) {
    const env_5 = { stack: [], error: void 0, hasError: false };
    try {
      const options = normalizeOptions(_options, "utf8", "a", 420);
      const flag = parse2(options.flag);
      const $ex = { syscall: "write", path: path instanceof FileHandle ? path["vfs"].path : path.toString() };
      if (!(flag & O_APPEND))
        throw UV("EBADF", $ex);
      if (!isIterableData(data))
        validateData(data);
      const opened = __addDisposableResource7(env_5, typeof path == "object" && "fd" in path ? void 0 : await open3.call(this, path, options.flag, options.mode), true);
      const handle = opened ?? path;
      await handle.appendFile(data, options);
    } catch (e_5) {
      env_5.error = e_5;
      env_5.hasError = true;
    } finally {
      const result_4 = __disposeResources7(env_5);
      if (result_4)
        await result_4;
    }
  }
  async function rmdir(path) {
    const env_6 = { stack: [], error: void 0, hasError: false };
    try {
      path = normalizePath.call(this, path);
      const { fs, cache, path: resolved } = await resolve3(this, path, true);
      const $ex = { syscall: "rmdir", path };
      const stats = await cache.stat(resolved).catch(rethrow($ex));
      if (!stats)
        throw UV("ENOENT", $ex);
      if (!isDirectory(stats))
        throw UV("ENOTDIR", $ex);
      assertRemovable(this, await cache.stat(dirname(resolved)).catch(rethrow($ex)), stats, $ex);
      const _ = __addDisposableResource7(env_6, await cache.lock(dirname(resolved), "rw"), false);
      await fs.rmdir(resolved).catch(rethrow($ex));
      cache.remove(resolved);
      emitChange(this, "rename", path.toString());
    } catch (e_6) {
      env_6.error = e_6;
      env_6.hasError = true;
    } finally {
      __disposeResources7(env_6);
    }
  }
  async function mkdir3(path, options) {
    options = typeof options === "object" ? options : { mode: options };
    const mode = normalizeMode(options?.mode, 511);
    return await mkdir2.call(this, path, { ...options, mode });
  }
  async function readdir2(path, options) {
    path = normalizePath.call(this, path);
    const opt = typeof options === "object" && options != null ? { ...options } : { encoding: options, withFileTypes: false, recursive: false };
    const rawEntries = await readdir3.call(this, path, opt);
    const values = [];
    for (const entry of rawEntries) {
      if (opt.withFileTypes) {
        values.push(Dirent2.from(entry, opt.encoding, path));
      } else if (opt.encoding == "buffer") {
        values.push(import_buffer10.Buffer.from(entry.path));
      } else {
        values.push(entry.path);
      }
    }
    return values;
  }
  async function link3(path, dest) {
    return await link2.call(this, path, dest);
  }
  async function symlink(target, path, type = "file") {
    if (type != null && !["file", "dir", "junction"].includes(type))
      throw new TypeError("Invalid symlink type: " + type);
    path = normalizePath.call(this, path);
    target = normalizePath.call(this, target, true);
    try {
      const env_7 = { stack: [], error: void 0, hasError: false };
      try {
        const handle = __addDisposableResource7(env_7, await open2(this, path, { flag: "wx", mode: 420, preserveSymlinks: true }), true);
        const encoded = encodeUTF8(target);
        await handle.write(encoded, 0, encoded.length, 0);
        await handle.chmod(S_IFLNK | 511);
      } catch (e_7) {
        env_7.error = e_7;
        env_7.hasError = true;
      } finally {
        const result_5 = __disposeResources7(env_7);
        if (result_5)
          await result_5;
      }
    } catch (error2) {
      throw setUVMessage(Object.assign(error2, { syscall: "symlink", path: target, dest: path }));
    }
  }
  async function readlink3(path, options) {
    path = normalizePath.call(this, path);
    const buf = import_buffer10.Buffer.from(await readlink2.call(this, path), "utf-8");
    const encoding = typeof options == "object" ? options?.encoding : options;
    return encoding == "buffer" ? buf : buf.toString(encoding ?? "utf-8");
  }
  async function chown3(path, uid, gid) {
    await chown2.call(this, path, uid, gid, false);
  }
  async function lchown(path, uid, gid) {
    await chown2.call(this, path, uid, gid, true);
  }
  async function chmod3(path, mode) {
    await chmod2.call(this, path, mode, false);
  }
  async function lchmod(path, mode) {
    await chmod2.call(this, path, mode, true);
  }
  async function utimes3(path, atime, mtime) {
    await utimes2.call(this, path, atime, mtime, false);
  }
  async function lutimes(path, atime, mtime) {
    await utimes2.call(this, path, atime, mtime, true);
  }
  async function realpath(path, options) {
    const encoding = typeof options == "string" ? options : options?.encoding ?? "utf8";
    path = normalizePath.call(this, path);
    const { fullPath } = await resolve3(this, path);
    if (encoding == "utf8" || encoding == "utf-8")
      return fullPath;
    const buf = import_buffer10.Buffer.from(fullPath, "utf-8");
    if (encoding == "buffer")
      return buf;
    return buf.toString(encoding);
  }
  function watch(filename, options = {}) {
    const opts = typeof options !== "string" ? options : { encoding: options };
    const { maxQueue = 2048, overflow = "ignore" } = opts;
    _validateWatchQueue(maxQueue, overflow);
    let watcher;
    try {
      watcher = new FSWatcher(this, filename.toString(), opts);
    } catch (error2) {
      return rejectOnIteration(error2);
    }
    const queue = [];
    const waiting = [];
    let done = false;
    watcher.on("change", (eventType, filename2) => {
      const event = { eventType, filename: filename2 };
      const next = waiting.shift();
      if (next)
        return next.resolve({ value: event, done: false });
      if (queue.length < maxQueue) {
        queue.push(event);
        return;
      }
      if (overflow != "error")
        return warn("fs.watch maxQueue exceeded");
      queue.length = 0;
      queue.push(Object.assign(new Error(`fs.watch() queued more than ${maxQueue} events`), { code: "ERR_FS_WATCH_QUEUE_OVERFLOW" }));
    });
    function cleanup() {
      done = true;
      watcher.close();
      opts.signal?.removeEventListener("abort", cleanup);
      for (const { resolve: resolve4 } of waiting)
        resolve4({ value: void 0, done });
      waiting.length = 0;
      return Promise.resolve({ value: void 0, done: true });
    }
    if (opts.signal?.aborted)
      void cleanup();
    else
      opts.signal?.addEventListener("abort", cleanup, { once: true });
    return {
      async next() {
        const item = queue.shift();
        if (item instanceof Error) {
          await cleanup();
          throw item;
        }
        if (item)
          return { value: item, done: false };
        if (done)
          return { value: void 0, done };
        const next = Promise.withResolvers();
        waiting.push(next);
        return next.promise;
      },
      return: cleanup,
      throw: cleanup,
      async [Symbol.asyncDispose]() {
        await cleanup();
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  async function access(path, mode = F_OK) {
    if (!checkAccess)
      return;
    const stats = await stat3.call(this, path);
    if (!stats.hasAccess(mode, this))
      throw UV("EACCES", "access", path.toString());
  }
  async function rm(path, options) {
    path = normalizePath.call(this, path);
    const stats = await lstat.call(this, path).catch((error2) => {
      if (error2.code == "ENOENT" && options?.force)
        return void 0;
      throw error2;
    });
    if (!stats)
      return;
    switch (stats.mode & S_IFMT) {
      case S_IFDIR:
        if (!options?.recursive)
          throw rmDirectoryError(path);
        for (const entry of await readdir2.call(this, path)) {
          await rm.call(this, join(path, entry), options);
        }
        await rmdir.call(this, path);
        break;
      case S_IFREG:
      case S_IFLNK:
      case S_IFBLK:
      case S_IFCHR:
        await unlink.call(this, path);
        break;
      case S_IFIFO:
      case S_IFSOCK:
      default:
        throw UV("ENOSYS", "rm", path);
    }
  }
  async function mkdtemp(prefix, options) {
    const path = tempDirName(prefix);
    await mkdir3.call(this, path);
    return tempResult(path, prefix, options);
  }
  async function mkstemp(prefix, options) {
    const path = tempFileName(prefix);
    const handle = await open3.call(this, path, "wx+", 384).catch((error2) => {
      throw mkstempError(error2, prefix);
    });
    return { path: tempResult(path, prefix, options), handle };
  }
  async function mkdtempDisposable(prefix, options) {
    const path = tempDirName(prefix);
    await mkdir3.call(this, path);
    const remove2 = () => rm(path, { recursive: true, force: true });
    return { path, remove: remove2, [Symbol.asyncDispose]: remove2 };
  }
  async function copyFile(src, dest, mode) {
    src = normalizePath.call(this, src);
    dest = normalizePath.call(this, dest);
    if (mode && mode & COPYFILE_EXCL && await exists.call(this, dest))
      throw UV("EEXIST", "copyFile", dest);
    await writeFile.call(this, dest, await readFile.call(this, src));
    emitChange(this, "rename", dest.toString());
  }
  function opendir(path, options) {
    path = normalizePath.call(this, path);
    return Promise.resolve(new Dir(path, this, options));
  }
  async function cp(source, destination, opts) {
    source = normalizePath.call(this, source);
    destination = normalizePath.call(this, destination);
    if (opts?.filter && !await opts.filter(source, destination))
      return;
    const statFn = opts?.dereference ? stat3 : lstat;
    const srcStats = await statFn.call(this, source);
    const destStats = await statFn.call(this, destination).catch((error2) => {
      if (!isNoEntry(error2))
        throw error2;
    });
    const sameFileSystem = resolveMount(source, this).fs.uuid == resolveMount(destination, this).fs.uuid;
    cpCheckPaths(source, destination, sameFileSystem, srcStats, destStats);
    if (opts?.errorOnExist && opts.force === false && destStats)
      throw cpError("ERR_FS_CP_EEXIST", "EEXIST", `${destination} already exists`, destination);
    switch (srcStats.mode & S_IFMT) {
      case S_IFDIR: {
        if (!opts?.recursive)
          throw cpError("ERR_FS_EISDIR", "EISDIR", `${source} is a directory (not copied)`, source);
        const [entries2, created] = await Promise.all([
          readdir2.call(this, source, { withFileTypes: true }),
          mkdir3.call(this, destination, { recursive: true })
        ]);
        const _cp = async (dirent) => {
          await cp.call(this, join(source, dirent.name), join(destination, dirent.name), opts);
        };
        await Promise.all(entries2.map(_cp));
        if (created !== void 0)
          await chmod3.call(this, destination, srcStats.mode & 4095);
        break;
      }
      case S_IFLNK: {
        const link5 = await readlink3.call(this, source);
        if (destStats?.isSymbolicLink())
          await unlink.call(this, destination);
        await symlink.call(this, opts?.verbatimSymlinks ? link5 : resolve.call(this, dirname(source), link5), destination);
        break;
      }
      case S_IFREG: {
        if (destStats && opts?.force === false)
          return;
        if (destStats)
          await unlink.call(this, destination);
        await copyFile.call(this, source, destination, opts?.mode);
        break;
      }
      case S_IFBLK:
      case S_IFCHR:
        throw UV("ENOSYS", "cp", source);
      default:
        throw cpSpecialFileError(srcStats, destination);
    }
    if (opts?.preserveTimestamps) {
      await utimes3.call(this, destination, srcStats.atime, srcStats.mtime);
    }
  }
  async function statfs(path, opts) {
    path = normalizePath.call(this, path);
    const { fs } = await resolve3(this, path);
    return _statfs(fs, opts?.bigint);
  }
  function glob(pattern2, opt) {
    pattern2 = Array.isArray(pattern2) ? pattern2 : [pattern2];
    const $ = contextOf(this);
    const { cwd = $.pwd, withFileTypes = false, exclude = () => false, followSymlinks = false, maxDepth = Infinity } = opt || {};
    validateMaxDepth(maxDepth);
    const base = resolve.call($, cwd instanceof URL ? cwd.pathname : cwd);
    const normalizedPatterns = pattern2.map((p) => p.startsWith("/") ? relative.call($, base, p) : p);
    async function shouldDescend(path, relativePath) {
      const descent = _globDescent(normalizedPatterns, relativePath);
      if (!descent)
        return false;
      try {
        const stats = await lstat.call($, path);
        if (!stats.isSymbolicLink())
          return stats.isDirectory();
        return (followSymlinks || descent == "literal") && (await stat3.call($, path)).isDirectory();
      } catch {
        return false;
      }
    }
    async function* recursiveList(dir, depth = 1) {
      if (depth > maxDepth)
        return;
      const entries2 = await readdir2.call($, dir, { withFileTypes, encoding: "utf8" }).catch(() => []);
      for (const entry of entries2) {
        const fullPath = join(dir, withFileTypes ? entry.name : entry);
        const relPath = relative.call($, base, fullPath);
        if (typeof exclude != "function" ? exclude.some((p) => matchesGlob(relPath, p)) : exclude(withFileTypes ? entry : relPath))
          continue;
        if (depth < maxDepth && await shouldDescend(fullPath, relPath))
          yield* recursiveList(fullPath, depth + 1);
        if (normalizedPatterns.some((pattern3) => matchesGlob(relPath, pattern3))) {
          yield withFileTypes ? entry : relPath;
        }
      }
    }
    return recursiveList(base);
  }

  // node_modules/@zenfs/core/dist/backends/cow.js
  var journalOperations = /* @__PURE__ */ new Set(["delete"]);
  var maxOpLength = [...journalOperations].reduce((max, op) => Math.max(max, op.length), 0);

  // node_modules/@zenfs/core/dist/internal/rpc.js
  function isPort(port) {
    return port != null && typeof port == "object" && "channel" in port && "send" in port && "addHandler" in port && "removeHandler" in port;
  }
  function fromWeb(port) {
    const _handlers = /* @__PURE__ */ new Map();
    return {
      channel: port,
      send: port.postMessage.bind(port),
      addHandler(handler) {
        const _handler = (event) => handler(event.data);
        _handlers.set(handler, _handler);
        port.addEventListener("message", _handler);
      },
      removeHandler(handler) {
        port.removeEventListener("message", _handlers.get(handler));
      }
    };
  }
  function fromNode(port) {
    return {
      channel: port,
      send: port.postMessage.bind(port),
      addHandler: port.on.bind(port, "message"),
      removeHandler: port.off.bind(port, "message")
    };
  }
  function fromWebSocket(ws) {
    return {
      channel: ws,
      send(message) {
        ws.send(encodeMessage(message));
      },
      addHandler(handler) {
        ws.addEventListener("message", (event) => {
          handler(decodeMessage(event.data));
        });
      },
      removeHandler(handler) {
        ws.removeEventListener("message", (event) => {
          handler(decodeMessage(event.data));
        });
      }
    };
  }
  function from2(port) {
    if (isPort(port))
      return port;
    if (port instanceof WebSocket)
      return fromWebSocket(port);
    if ("on" in port)
      return fromNode(port);
    if ("addEventListener" in port)
      return fromWeb(port);
    throw err(withErrno("EINVAL", "Invalid port type"));
  }
  var encodingVersion = 1;
  function encodeMessage(message) {
    return `Z${encodingVersion}${JSON.stringify(message, (key, value) => {
      if (key == "_zenfs")
        return;
      return value instanceof Uint8Array ? "$" + value.toBase64() : value;
    })}`;
  }
  function decodeMessage(message) {
    if (!message.startsWith("Z"))
      return {};
    message = message.slice(1);
    const v = parseInt(message);
    if (isNaN(v)) {
      warn("Ignoring encoded message with missing version");
      return {};
    }
    message = message.slice(v.toString().length);
    if (!isJSON(message)) {
      warn("Ignoring encoded message with invalid JSON");
      return {};
    }
    if (v != encodingVersion)
      throw err(withErrno("EPROTONOSUPPORT", `Version mismatch in RPC message encoding (got ${v}, expected ${encodingVersion})`));
    return {
      ...JSON.parse(message, (key, value) => typeof value == "string" && value.startsWith("$") ? Uint8Array.fromBase64(value.slice(1)) : value),
      _zenfs: true
    };
  }
  function isMessage(arg) {
    return typeof arg == "object" && arg != null && "_zenfs" in arg && !!arg._zenfs;
  }
  function disposeExecutors(id) {
    const executor = executors.get(id);
    if (!executor)
      return;
    if (executor.timeout) {
      clearTimeout(executor.timeout);
      if (typeof executor.timeout == "object")
        executor.timeout.unref();
    }
    executors.delete(id);
  }
  var executors = /* @__PURE__ */ new Map();
  function request(request2, { port, timeout: ms = 1e3, fs }) {
    const stack = "\n" + new Error().stack.slice("Error:".length);
    if (!port)
      throw err(withErrno("EINVAL", "Can not make an RPC request without a port"));
    const { resolve: resolve4, reject, promise } = Promise.withResolvers();
    const id = Math.random().toString(16).slice(5);
    const timeout = setTimeout(() => {
      const error2 = err(withErrno("ETIMEDOUT", "RPC request timed out"));
      error2.stack += stack;
      disposeExecutors(id);
      reject(error2);
    }, ms);
    const executor = { resolve: resolve4, reject, promise, fs, timeout };
    executors.set(id, executor);
    port.send({ ...request2, _zenfs: true, id, stack });
    return promise;
  }
  function handleResponse(response) {
    if (!isMessage(response))
      return;
    if (!executors.has(response.id)) {
      const error2 = err(withErrno("EIO", "Invalid RPC id: " + response.id));
      error2.stack += response.stack;
      throw error2;
    }
    const { resolve: resolve4, reject } = executors.get(response.id);
    if (response.error) {
      const e = Exception.fromJSON({ code: "EIO", errno: Errno.EIO, ...response.error });
      e.stack += response.stack;
      disposeExecutors(response.id);
      reject(e);
      return;
    }
    disposeExecutors(response.id);
    resolve4(["stat", "createFile", "mkdir"].includes(response.method) ? new Inode(response.value) : response.value);
    return;
  }
  function attach(port, handler) {
    if (!port)
      throw err(withErrno("EINVAL", "Cannot attach to non-existent port"));
    info("Attached handler to port: " + handler.name);
    port.addHandler(handler);
  }

  // node_modules/@zenfs/core/dist/mixins/shared.js
  var _asyncFSKeys = [
    "rename",
    "stat",
    "touch",
    "createFile",
    "unlink",
    "rmdir",
    "mkdir",
    "readdir",
    "exists",
    "link",
    "sync",
    "read",
    "write",
    "ioctl"
  ];

  // node_modules/@zenfs/core/dist/mixins/async.js
  var __addDisposableResource8 = function(env, value, async) {
    if (value !== null && value !== void 0) {
      if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
      var dispose, inner;
      if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
      }
      if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
        if (async) inner = dispose;
      }
      if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
      if (inner) dispose = function() {
        try {
          inner.call(this);
        } catch (e) {
          return Promise.reject(e);
        }
      };
      env.stack.push({ value, dispose, async });
    } else if (async) {
      env.stack.push({ async: true });
    }
    return value;
  };
  var __disposeResources8 = /* @__PURE__ */ function(SuppressedError2) {
    return function(env) {
      function fail(e) {
        env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
      }
      var r, s = 0;
      function next() {
        while (r = env.stack.pop()) {
          try {
            if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
            if (r.dispose) {
              var result = r.dispose.call(r.value);
              if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                fail(e);
                return next();
              });
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
  }(typeof SuppressedError === "function" ? SuppressedError : function(error2, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error2, e.suppressed = suppressed, e;
  });
  function isInLoop(key, error2 = new Error()) {
    return new RegExp(`__patched__[^]*(__patched__|\\b${key}Sync\\b)`).test(error2.stack ?? "");
  }
  function isReplay() {
    return /__patched__[^]*__replay__/.test(new Error().stack ?? "");
  }
  function Async(FS) {
    class AsyncFS extends FS {
      constructor(...args) {
        super(...args);
        __publicField(this, "_promise", Promise.resolve());
        /** How many queued operations have not finished */
        __publicField(this, "_pending", 0);
        /** The async methods before patching, which do not update the sync cache */
        __publicField(this, "_unpatched", {});
        __publicField(this, "_isInitialized", false);
        /** Tracks how many updates to the sync. cache we skipped during initialization */
        __publicField(this, "_skippedCacheUpdates", 0);
        /** @internal @protected */
        __publicField(this, "_crossCopySemaphore");
        this._patchAsync();
      }
      /**
       * @deprecated Use {@link sync | `sync`} instead
       */
      async done() {
        return this.sync();
      }
      /**
       * @deprecated Use {@link sync | `sync`} instead
       */
      queueDone() {
        return this.sync();
      }
      _async(thunk) {
        this._pending++;
        const replay = async function __replay__() {
          try {
            await thunk();
          } finally {
            this._pending--;
          }
        };
        this._promise = this._promise.finally(replay.bind(this));
      }
      async ready() {
        await super.ready();
        if (this._isInitialized || this.attributes.has("no_async_preload"))
          return;
        await this._promise;
        this.checkSync();
        await this._sync.ready();
        if (this._sync instanceof StoreFS && this instanceof StoreFS) {
          const sync = this._sync.transaction();
          const async = this.transaction();
          const promises = [];
          for (const key of await async.keys()) {
            promises.push(async.get(key).then((data) => sync.setSync(key, data)));
          }
          await Promise.all(promises);
          sync.commitSync();
          this._isInitialized = true;
          return;
        }
        try {
          await this.crossCopy("/");
          debug(`Skipped ${this._skippedCacheUpdates} updates to the sync cache during initialization`);
          this._isInitialized = true;
        } catch (e) {
          this._isInitialized = false;
          throw crit(e);
        }
      }
      checkSync() {
        if (this.attributes.has("no_async_preload")) {
          throw withErrno("ENOTSUP", "Sync preloading has been disabled for this async file system");
        }
        if (!this._sync) {
          throw crit(withErrno("ENOTSUP", "No sync cache is attached to this async file system"));
        }
      }
      renameSync(oldPath, newPath) {
        this.checkSync();
        this._sync.renameSync(oldPath, newPath);
        this._async(() => this._unpatched.rename(oldPath, newPath));
      }
      statSync(path) {
        this.checkSync();
        return this._sync.statSync(path);
      }
      touchSync(path, metadata) {
        this.checkSync();
        this._sync.touchSync(path, metadata);
        this._async(() => this._unpatched.touch(path, metadata));
      }
      createFileSync(path, options) {
        this.checkSync();
        const result = this._sync.createFileSync(path, options);
        this._async(() => this._unpatched.createFile(path, options));
        return result;
      }
      unlinkSync(path) {
        this.checkSync();
        this._sync.unlinkSync(path);
        this._async(() => this._unpatched.unlink(path));
      }
      rmdirSync(path) {
        this.checkSync();
        this._sync.rmdirSync(path);
        this._async(() => this._unpatched.rmdir(path));
      }
      mkdirSync(path, options) {
        this.checkSync();
        const result = this._sync.mkdirSync(path, options);
        this._async(() => this._unpatched.mkdir(path, options));
        return result;
      }
      readdirSync(path) {
        this.checkSync();
        return this._sync.readdirSync(path);
      }
      linkSync(srcpath, dstpath) {
        this.checkSync();
        this._sync.linkSync(srcpath, dstpath);
        this._async(() => this._unpatched.link(srcpath, dstpath));
      }
      async sync() {
        if (!this.attributes.has("no_async_preload") && this._sync)
          this._sync.syncSync();
        await this._promise.catch(() => {
        });
      }
      syncSync() {
        this.checkSync();
        this._sync.syncSync();
      }
      existsSync(path) {
        this.checkSync();
        return this._sync.existsSync(path);
      }
      readSync(path, buffer, offset, end) {
        this.checkSync();
        this._sync.readSync(path, buffer, offset, end);
      }
      writeSync(path, buffer, offset) {
        this.checkSync();
        this._sync.writeSync(path, buffer, offset);
        this._async(() => this._unpatched.write(path, buffer, offset));
      }
      ioctlSync(context, command, ...args) {
        this.checkSync();
        return this._sync.ioctlSync(context, command, ...args);
      }
      streamWrite(path, options) {
        this.checkSync();
        const sync = this._sync.streamWrite(path, options).getWriter();
        const async = super.streamWrite(path, options).getWriter();
        return new WritableStream({
          async write(chunk, controller) {
            await Promise.all([sync.write(chunk), async.write(chunk)]).catch(controller.error.bind(controller));
          },
          async close() {
            await Promise.all([sync.close(), async.close()]);
          },
          async abort(reason) {
            await Promise.all([sync.abort(reason), async.abort(reason)]);
          }
        });
      }
      /** @internal */
      async crossCopy(path) {
        this.checkSync();
        const stats = await this.stat(path);
        if (!isDirectory(stats)) {
          const env_1 = { stack: [], error: void 0, hasError: false };
          try {
            const _ = __addDisposableResource8(env_1, await this._crossCopySemaphore?.get() || { [Symbol.dispose]() {
            } }, false);
            this._sync.createFileSync(path, stats);
            const buffer = new Uint8Array(stats.size);
            await this.read(path, buffer, 0, stats.size);
            this._sync.writeSync(path, buffer, 0);
            this._sync.touchSync(path, stats);
            return;
          } catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
          } finally {
            __disposeResources8(env_1);
          }
        }
        if (path !== "/") {
          this._sync.mkdirSync(path, stats);
          this._sync.touchSync(path, stats);
        }
        const promises = [];
        for (const file of await this.readdir(path)) {
          promises.push(this.crossCopy(join(path, file)));
        }
        await Promise.all(promises);
      }
      /**
       * @internal
       * Patch all async methods to wait for queued operations,
       * and methods that change the file system to also call their synchronous counterparts unless called from themselves (either sync or async)
       */
      _patchAsync() {
        const reads = ["read", "readdir", "stat", "exists"];
        for (const key of _asyncFSKeys) {
          const originalMethod = this[key].bind(this);
          const fn = async function __patched__(...args) {
            if (this._pending && !isReplay())
              await this._promise.catch(() => {
              });
            const result = await originalMethod(...args);
            if (reads.includes(key) || isInLoop(key))
              return result;
            if (!this._isInitialized) {
              this._skippedCacheUpdates++;
              return result;
            }
            try {
              this._sync?.[`${key}Sync`]?.(...args);
            } catch (e) {
              if (isInLoop(key, e))
                return result;
              e.message += " (Out of sync!)";
              throw err(e);
            }
            return result;
          };
          Object.defineProperty(fn, "name", { get: () => key });
          this._unpatched[key] = originalMethod;
          this[key] = fn;
        }
        debug(`Async: patched ${_asyncFSKeys.length} methods`);
      }
    }
    return AsyncFS;
  }

  // node_modules/@zenfs/core/dist/backends/port.js
  var PortFS = class extends Async(FileSystem) {
    /** Constructs a new PortFS instance that connects with the FS running on `options.port`. */
    constructor(channel, timeout = 250) {
      super(1886351988, "portfs");
      __publicField(this, "channel");
      __publicField(this, "timeout");
      __publicField(this, "port");
      /** @hidden */
      __publicField(this, "_sync", InMemory.create({ label: "tmpfs:port" }));
      this.channel = channel;
      this.timeout = timeout;
      this.port = from2(channel);
      attach(this.port, handleResponse);
    }
    rpc(method, ...args) {
      return request({ method, args }, { port: this.port, timeout: this.timeout, fs: this });
    }
    async ready() {
      await this.rpc("ready");
      await super.ready();
    }
    rename(oldPath, newPath) {
      return this.rpc("rename", oldPath, newPath);
    }
    async stat(path) {
      const result = await this.rpc("stat", path);
      return result instanceof Inode ? result : new Inode(result);
    }
    async touch(path, metadata) {
      const inode = metadata instanceof Inode ? metadata : new Inode(metadata);
      await this.rpc("touch", path, new Uint8Array(inode.buffer, inode.byteOffset, inode.byteLength));
    }
    async sync() {
      await super.sync();
      await this.rpc("sync");
    }
    async createFile(path, options) {
      if (options instanceof Inode)
        options = options.toJSON();
      const result = await this.rpc("createFile", path, options);
      return result instanceof Inode ? result : new Inode(result);
    }
    unlink(path) {
      return this.rpc("unlink", path);
    }
    rmdir(path) {
      return this.rpc("rmdir", path);
    }
    async mkdir(path, options) {
      if (options instanceof Inode)
        options = options.toJSON();
      const result = await this.rpc("mkdir", path, options);
      return result instanceof Inode ? result : new Inode(result);
    }
    readdir(path) {
      return this.rpc("readdir", path);
    }
    exists(path) {
      return this.rpc("exists", path);
    }
    link(srcpath, dstpath) {
      return this.rpc("link", srcpath, dstpath);
    }
    async read(path, buffer, start, end) {
      buffer.set(await this.rpc("read", path, buffer, start, end));
    }
    write(path, buffer, offset) {
      return this.rpc("write", path, buffer, offset);
    }
  };

  // node_modules/memium/dist/locks.js
  var hex = (value) => "0x" + value.toString(16).padStart(8, "0");
  var defaultLease = 1e4;
  var defaultTimeout = 5e3;
  var tokenBits = 21n;
  var tokenMask = (1n << tokenBits) - 1n;
  var _EpochTable = class _EpochTable {
    constructor(buffer, byteOffset, slots, options = {}) {
      __publicField(this, "slots");
      /** Pairs of expiry times and epochs */
      __publicField(this, "words");
      __publicField(this, "lease");
      __publicField(this, "timeout");
      this.slots = slots;
      if (byteOffset % _EpochTable.alignment)
        throw withErrno("EINVAL", `Epoch table at ${hex(byteOffset)} is not aligned`);
      this.words = new BigInt64Array(buffer, byteOffset, slots * 2);
      this.lease = options.lease ?? defaultLease;
      this.timeout = options.timeout ?? defaultTimeout;
    }
    /** Bytes of memory used by a table with `slots` slots */
    static sizeOf(slots) {
      return slots * 16;
    }
    /**
     * Pins `epoch`, reclaiming abandoned slots as needed.
     * The caller must check that `epoch` is still current after this returns, and retry if it is not.
     * @throws EBUSY if no slot became available before the timeout
     */
    pin(epoch) {
      const start = Date.now();
      for (; ; ) {
        const now = Date.now();
        const expiry = BigInt(now + this.lease);
        for (let slot = 0; slot < this.slots; slot++) {
          const held = Atomics.load(this.words, slot * 2);
          if (held > now || Atomics.compareExchange(this.words, slot * 2, held, expiry) !== held)
            continue;
          Atomics.store(this.words, slot * 2 + 1, epoch);
          let released = false;
          const release = () => {
            if (released)
              return;
            released = true;
            Atomics.store(this.words, slot * 2 + 1, 0n);
            Atomics.store(this.words, slot * 2, 0n);
          };
          return Object.assign(release, { [Symbol.dispose]: release });
        }
        if (now - start >= this.timeout)
          throw withErrno("EBUSY", "No epoch table slots available");
      }
    }
    /** The oldest pinned epoch, or `undefined` if none are pinned */
    oldest() {
      const now = Date.now();
      let oldest;
      for (let slot = 0; slot < this.slots; slot++) {
        const expiry = Atomics.load(this.words, slot * 2);
        if (expiry <= now)
          continue;
        const epoch = Atomics.load(this.words, slot * 2 + 1);
        if (epoch && (oldest === void 0 || epoch < oldest))
          oldest = epoch;
      }
      return oldest;
    }
  };
  /** Required alignment of the table's memory */
  __publicField(_EpochTable, "alignment", 8);
  var EpochTable = _EpochTable;

  // node_modules/@zenfs/core/dist/backends/single_buffer/v1.js
  var __esDecorate6 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var __runInitializers6 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var hex2 = (value) => "0x" + value.toString(16).padStart(8, "0");
  var { format: format2 } = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
    unit: "byte",
    unitDisplay: "narrow"
  });
  var MetadataEntry = (() => {
    var _a13, _id_accessor_storage, _offset__accessor_storage, _offset_accessor_storage, _size_accessor_storage;
    var _a12, _b3, _c3, _d3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _offset__decorators;
    let _offset__initializers = [];
    let _offset__extraInitializers = [];
    let _offset_decorators;
    let _offset_initializers = [];
    let _offset_extraInitializers = [];
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    var MetadataEntry2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _id_accessor_storage, __runInitializers6(this, _id_initializers, void 0));
        __privateAdd(this, _offset__accessor_storage, (__runInitializers6(this, _id_extraInitializers), __runInitializers6(this, _offset__initializers, void 0)));
        __privateAdd(this, _offset_accessor_storage, (__runInitializers6(this, _offset__extraInitializers), __runInitializers6(this, _offset_initializers, void 0)));
        __privateAdd(this, _size_accessor_storage, (__runInitializers6(this, _offset_extraInitializers), __runInitializers6(this, _size_initializers, void 0)));
        __runInitializers6(this, _size_extraInitializers);
      }
      /** Inode or data ID */
      get id() {
        return __privateGet(this, _id_accessor_storage);
      }
      set id(value) {
        __privateSet(this, _id_accessor_storage, value);
      }
      /** Reserved for 64-bit offset expansion */
      get offset_() {
        return __privateGet(this, _offset__accessor_storage);
      }
      set offset_(value) {
        __privateSet(this, _offset__accessor_storage, value);
      }
      /** Offset into the buffer the data is stored at. */
      get offset() {
        return __privateGet(this, _offset_accessor_storage);
      }
      set offset(value) {
        __privateSet(this, _offset_accessor_storage, value);
      }
      /** The size of the data */
      get size() {
        return __privateGet(this, _size_accessor_storage);
      }
      set size(value) {
        __privateSet(this, _size_accessor_storage, value);
      }
      toString() {
        return `<MetadataEntry @ ${hex2(this.byteOffset)}>`;
      }
    }, _id_accessor_storage = new WeakMap(), _offset__accessor_storage = new WeakMap(), _offset_accessor_storage = new WeakMap(), _size_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _id_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _offset__decorators = [(_b3 = types2).uint32.bind(_b3)];
      _offset_decorators = [(_c3 = types2).uint32.bind(_c3)];
      _size_decorators = [(_d3 = types2).uint32.bind(_d3)];
      __esDecorate6(_a13, null, _id_decorators, { kind: "accessor", name: "id", static: false, private: false, access: { has: (obj) => "id" in obj, get: (obj) => obj.id, set: (obj, value) => {
        obj.id = value;
      } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
      __esDecorate6(_a13, null, _offset__decorators, { kind: "accessor", name: "offset_", static: false, private: false, access: { has: (obj) => "offset_" in obj, get: (obj) => obj.offset_, set: (obj, value) => {
        obj.offset_ = value;
      } }, metadata: _metadata }, _offset__initializers, _offset__extraInitializers);
      __esDecorate6(_a13, null, _offset_decorators, { kind: "accessor", name: "offset", static: false, private: false, access: { has: (obj) => "offset" in obj, get: (obj) => obj.offset, set: (obj, value) => {
        obj.offset = value;
      } }, metadata: _metadata }, _offset_initializers, _offset_extraInitializers);
      __esDecorate6(_a13, null, _size_decorators, { kind: "accessor", name: "size", static: false, private: false, access: { has: (obj) => "size" in obj, get: (obj) => obj.size, set: (obj, value) => {
        obj.size = value;
      } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
      __esDecorate6(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      MetadataEntry2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "MetadataEntry"), __runInitializers6(_classThis, _classExtraInitializers), _a13);
    return MetadataEntry2 = _classThis;
  })();
  var entries_per_block = 255;
  var max_lock_attempts = 5;
  var MetadataBlock = (() => {
    var _a13, _checksum_accessor_storage, _timestamp_accessor_storage, _previous_offset_accessor_storage, _items_accessor_storage, _locked_accessor_storage;
    var _a12, _b3, _c3, _d3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from.typed(Int32Array);
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _timestamp_decorators;
    let _timestamp_initializers = [];
    let _timestamp_extraInitializers = [];
    let _previous_offset_decorators;
    let _previous_offset_initializers = [];
    let _previous_offset_extraInitializers = [];
    let _items_decorators;
    let _items_initializers = [];
    let _items_extraInitializers = [];
    let _locked_decorators;
    let _locked_initializers = [];
    let _locked_extraInitializers = [];
    var MetadataBlock2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _checksum_accessor_storage, __runInitializers6(this, _checksum_initializers, void 0));
        __privateAdd(this, _timestamp_accessor_storage, (__runInitializers6(this, _checksum_extraInitializers), __runInitializers6(this, _timestamp_initializers, BigInt(Date.now()))));
        __privateAdd(this, _previous_offset_accessor_storage, (__runInitializers6(this, _timestamp_extraInitializers), __runInitializers6(this, _previous_offset_initializers, void 0)));
        __publicField(this, "_previous", __runInitializers6(this, _previous_offset_extraInitializers));
        __privateAdd(this, _items_accessor_storage, __runInitializers6(this, _items_initializers, void 0));
        __privateAdd(this, _locked_accessor_storage, (__runInitializers6(this, _items_extraInitializers), __runInitializers6(this, _locked_initializers, void 0)));
        __runInitializers6(this, _locked_extraInitializers);
      }
      /**
       * The crc32c checksum for the metadata block.
       * @privateRemarks Keep this first!
       */
      get checksum() {
        return __privateGet(this, _checksum_accessor_storage);
      }
      set checksum(value) {
        __privateSet(this, _checksum_accessor_storage, value);
      }
      /** The (last) time this metadata block was updated */
      get timestamp() {
        return __privateGet(this, _timestamp_accessor_storage);
      }
      set timestamp(value) {
        __privateSet(this, _timestamp_accessor_storage, value);
      }
      /** Offset to the previous metadata block */
      get previous_offset() {
        return __privateGet(this, _previous_offset_accessor_storage);
      }
      set previous_offset(value) {
        __privateSet(this, _previous_offset_accessor_storage, value);
      }
      get previous() {
        if (!this.previous_offset)
          return;
        this._previous ?? (this._previous = new MetadataBlock2(this.buffer, this.previous_offset));
        return this._previous;
      }
      /** Metadata entries. */
      get items() {
        return __privateGet(this, _items_accessor_storage);
      }
      set items(value) {
        __privateSet(this, _items_accessor_storage, value);
      }
      toString(long = false) {
        if (!long)
          return `<MetadataBlock @ ${hex2(this.byteOffset)}>`;
        let text = [
          `---- Metadata block at ${hex2(this.byteOffset)} ----`,
          `Checksum: ${hex2(this.checksum)}`,
          `Last updated: ${new Date(Number(this.timestamp)).toLocaleString()}`,
          `Previous block: ${hex2(this.previous_offset)}`,
          "Entries:"
        ].join("\n");
        for (const entry of this.items) {
          if (!entry.offset)
            continue;
          text += `
	${hex2(entry.id)}: ${format2(entry.size).padStart(5)} at ${hex2(entry.offset)}`;
        }
        return text;
      }
      /**
       * If non-zero, this block is locked for writing.
       * Note a int32 is used for `Atomics.wait`
       */
      get locked() {
        return __privateGet(this, _locked_accessor_storage);
      }
      set locked(value) {
        __privateSet(this, _locked_accessor_storage, value);
      }
      /**
       * Wait for the block to be unlocked.
       */
      waitUnlocked(depth = 0) {
        if (depth > max_lock_attempts)
          throw crit(withErrno("EBUSY", `sbfs: exceeded max attempts waiting for metadata block at ${hex2(this.byteOffset)} to be unlocked`));
        if (!Atomics.load(this, MetadataBlock2.lockIndex))
          return;
        switch (Atomics.wait(this, MetadataBlock2.lockIndex, 1)) {
          case "ok":
            break;
          case "not-equal":
            depth++;
            err(`sbfs: waiting for metadata block at ${hex2(this.byteOffset)} to be unlocked (${depth}/${max_lock_attempts})`);
            return this.waitUnlocked(depth);
          case "timed-out":
            throw crit(withErrno("EBUSY", `sbfs: timed out waiting for metadata block at ${hex2(this.byteOffset)} to be unlocked`));
        }
      }
      lock() {
        this.waitUnlocked();
        Atomics.store(this, MetadataBlock2.lockIndex, 1);
        const release = () => {
          Atomics.store(this, MetadataBlock2.lockIndex, 0);
          Atomics.notify(this, MetadataBlock2.lockIndex, 1);
        };
        release[Symbol.dispose] = release;
        return release;
      }
    }, _checksum_accessor_storage = new WeakMap(), _timestamp_accessor_storage = new WeakMap(), _previous_offset_accessor_storage = new WeakMap(), _items_accessor_storage = new WeakMap(), _locked_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _checksum_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _timestamp_decorators = [(_b3 = types2).uint64.bind(_b3)];
      _previous_offset_decorators = [(_c3 = types2).uint32.bind(_c3)];
      _items_decorators = [field(array(MetadataEntry, entries_per_block))];
      _locked_decorators = [(_d3 = types2).int32.bind(_d3)];
      __esDecorate6(_a13, null, _checksum_decorators, { kind: "accessor", name: "checksum", static: false, private: false, access: { has: (obj) => "checksum" in obj, get: (obj) => obj.checksum, set: (obj, value) => {
        obj.checksum = value;
      } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
      __esDecorate6(_a13, null, _timestamp_decorators, { kind: "accessor", name: "timestamp", static: false, private: false, access: { has: (obj) => "timestamp" in obj, get: (obj) => obj.timestamp, set: (obj, value) => {
        obj.timestamp = value;
      } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
      __esDecorate6(_a13, null, _previous_offset_decorators, { kind: "accessor", name: "previous_offset", static: false, private: false, access: { has: (obj) => "previous_offset" in obj, get: (obj) => obj.previous_offset, set: (obj, value) => {
        obj.previous_offset = value;
      } }, metadata: _metadata }, _previous_offset_initializers, _previous_offset_extraInitializers);
      __esDecorate6(_a13, null, _items_decorators, { kind: "accessor", name: "items", static: false, private: false, access: { has: (obj) => "items" in obj, get: (obj) => obj.items, set: (obj, value) => {
        obj.items = value;
      } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
      __esDecorate6(_a13, null, _locked_decorators, { kind: "accessor", name: "locked", static: false, private: false, access: { has: (obj) => "locked" in obj, get: (obj) => obj.locked, set: (obj, value) => {
        obj.locked = value;
      } }, metadata: _metadata }, _locked_initializers, _locked_extraInitializers);
      __esDecorate6(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      MetadataBlock2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "MetadataBlock"), __publicField(_a13, "lockIndex"), __runInitializers6(_classThis, _classExtraInitializers), _a13);
    return MetadataBlock2 = _classThis;
  })();
  Object.assign(MetadataBlock, { lockIndex: offsetof(MetadataBlock, "locked") / Int32Array.BYTES_PER_ELEMENT });
  var sb_magic = 1651715706;
  var kUsedBytes = 2;
  var SuperBlock = (() => {
    var _a13, _checksum_accessor_storage, _magic_accessor_storage, _version_accessor_storage, _inode_format_accessor_storage, _flags_accessor_storage, _used_bytes_accessor_storage, _total_bytes_accessor_storage, _uuid_accessor_storage, _metadata_block_size_accessor_storage, _metadata_offset__accessor_storage, _metadata_offset_accessor_storage, _label_accessor_storage, __padding_accessor_storage;
    var _a12, _b3, _c3, _d3, _e3, _f2, _g2, _h, _j, _k;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from.typed(BigUint64Array);
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _magic_decorators;
    let _magic_initializers = [];
    let _magic_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _inode_format_decorators;
    let _inode_format_initializers = [];
    let _inode_format_extraInitializers = [];
    let _flags_decorators;
    let _flags_initializers = [];
    let _flags_extraInitializers = [];
    let _used_bytes_decorators;
    let _used_bytes_initializers = [];
    let _used_bytes_extraInitializers = [];
    let _total_bytes_decorators;
    let _total_bytes_initializers = [];
    let _total_bytes_extraInitializers = [];
    let _uuid_decorators;
    let _uuid_initializers = [];
    let _uuid_extraInitializers = [];
    let _metadata_block_size_decorators;
    let _metadata_block_size_initializers = [];
    let _metadata_block_size_extraInitializers = [];
    let _metadata_offset__decorators;
    let _metadata_offset__initializers = [];
    let _metadata_offset__extraInitializers = [];
    let _metadata_offset_decorators;
    let _metadata_offset_initializers = [];
    let _metadata_offset_extraInitializers = [];
    let _label_decorators;
    let _label_initializers = [];
    let _label_extraInitializers = [];
    let __padding_decorators;
    let __padding_initializers = [];
    let __padding_extraInitializers = [];
    var SuperBlock3 = (_a13 = class extends _classSuper {
      constructor(...args) {
        super(...args);
        __privateAdd(this, _checksum_accessor_storage, __runInitializers6(this, _checksum_initializers, void 0));
        __privateAdd(this, _magic_accessor_storage, (__runInitializers6(this, _checksum_extraInitializers), __runInitializers6(this, _magic_initializers, void 0)));
        __privateAdd(this, _version_accessor_storage, (__runInitializers6(this, _magic_extraInitializers), __runInitializers6(this, _version_initializers, void 0)));
        __privateAdd(this, _inode_format_accessor_storage, (__runInitializers6(this, _version_extraInitializers), __runInitializers6(this, _inode_format_initializers, void 0)));
        __privateAdd(this, _flags_accessor_storage, (__runInitializers6(this, _inode_format_extraInitializers), __runInitializers6(this, _flags_initializers, void 0)));
        __privateAdd(this, _used_bytes_accessor_storage, (__runInitializers6(this, _flags_extraInitializers), __runInitializers6(this, _used_bytes_initializers, void 0)));
        __privateAdd(this, _total_bytes_accessor_storage, (__runInitializers6(this, _used_bytes_extraInitializers), __runInitializers6(this, _total_bytes_initializers, void 0)));
        __privateAdd(this, _uuid_accessor_storage, (__runInitializers6(this, _total_bytes_extraInitializers), __runInitializers6(this, _uuid_initializers, void 0)));
        __privateAdd(this, _metadata_block_size_accessor_storage, (__runInitializers6(this, _uuid_extraInitializers), __runInitializers6(this, _metadata_block_size_initializers, void 0)));
        __privateAdd(this, _metadata_offset__accessor_storage, (__runInitializers6(this, _metadata_block_size_extraInitializers), __runInitializers6(this, _metadata_offset__initializers, void 0)));
        __privateAdd(this, _metadata_offset_accessor_storage, (__runInitializers6(this, _metadata_offset__extraInitializers), __runInitializers6(this, _metadata_offset_initializers, void 0)));
        __publicField(this, "metadata", __runInitializers6(this, _metadata_offset_extraInitializers));
        __privateAdd(this, _label_accessor_storage, __runInitializers6(this, _label_initializers, void 0));
        __privateAdd(this, __padding_accessor_storage, (__runInitializers6(this, _label_extraInitializers), __runInitializers6(this, __padding_initializers, void 0)));
        __runInitializers6(this, __padding_extraInitializers);
        if (this.magic != sb_magic) {
          warn("sbfs: Invalid magic value, assuming this is a fresh super block");
          const md = new MetadataBlock(this.buffer, sizeof(SuperBlock3));
          Object.assign(this, {
            metadata: md,
            metadata_offset: md.byteOffset,
            used_bytes: BigInt(sizeof(SuperBlock3) + sizeof(MetadataBlock)),
            total_bytes: BigInt(this.buffer.byteLength),
            magic: sb_magic,
            version: 1,
            inode_format: _inode_version,
            metadata_block_size: sizeof(MetadataBlock),
            uuid: encodeUUID(crypto.randomUUID())
          });
          _update(this);
          _update(md);
          return;
        }
        if (this.checksum !== checksum(this))
          throw crit(withErrno("EIO", "sbfs: checksum mismatch for super block"));
        this.metadata = new MetadataBlock(this.buffer, this.metadata_offset);
        if (this.metadata.checksum !== checksum(this.metadata))
          throw crit(withErrno("EIO", `sbfs: checksum mismatch for metadata block (saved ${hex2(this.metadata.checksum)}, computed ${hex2(checksum(this.metadata))})`));
        if (this.inode_format != _inode_version)
          throw crit(withErrno("EIO", "sbfs: inode format mismatch"));
        if (this.metadata_block_size != sizeof(MetadataBlock))
          throw crit(withErrno("EIO", "sbfs: metadata block size mismatch"));
      }
      /**
       * The crc32c checksum for the super block.
       * @privateRemarks Keep this first!
       */
      get checksum() {
        return __privateGet(this, _checksum_accessor_storage);
      }
      set checksum(value) {
        __privateSet(this, _checksum_accessor_storage, value);
      }
      /** Signature for the superblock. */
      get magic() {
        return __privateGet(this, _magic_accessor_storage);
      }
      set magic(value) {
        __privateSet(this, _magic_accessor_storage, value);
      }
      /**
       * The version of the on-disk format
       * 1: v1.10.0+
       */
      get version() {
        return __privateGet(this, _version_accessor_storage);
      }
      set version(value) {
        __privateSet(this, _version_accessor_storage, value);
      }
      /** Which format of `Inode` is used */
      get inode_format() {
        return __privateGet(this, _inode_format_accessor_storage);
      }
      set inode_format(value) {
        __privateSet(this, _inode_format_accessor_storage, value);
      }
      /** Flags for the file system. Currently unused */
      get flags() {
        return __privateGet(this, _flags_accessor_storage);
      }
      set flags(value) {
        __privateSet(this, _flags_accessor_storage, value);
      }
      /** The number of used bytes, including the super block and metadata */
      get used_bytes() {
        return __privateGet(this, _used_bytes_accessor_storage);
      }
      set used_bytes(value) {
        __privateSet(this, _used_bytes_accessor_storage, value);
      }
      /** The total size of the entire file system, including the super block and metadata */
      get total_bytes() {
        return __privateGet(this, _total_bytes_accessor_storage);
      }
      set total_bytes(value) {
        __privateSet(this, _total_bytes_accessor_storage, value);
      }
      /** A UUID for this file system */
      get uuid() {
        return __privateGet(this, _uuid_accessor_storage);
      }
      set uuid(value) {
        __privateSet(this, _uuid_accessor_storage, value);
      }
      /**
       * The size in bytes of a metadata block.
       * Not currently configurable.
       */
      get metadata_block_size() {
        return __privateGet(this, _metadata_block_size_accessor_storage);
      }
      set metadata_block_size(value) {
        __privateSet(this, _metadata_block_size_accessor_storage, value);
      }
      /** Reserved for 64-bit offset expansion */
      get metadata_offset_() {
        return __privateGet(this, _metadata_offset__accessor_storage);
      }
      set metadata_offset_(value) {
        __privateSet(this, _metadata_offset__accessor_storage, value);
      }
      /** Offset of the current metadata block */
      get metadata_offset() {
        return __privateGet(this, _metadata_offset_accessor_storage);
      }
      set metadata_offset(value) {
        __privateSet(this, _metadata_offset_accessor_storage, value);
      }
      /** An optional label for the file system */
      get label() {
        return __privateGet(this, _label_accessor_storage);
      }
      set label(value) {
        __privateSet(this, _label_accessor_storage, value);
      }
      /** Padded to 256 bytes */
      get _padding() {
        return __privateGet(this, __padding_accessor_storage);
      }
      set _padding(value) {
        __privateSet(this, __padding_accessor_storage, value);
      }
      /**
       * Rotate out the current metadata block.
       * Allocates a new metadata block, moves the current one to backup,
       * and updates used_bytes accordingly.
       * @returns the new metadata block
       */
      rotateMetadata() {
        const alignment = BigInt(Int32Array.BYTES_PER_ELEMENT), blockSize = BigInt(sizeof(MetadataBlock));
        let used = Atomics.load(this, kUsedBytes), offset;
        for (; ; ) {
          const padding = (alignment - used % alignment) % alignment;
          offset = used + padding;
          const next = offset + blockSize;
          if (next > this.total_bytes)
            throw err(withErrno("ENOSPC", "sbfs: not enough space for a new metadata block"));
          const observed = Atomics.compareExchange(this, kUsedBytes, used, next);
          if (observed === used)
            break;
          used = observed;
        }
        const metadata = new MetadataBlock(this.buffer, Number(offset));
        const offsets = new Uint32Array(this.buffer, this.byteOffset, sizeof(SuperBlock3) / Uint32Array.BYTES_PER_ELEMENT);
        let previous = Atomics.load(offsets, kMetadataOffset);
        for (; ; ) {
          metadata.previous_offset = previous;
          _update(metadata);
          const observed = Atomics.compareExchange(offsets, kMetadataOffset, previous, metadata.byteOffset);
          if (observed === previous)
            break;
          previous = observed;
        }
        this.metadata = metadata;
        _update(this);
        debug(`sbfs: rotated metadata block at ${hex2(metadata.previous_offset)} with new block at ${hex2(metadata.byteOffset)}`);
        return metadata;
      }
      /**
       * Checks to see if `length` bytes are unused, starting at `offset`.
       * @internal Not for external use!
       */
      isUnused(offset, length) {
        if (!length)
          return true;
        if (offset + length > this.total_bytes || offset < sizeof(SuperBlock3))
          return false;
        for (let block = this.metadata; block; block = block.previous) {
          if (offset < block.byteOffset + sizeof(MetadataBlock) && offset + length > block.byteOffset)
            return false;
          for (const entry of block.items) {
            if (!entry.offset)
              continue;
            if (offset >= entry.offset && offset < entry.offset + entry.size || offset + length > entry.offset && offset + length <= entry.offset + entry.size || offset <= entry.offset && offset + length >= entry.offset + entry.size) {
              return false;
            }
          }
        }
        return true;
      }
    }, _checksum_accessor_storage = new WeakMap(), _magic_accessor_storage = new WeakMap(), _version_accessor_storage = new WeakMap(), _inode_format_accessor_storage = new WeakMap(), _flags_accessor_storage = new WeakMap(), _used_bytes_accessor_storage = new WeakMap(), _total_bytes_accessor_storage = new WeakMap(), _uuid_accessor_storage = new WeakMap(), _metadata_block_size_accessor_storage = new WeakMap(), _metadata_offset__accessor_storage = new WeakMap(), _metadata_offset_accessor_storage = new WeakMap(), _label_accessor_storage = new WeakMap(), __padding_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _checksum_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _magic_decorators = [(_b3 = types2).uint32.bind(_b3)];
      _version_decorators = [(_c3 = types2).uint16.bind(_c3)];
      _inode_format_decorators = [(_d3 = types2).uint16.bind(_d3)];
      _flags_decorators = [(_e3 = types2).uint32.bind(_e3)];
      _used_bytes_decorators = [(_f2 = types2).uint64.bind(_f2)];
      _total_bytes_decorators = [(_g2 = types2).uint64.bind(_g2)];
      _uuid_decorators = [types2.uint8(16)];
      _metadata_block_size_decorators = [(_h = types2).uint32.bind(_h)];
      _metadata_offset__decorators = [(_j = types2).uint32.bind(_j)];
      _metadata_offset_decorators = [(_k = types2).uint32.bind(_k)];
      _label_decorators = [types2.char(64)];
      __padding_decorators = [types2.char(132)];
      __esDecorate6(_a13, null, _checksum_decorators, { kind: "accessor", name: "checksum", static: false, private: false, access: { has: (obj) => "checksum" in obj, get: (obj) => obj.checksum, set: (obj, value) => {
        obj.checksum = value;
      } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
      __esDecorate6(_a13, null, _magic_decorators, { kind: "accessor", name: "magic", static: false, private: false, access: { has: (obj) => "magic" in obj, get: (obj) => obj.magic, set: (obj, value) => {
        obj.magic = value;
      } }, metadata: _metadata }, _magic_initializers, _magic_extraInitializers);
      __esDecorate6(_a13, null, _version_decorators, { kind: "accessor", name: "version", static: false, private: false, access: { has: (obj) => "version" in obj, get: (obj) => obj.version, set: (obj, value) => {
        obj.version = value;
      } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
      __esDecorate6(_a13, null, _inode_format_decorators, { kind: "accessor", name: "inode_format", static: false, private: false, access: { has: (obj) => "inode_format" in obj, get: (obj) => obj.inode_format, set: (obj, value) => {
        obj.inode_format = value;
      } }, metadata: _metadata }, _inode_format_initializers, _inode_format_extraInitializers);
      __esDecorate6(_a13, null, _flags_decorators, { kind: "accessor", name: "flags", static: false, private: false, access: { has: (obj) => "flags" in obj, get: (obj) => obj.flags, set: (obj, value) => {
        obj.flags = value;
      } }, metadata: _metadata }, _flags_initializers, _flags_extraInitializers);
      __esDecorate6(_a13, null, _used_bytes_decorators, { kind: "accessor", name: "used_bytes", static: false, private: false, access: { has: (obj) => "used_bytes" in obj, get: (obj) => obj.used_bytes, set: (obj, value) => {
        obj.used_bytes = value;
      } }, metadata: _metadata }, _used_bytes_initializers, _used_bytes_extraInitializers);
      __esDecorate6(_a13, null, _total_bytes_decorators, { kind: "accessor", name: "total_bytes", static: false, private: false, access: { has: (obj) => "total_bytes" in obj, get: (obj) => obj.total_bytes, set: (obj, value) => {
        obj.total_bytes = value;
      } }, metadata: _metadata }, _total_bytes_initializers, _total_bytes_extraInitializers);
      __esDecorate6(_a13, null, _uuid_decorators, { kind: "accessor", name: "uuid", static: false, private: false, access: { has: (obj) => "uuid" in obj, get: (obj) => obj.uuid, set: (obj, value) => {
        obj.uuid = value;
      } }, metadata: _metadata }, _uuid_initializers, _uuid_extraInitializers);
      __esDecorate6(_a13, null, _metadata_block_size_decorators, { kind: "accessor", name: "metadata_block_size", static: false, private: false, access: { has: (obj) => "metadata_block_size" in obj, get: (obj) => obj.metadata_block_size, set: (obj, value) => {
        obj.metadata_block_size = value;
      } }, metadata: _metadata }, _metadata_block_size_initializers, _metadata_block_size_extraInitializers);
      __esDecorate6(_a13, null, _metadata_offset__decorators, { kind: "accessor", name: "metadata_offset_", static: false, private: false, access: { has: (obj) => "metadata_offset_" in obj, get: (obj) => obj.metadata_offset_, set: (obj, value) => {
        obj.metadata_offset_ = value;
      } }, metadata: _metadata }, _metadata_offset__initializers, _metadata_offset__extraInitializers);
      __esDecorate6(_a13, null, _metadata_offset_decorators, { kind: "accessor", name: "metadata_offset", static: false, private: false, access: { has: (obj) => "metadata_offset" in obj, get: (obj) => obj.metadata_offset, set: (obj, value) => {
        obj.metadata_offset = value;
      } }, metadata: _metadata }, _metadata_offset_initializers, _metadata_offset_extraInitializers);
      __esDecorate6(_a13, null, _label_decorators, { kind: "accessor", name: "label", static: false, private: false, access: { has: (obj) => "label" in obj, get: (obj) => obj.label, set: (obj, value) => {
        obj.label = value;
      } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
      __esDecorate6(_a13, null, __padding_decorators, { kind: "accessor", name: "_padding", static: false, private: false, access: { has: (obj) => "_padding" in obj, get: (obj) => obj._padding, set: (obj, value) => {
        obj._padding = value;
      } }, metadata: _metadata }, __padding_initializers, __padding_extraInitializers);
      __esDecorate6(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      SuperBlock3 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "SuperBlock"), __runInitializers6(_classThis, _classExtraInitializers), _a13);
    return SuperBlock3 = _classThis;
  })();
  var kMetadataOffset = offsetof(SuperBlock, "metadata_offset") / Uint32Array.BYTES_PER_ELEMENT;
  function checksum(value) {
    let length = sizeof(value) - 4;
    if (value instanceof MetadataBlock)
      length -= Int32Array.BYTES_PER_ELEMENT;
    return crc32c(new Uint8Array(value.buffer, value.byteOffset + 4, length));
  }
  function _update(value) {
    if (value instanceof MetadataBlock)
      value.timestamp = BigInt(Date.now());
    value.checksum = checksum(value);
  }

  // node_modules/memium/dist/bplustree.js
  function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  var headerSize = 8;
  var childSize = types.uint32.size;
  var _a10;
  var BPlusTree = class {
    constructor(storage, options, _root = 0, _size = 0) {
      __publicField(this, "storage");
      __publicField(this, "_root");
      __publicField(this, "_size");
      __publicField(this, _a10, "B+Tree");
      __publicField(this, "u8");
      __publicField(this, "view");
      __publicField(this, "keyType");
      __publicField(this, "valueType");
      __publicField(this, "keySize");
      __publicField(this, "valueSize");
      __publicField(this, "leafCapacity");
      __publicField(this, "branchCapacity");
      __publicField(this, "compare");
      /** Whether keys and values must be copied before being returned */
      __publicField(this, "detachKeys");
      __publicField(this, "detachValues");
      /** Pages allocated since the last checkpoint, which can be modified in place */
      __publicField(this, "fresh", /* @__PURE__ */ new Set());
      __publicField(this, "keyScratch");
      __publicField(this, "valueScratch");
      this.storage = storage;
      this._root = _root;
      this._size = _size;
      const { buffer, pageSize } = storage;
      this.u8 = new Uint8Array(buffer);
      this.view = new DataView(buffer);
      this.keyType = options.key;
      this.valueType = options.value;
      this.keySize = options.key.size;
      this.valueSize = options.value.size;
      this.leafCapacity = Math.floor((pageSize - headerSize) / (this.keySize + this.valueSize));
      this.branchCapacity = Math.floor((pageSize - headerSize - childSize) / (this.keySize + childSize));
      this.compare = options.compare ?? defaultCompare;
      this.detachKeys = isStructConstructor(options.key);
      this.detachValues = isStructConstructor(options.value);
      this.keyScratch = new Uint8Array(this.keySize);
      this.valueScratch = new Uint8Array(this.valueSize);
      if (this.leafCapacity < 4 || this.branchCapacity < 4)
        throw withErrno("EINVAL", "Page size is too small for B+ tree keys and values");
    }
    /** The page ID of the root, or 0 if the tree is empty */
    get root() {
      return this._root;
    }
    get size() {
      return this._size;
    }
    /** Number of levels in the tree */
    get height() {
      let height = 0;
      for (let page = this._root; page; page = this.isLeaf(page) ? 0 : this.child(page, 0))
        height++;
      return height;
    }
    /** Makes every current page immutable, so later changes copy them */
    checkpoint() {
      this.fresh.clear();
    }
    /** Switches to a different root and size */
    reset(root, size) {
      this._root = root;
      this._size = size;
      this.fresh.clear();
    }
    // Node access
    base(page) {
      return this.storage.offsetOf(page);
    }
    isLeaf(page) {
      return this.u8[this.base(page)] === 1;
    }
    count(page) {
      return this.view.getUint16(this.base(page) + 2, true);
    }
    setCount(page, count) {
      this.view.setUint16(this.base(page) + 2, count, true);
    }
    capacity(page) {
      return this.isLeaf(page) ? this.leafCapacity : this.branchCapacity;
    }
    keyOffset(page, index) {
      return this.base(page) + headerSize + index * this.keySize;
    }
    valueOffset(page, index) {
      return this.base(page) + headerSize + this.leafCapacity * this.keySize + index * this.valueSize;
    }
    childOffset(page, index) {
      return this.base(page) + headerSize + this.branchCapacity * this.keySize + index * childSize;
    }
    decode(type, offset, detach2) {
      const { buffer } = this.storage;
      return detach2 ? type.get(buffer.slice(offset, offset + type.size), 0) : type.get(buffer, offset);
    }
    /** A key, which is a view of the page unless `detach` is set */
    key(page, index, detach2 = false) {
      return this.decode(this.keyType, this.keyOffset(page, index), detach2 && this.detachKeys);
    }
    value(page, index) {
      return this.decode(this.valueType, this.valueOffset(page, index), this.detachValues);
    }
    entry(page, index) {
      return [this.key(page, index, true), this.value(page, index)];
    }
    child(page, index) {
      return this.view.getUint32(this.childOffset(page, index), true);
    }
    setChild(page, index, child) {
      this.view.setUint32(this.childOffset(page, index), child, true);
    }
    /**
     * Index of the first key not less than `key`, or greater than `key` if `upper` is set.
     * In branches, the upper bound is the index of the child that would contain `key`.
     */
    bound(page, key, upper) {
      let lo = 0, hi = this.count(page);
      while (lo < hi) {
        const mid = lo + hi >>> 1;
        const order = this.compare(this.key(page, mid), key);
        if (order < 0 || upper && order === 0)
          lo = mid + 1;
        else
          hi = mid;
      }
      return lo;
    }
    // Page management
    createNode(kind) {
      const page = this.storage.alloc();
      this.fresh.add(page);
      const base = this.base(page);
      this.u8.fill(0, base, base + headerSize);
      this.u8[base] = kind;
      return page;
    }
    /** Returns a page that can be modified in place, copying `page` if it is not fresh */
    writable(page) {
      if (this.fresh.has(page))
        return page;
      const copy = this.storage.alloc();
      this.fresh.add(copy);
      const from3 = this.base(page);
      this.u8.copyWithin(this.base(copy), from3, from3 + this.storage.pageSize);
      this.storage.free(page);
      return copy;
    }
    release(page) {
      this.fresh.delete(page);
      this.storage.free(page);
    }
    /** Moves `count` keys, along with values for leaves, within or between nodes of the same kind */
    moveEntries(from3, fromIndex, to, toIndex, count) {
      if (count <= 0)
        return;
      this.u8.copyWithin(this.keyOffset(to, toIndex), this.keyOffset(from3, fromIndex), this.keyOffset(from3, fromIndex + count));
      if (!this.isLeaf(from3))
        return;
      this.u8.copyWithin(this.valueOffset(to, toIndex), this.valueOffset(from3, fromIndex), this.valueOffset(from3, fromIndex + count));
    }
    moveChildren(from3, fromIndex, to, toIndex, count) {
      if (count <= 0)
        return;
      this.u8.copyWithin(this.childOffset(to, toIndex), this.childOffset(from3, fromIndex), this.childOffset(from3, fromIndex + count));
    }
    copyKey(from3, fromIndex, to, toIndex) {
      this.u8.copyWithin(this.keyOffset(to, toIndex), this.keyOffset(from3, fromIndex), this.keyOffset(from3, fromIndex + 1));
    }
    // Reading
    /** The leaf and index of `key`, if it is in the tree */
    find(key) {
      let page = this._root;
      if (!page)
        return;
      while (!this.isLeaf(page))
        page = this.child(page, this.bound(page, key, true));
      const index = this.bound(page, key, false);
      if (index < this.count(page) && this.compare(this.key(page, index), key) === 0)
        return [page, index];
    }
    get(key) {
      const found = this.find(key);
      return found && this.value(...found);
    }
    has(key) {
      return !!this.find(key);
    }
    getOrInsert(key, defaultValue) {
      return this.getOrInsertComputed(key, () => defaultValue);
    }
    getOrInsertComputed(key, callback) {
      const found = this.find(key);
      if (found)
        return this.value(...found);
      const value = callback(key);
      this.set(key, value);
      return value;
    }
    /** The first or last entry under `page` */
    edge(page, last) {
      while (!this.isLeaf(page))
        page = this.child(page, last ? this.count(page) : 0);
      return this.entry(page, last ? this.count(page) - 1 : 0);
    }
    first() {
      return this._root ? this.edge(this._root, false) : void 0;
    }
    last() {
      return this._root ? this.edge(this._root, true) : void 0;
    }
    /** The entry with the largest key not greater than `key` */
    floor(key) {
      let page = this._root, before = 0;
      if (!page)
        return;
      while (!this.isLeaf(page)) {
        const index2 = this.bound(page, key, true);
        if (index2)
          before = this.child(page, index2 - 1);
        page = this.child(page, index2);
      }
      const index = this.bound(page, key, true);
      if (index)
        return this.entry(page, index - 1);
      if (before)
        return this.edge(before, true);
    }
    /** The entry with the smallest key not less than `key` */
    ceiling(key) {
      let page = this._root, after = 0;
      if (!page)
        return;
      while (!this.isLeaf(page)) {
        const index2 = this.bound(page, key, true);
        if (index2 < this.count(page))
          after = this.child(page, index2 + 1);
        page = this.child(page, index2);
      }
      const index = this.bound(page, key, false);
      if (index < this.count(page))
        return this.entry(page, index);
      if (after)
        return this.edge(after, false);
    }
    /** Moves a cursor that is past the end of its leaf to the next entry, emptying it at the end of the tree */
    settle(cursor) {
      if (!cursor.length || cursor.at(-1)[1] < this.count(cursor.at(-1)[0]))
        return;
      do
        cursor.pop();
      while (cursor.length && cursor.at(-1)[1] >= this.count(cursor.at(-1)[0]));
      if (!cursor.length)
        return;
      const frame = cursor.at(-1);
      frame[1]++;
      for (let page = this.child(...frame); ; page = this.child(page, 0)) {
        cursor.push([page, 0]);
        if (this.isLeaf(page))
          return;
      }
    }
    /** Entries with keys in `[start, end)`, in order */
    *entries(start, end) {
      const cursor = [];
      for (let page = this._root; page; ) {
        const leaf = this.isLeaf(page);
        const index = start === void 0 ? 0 : this.bound(page, start, !leaf);
        cursor.push([page, index]);
        page = leaf ? 0 : this.child(page, index);
      }
      this.settle(cursor);
      while (cursor.length) {
        const frame = cursor.at(-1);
        const entry = this.entry(...frame);
        if (end !== void 0 && this.compare(entry[0], end) >= 0)
          return;
        yield entry;
        frame[1]++;
        this.settle(cursor);
      }
    }
    *keys() {
      for (const [key] of this.entries())
        yield key;
    }
    *values() {
      for (const [, value] of this.entries())
        yield value;
    }
    [(_a10 = Symbol.toStringTag, Symbol.iterator)]() {
      return this.entries();
    }
    forEach(callback, thisArg) {
      for (const [key, value] of this.entries())
        callback.call(thisArg, value, key, this);
    }
    // Insertion
    /** Encodes the separator key and new page of a split, for inserting into a branch */
    encode(split) {
      this.keyType.set(this.keyScratch.buffer, 0, split.key);
      const child = new Uint8Array(childSize);
      types.uint32.set(child.buffer, 0, split.page);
      return [this.keyScratch, child];
    }
    /** Inserts a key at `index` of a node with room, along with a value for leaves or the child after the key for branches */
    place(page, index, key, item) {
      const count = this.count(page);
      this.moveEntries(page, index, page, index + 1, count - index);
      this.u8.set(key, this.keyOffset(page, index));
      if (this.isLeaf(page))
        this.u8.set(item, this.valueOffset(page, index));
      else {
        this.moveChildren(page, index + 1, page, index + 2, count - index);
        this.u8.set(item, this.childOffset(page, index + 1));
      }
      this.setCount(page, count + 1);
    }
    /** Copies `count` items of `size` bytes starting at `offset`, with `item` inserted at `index` */
    spliced(offset, count, size, index, item) {
      const result = new Uint8Array((count + 1) * size);
      result.set(this.u8.subarray(offset, offset + index * size), 0);
      result.set(item, index * size);
      result.set(this.u8.subarray(offset + index * size, offset + count * size), (index + 1) * size);
      return result;
    }
    /**
     * Splits a full node while placing a key and item at `index`.
     * Leaves keep the separator key, and branches move it up.
     */
    split(page, index, key, item) {
      const leaf = this.isLeaf(page);
      const capacity = this.capacity(page);
      const [itemOffset, itemSize] = leaf ? [(node) => this.valueOffset(node, 0), this.valueSize] : [(node) => this.childOffset(node, 0), childSize];
      const keys = this.spliced(this.keyOffset(page, 0), capacity, this.keySize, index, key);
      const items = leaf ? this.spliced(itemOffset(page), capacity, itemSize, index, item) : this.spliced(itemOffset(page), capacity + 1, itemSize, index + 1, item);
      const total = capacity + 1;
      const left = leaf ? Math.ceil(total / 2) : Math.floor(total / 2);
      const rightStart = leaf ? left : left + 1;
      const right = this.createNode(
        leaf ? 1 : 0
        /* Kind.Branch */
      );
      this.u8.set(keys.subarray(0, left * this.keySize), this.keyOffset(page, 0));
      this.u8.set(items.subarray(0, rightStart * itemSize), itemOffset(page));
      this.setCount(page, left);
      this.u8.set(keys.subarray(rightStart * this.keySize), this.keyOffset(right, 0));
      this.u8.set(items.subarray(rightStart * itemSize), itemOffset(right));
      this.setCount(right, total - rightStart);
      return { key: this.keyType.get(keys.buffer, left * this.keySize), page: right };
    }
    set(key, value) {
      this.keyType.set(this.keyScratch.buffer, 0, key);
      this.valueType.set(this.valueScratch.buffer, 0, value);
      if (!this._root) {
        this._root = this.createNode(
          1
          /* Kind.Leaf */
        );
        this.place(this._root, 0, this.keyScratch, this.valueScratch);
        this._size++;
        return this;
      }
      const [root, split] = this.insert(this._root, key, this.keyScratch, this.valueScratch);
      this._root = root;
      if (!split)
        return this;
      this._root = this.createNode(
        0
        /* Kind.Branch */
      );
      this.setChild(this._root, 0, root);
      this.place(this._root, 0, ...this.encode(split));
      return this;
    }
    /** Inserts into the subtree at `page`, returning its new page ID and how it split, if it did */
    insert(page, key, keyBytes, value) {
      let index, item;
      if (this.isLeaf(page)) {
        index = this.bound(page, key, false);
        page = this.writable(page);
        if (index < this.count(page) && this.compare(this.key(page, index), key) === 0) {
          this.u8.set(value, this.valueOffset(page, index));
          return [page];
        }
        this._size++;
        item = value;
      } else {
        index = this.bound(page, key, true);
        const child = this.child(page, index);
        const [updated, split] = this.insert(child, key, keyBytes, value);
        if (updated === child && !split)
          return [page];
        page = this.writable(page);
        this.setChild(page, index, updated);
        if (!split)
          return [page];
        [keyBytes, item] = this.encode(split);
      }
      if (this.count(page) < this.capacity(page)) {
        this.place(page, index, keyBytes, item);
        return [page];
      }
      return [page, this.split(page, index, keyBytes, item)];
    }
    // Deletion
    delete(key) {
      if (!this._root)
        return false;
      const root = this.remove(this._root, key);
      if (root === void 0)
        return false;
      this._size--;
      if (this.count(root))
        this._root = root;
      else if (this.isLeaf(root)) {
        this.release(root);
        this._root = 0;
      } else {
        this._root = this.child(root, 0);
        this.release(root);
      }
      return true;
    }
    /** Removes `key` from the subtree at `page`, returning its new page ID or `undefined` if the key was not found */
    remove(page, key) {
      if (this.isLeaf(page)) {
        const index2 = this.bound(page, key, false);
        const count = this.count(page);
        if (index2 >= count || this.compare(this.key(page, index2), key) !== 0)
          return;
        page = this.writable(page);
        this.moveEntries(page, index2 + 1, page, index2, count - index2 - 1);
        this.setCount(page, count - 1);
        return page;
      }
      const index = this.bound(page, key, true);
      const child = this.remove(this.child(page, index), key);
      if (child === void 0)
        return;
      page = this.writable(page);
      this.setChild(page, index, child);
      if (this.count(child) < Math.floor(this.capacity(child) / 2))
        this.rebalance(page, index);
      return page;
    }
    /** Fixes an underfull child at `index` of `parent` by borrowing from or merging with a sibling */
    rebalance(parent, index) {
      const separator = index > 0 ? index - 1 : index;
      const left = this.writable(this.child(parent, separator));
      const right = this.writable(this.child(parent, separator + 1));
      this.setChild(parent, separator, left);
      this.setChild(parent, separator + 1, right);
      const leaf = this.isLeaf(left);
      const leftCount = this.count(left), rightCount = this.count(right);
      const gap = leaf ? 0 : 1;
      if (leftCount + gap + rightCount <= this.capacity(left)) {
        if (!leaf)
          this.copyKey(parent, separator, left, leftCount);
        this.moveEntries(right, 0, left, leftCount + gap, rightCount);
        if (!leaf)
          this.moveChildren(right, 0, left, leftCount + 1, rightCount + 1);
        this.setCount(left, leftCount + gap + rightCount);
        const parentCount = this.count(parent);
        this.moveEntries(parent, separator + 1, parent, separator, parentCount - separator - 1);
        this.moveChildren(parent, separator + 2, parent, separator + 1, parentCount - separator - 1);
        this.setCount(parent, parentCount - 1);
        this.release(right);
        return;
      }
      if (leaf && index == separator) {
        this.moveEntries(right, 0, left, leftCount, 1);
        this.moveEntries(right, 1, right, 0, rightCount - 1);
      } else if (leaf) {
        this.moveEntries(right, 0, right, 1, rightCount);
        this.moveEntries(left, leftCount - 1, right, 0, 1);
      } else if (index == separator) {
        this.copyKey(parent, separator, left, leftCount);
        this.setChild(left, leftCount + 1, this.child(right, 0));
        this.copyKey(right, 0, parent, separator);
        this.moveEntries(right, 1, right, 0, rightCount - 1);
        this.moveChildren(right, 1, right, 0, rightCount);
      } else {
        this.moveEntries(right, 0, right, 1, rightCount);
        this.moveChildren(right, 0, right, 1, rightCount + 1);
        this.copyKey(parent, separator, right, 0);
        this.setChild(right, 0, this.child(left, leftCount));
        this.copyKey(left, leftCount - 1, parent, separator);
      }
      const moved = index == separator ? 1 : -1;
      this.setCount(left, leftCount + moved);
      this.setCount(right, rightCount - moved);
      if (leaf)
        this.copyKey(right, 0, parent, separator);
    }
    clear() {
      for (const page of Array.from(this.pages()))
        this.release(page);
      this._root = 0;
      this._size = 0;
    }
    /** Every page currently used by the tree */
    *pages() {
      const pages = [this._root];
      while (pages.length) {
        const page = pages.pop();
        if (!page)
          continue;
        yield page;
        if (!this.isLeaf(page))
          for (let i = 0; i <= this.count(page); i++)
            pages.push(this.child(page, i));
      }
    }
  };

  // node_modules/@zenfs/core/dist/backends/single_buffer/v2.js
  var __esDecorate7 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) {
      if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
      return f;
    }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function(f) {
        if (done) throw new TypeError("Cannot add initializers after decoration has completed");
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
        if (result === void 0) continue;
        if (result === null || typeof result !== "object") throw new TypeError("Object expected");
        if (_ = accept(result.get)) descriptor.get = _;
        if (_ = accept(result.set)) descriptor.set = _;
        if (_ = accept(result.init)) initializers.unshift(_);
      } else if (_ = accept(result)) {
        if (kind === "field") initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
  var __runInitializers7 = function(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
  var default_epoch_slots = 64;
  var max_size = 4294967295;
  var Extent = (() => {
    var _a13, _offset_accessor_storage, _size_accessor_storage;
    var _a12, _b3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _offset_decorators;
    let _offset_initializers = [];
    let _offset_extraInitializers = [];
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    var Extent2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _offset_accessor_storage, __runInitializers7(this, _offset_initializers, void 0));
        __privateAdd(this, _size_accessor_storage, (__runInitializers7(this, _offset_extraInitializers), __runInitializers7(this, _size_initializers, void 0)));
        __runInitializers7(this, _size_extraInitializers);
      }
      get offset() {
        return __privateGet(this, _offset_accessor_storage);
      }
      set offset(value) {
        __privateSet(this, _offset_accessor_storage, value);
      }
      get size() {
        return __privateGet(this, _size_accessor_storage);
      }
      set size(value) {
        __privateSet(this, _size_accessor_storage, value);
      }
    }, _offset_accessor_storage = new WeakMap(), _size_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _offset_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _size_decorators = [(_b3 = types2).uint32.bind(_b3)];
      __esDecorate7(_a13, null, _offset_decorators, { kind: "accessor", name: "offset", static: false, private: false, access: { has: (obj) => "offset" in obj, get: (obj) => obj.offset, set: (obj, value) => {
        obj.offset = value;
      } }, metadata: _metadata }, _offset_initializers, _offset_extraInitializers);
      __esDecorate7(_a13, null, _size_decorators, { kind: "accessor", name: "size", static: false, private: false, access: { has: (obj) => "size" in obj, get: (obj) => obj.size, set: (obj, value) => {
        obj.size = value;
      } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      Extent2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.Extent"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return Extent2 = _classThis;
  })();
  var DataExtent = (() => {
    var _a13, _capacity_accessor_storage;
    var _a12;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Extent;
    let _capacity_decorators;
    let _capacity_initializers = [];
    let _capacity_extraInitializers = [];
    var DataExtent2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _capacity_accessor_storage, __runInitializers7(this, _capacity_initializers, void 0));
        __runInitializers7(this, _capacity_extraInitializers);
      }
      /** Bytes allocated, which can exceed `size` so data can grow in place */
      get capacity() {
        return __privateGet(this, _capacity_accessor_storage);
      }
      set capacity(value) {
        __privateSet(this, _capacity_accessor_storage, value);
      }
    }, _capacity_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _capacity_decorators = [(_a12 = types2).uint32.bind(_a12)];
      __esDecorate7(_a13, null, _capacity_decorators, { kind: "accessor", name: "capacity", static: false, private: false, access: { has: (obj) => "capacity" in obj, get: (obj) => obj.capacity, set: (obj, value) => {
        obj.capacity = value;
      } }, metadata: _metadata }, _capacity_initializers, _capacity_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      DataExtent2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.DataExtent"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return DataExtent2 = _classThis;
  })();
  var Commit = (() => {
    var _a13, _checksum_accessor_storage, _generation_accessor_storage, _index_root_accessor_storage, _index_count_accessor_storage, _free_root_accessor_storage, _size_root_accessor_storage, _free_count_accessor_storage, _free_bytes_accessor_storage, _spare_head_accessor_storage, _spare_count_accessor_storage, _spare_total_accessor_storage, _pending_head_accessor_storage, _pending_tail_accessor_storage, _pending_bytes_accessor_storage;
    var _a12, _b3, _c3, _d3, _e3, _f2, _g2, _h, _j, _k, _l, _m, _o, _p;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _generation_decorators;
    let _generation_initializers = [];
    let _generation_extraInitializers = [];
    let _index_root_decorators;
    let _index_root_initializers = [];
    let _index_root_extraInitializers = [];
    let _index_count_decorators;
    let _index_count_initializers = [];
    let _index_count_extraInitializers = [];
    let _free_root_decorators;
    let _free_root_initializers = [];
    let _free_root_extraInitializers = [];
    let _size_root_decorators;
    let _size_root_initializers = [];
    let _size_root_extraInitializers = [];
    let _free_count_decorators;
    let _free_count_initializers = [];
    let _free_count_extraInitializers = [];
    let _free_bytes_decorators;
    let _free_bytes_initializers = [];
    let _free_bytes_extraInitializers = [];
    let _spare_head_decorators;
    let _spare_head_initializers = [];
    let _spare_head_extraInitializers = [];
    let _spare_count_decorators;
    let _spare_count_initializers = [];
    let _spare_count_extraInitializers = [];
    let _spare_total_decorators;
    let _spare_total_initializers = [];
    let _spare_total_extraInitializers = [];
    let _pending_head_decorators;
    let _pending_head_initializers = [];
    let _pending_head_extraInitializers = [];
    let _pending_tail_decorators;
    let _pending_tail_initializers = [];
    let _pending_tail_extraInitializers = [];
    let _pending_bytes_decorators;
    let _pending_bytes_initializers = [];
    let _pending_bytes_extraInitializers = [];
    var Commit2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _checksum_accessor_storage, __runInitializers7(this, _checksum_initializers, void 0));
        __privateAdd(this, _generation_accessor_storage, (__runInitializers7(this, _checksum_extraInitializers), __runInitializers7(this, _generation_initializers, void 0)));
        __privateAdd(this, _index_root_accessor_storage, (__runInitializers7(this, _generation_extraInitializers), __runInitializers7(this, _index_root_initializers, void 0)));
        __privateAdd(this, _index_count_accessor_storage, (__runInitializers7(this, _index_root_extraInitializers), __runInitializers7(this, _index_count_initializers, void 0)));
        __privateAdd(this, _free_root_accessor_storage, (__runInitializers7(this, _index_count_extraInitializers), __runInitializers7(this, _free_root_initializers, void 0)));
        __privateAdd(this, _size_root_accessor_storage, (__runInitializers7(this, _free_root_extraInitializers), __runInitializers7(this, _size_root_initializers, void 0)));
        __privateAdd(this, _free_count_accessor_storage, (__runInitializers7(this, _size_root_extraInitializers), __runInitializers7(this, _free_count_initializers, void 0)));
        __privateAdd(this, _free_bytes_accessor_storage, (__runInitializers7(this, _free_count_extraInitializers), __runInitializers7(this, _free_bytes_initializers, void 0)));
        __privateAdd(this, _spare_head_accessor_storage, (__runInitializers7(this, _free_bytes_extraInitializers), __runInitializers7(this, _spare_head_initializers, void 0)));
        __privateAdd(this, _spare_count_accessor_storage, (__runInitializers7(this, _spare_head_extraInitializers), __runInitializers7(this, _spare_count_initializers, void 0)));
        __privateAdd(this, _spare_total_accessor_storage, (__runInitializers7(this, _spare_count_extraInitializers), __runInitializers7(this, _spare_total_initializers, void 0)));
        __privateAdd(this, _pending_head_accessor_storage, (__runInitializers7(this, _spare_total_extraInitializers), __runInitializers7(this, _pending_head_initializers, void 0)));
        __privateAdd(this, _pending_tail_accessor_storage, (__runInitializers7(this, _pending_head_extraInitializers), __runInitializers7(this, _pending_tail_initializers, void 0)));
        __privateAdd(this, _pending_bytes_accessor_storage, (__runInitializers7(this, _pending_tail_extraInitializers), __runInitializers7(this, _pending_bytes_initializers, void 0)));
        __runInitializers7(this, _pending_bytes_extraInitializers);
      }
      /** crc32c of the rest of the commit */
      get checksum() {
        return __privateGet(this, _checksum_accessor_storage);
      }
      set checksum(value) {
        __privateSet(this, _checksum_accessor_storage, value);
      }
      get generation() {
        return __privateGet(this, _generation_accessor_storage);
      }
      set generation(value) {
        __privateSet(this, _generation_accessor_storage, value);
      }
      /** ID to extent */
      get index_root() {
        return __privateGet(this, _index_root_accessor_storage);
      }
      set index_root(value) {
        __privateSet(this, _index_root_accessor_storage, value);
      }
      get index_count() {
        return __privateGet(this, _index_count_accessor_storage);
      }
      set index_count(value) {
        __privateSet(this, _index_count_accessor_storage, value);
      }
      /** Free extents by offset */
      get free_root() {
        return __privateGet(this, _free_root_accessor_storage);
      }
      set free_root(value) {
        __privateSet(this, _free_root_accessor_storage, value);
      }
      /** Free extents by size then offset */
      get size_root() {
        return __privateGet(this, _size_root_accessor_storage);
      }
      set size_root(value) {
        __privateSet(this, _size_root_accessor_storage, value);
      }
      get free_count() {
        return __privateGet(this, _free_count_accessor_storage);
      }
      set free_count(value) {
        __privateSet(this, _free_count_accessor_storage, value);
      }
      get free_bytes() {
        return __privateGet(this, _free_bytes_accessor_storage);
      }
      set free_bytes(value) {
        __privateSet(this, _free_bytes_accessor_storage, value);
      }
      /** The newest block in the list of spare blocks for tree nodes */
      get spare_head() {
        return __privateGet(this, _spare_head_accessor_storage);
      }
      set spare_head(value) {
        __privateSet(this, _spare_head_accessor_storage, value);
      }
      /** Spare blocks listed by `spare_head` */
      get spare_count() {
        return __privateGet(this, _spare_count_accessor_storage);
      }
      set spare_count(value) {
        __privateSet(this, _spare_count_accessor_storage, value);
      }
      /** Spare blocks in the entire list */
      get spare_total() {
        return __privateGet(this, _spare_total_accessor_storage);
      }
      set spare_total(value) {
        __privateSet(this, _spare_total_accessor_storage, value);
      }
      /** Blocks listing extents that are free once no reader can see them */
      get pending_head() {
        return __privateGet(this, _pending_head_accessor_storage);
      }
      set pending_head(value) {
        __privateSet(this, _pending_head_accessor_storage, value);
      }
      get pending_tail() {
        return __privateGet(this, _pending_tail_accessor_storage);
      }
      set pending_tail(value) {
        __privateSet(this, _pending_tail_accessor_storage, value);
      }
      get pending_bytes() {
        return __privateGet(this, _pending_bytes_accessor_storage);
      }
      set pending_bytes(value) {
        __privateSet(this, _pending_bytes_accessor_storage, value);
      }
      computeChecksum() {
        return crc32c(new Uint8Array(this.buffer, this.byteOffset + 4, sizeof(Commit2) - 4));
      }
      update() {
        this.checksum = this.computeChecksum();
      }
      isValid(generation) {
        return this.generation === generation && this.checksum == this.computeChecksum();
      }
    }, _checksum_accessor_storage = new WeakMap(), _generation_accessor_storage = new WeakMap(), _index_root_accessor_storage = new WeakMap(), _index_count_accessor_storage = new WeakMap(), _free_root_accessor_storage = new WeakMap(), _size_root_accessor_storage = new WeakMap(), _free_count_accessor_storage = new WeakMap(), _free_bytes_accessor_storage = new WeakMap(), _spare_head_accessor_storage = new WeakMap(), _spare_count_accessor_storage = new WeakMap(), _spare_total_accessor_storage = new WeakMap(), _pending_head_accessor_storage = new WeakMap(), _pending_tail_accessor_storage = new WeakMap(), _pending_bytes_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _checksum_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _generation_decorators = [(_b3 = types2).uint64.bind(_b3)];
      _index_root_decorators = [(_c3 = types2).uint32.bind(_c3)];
      _index_count_decorators = [(_d3 = types2).uint32.bind(_d3)];
      _free_root_decorators = [(_e3 = types2).uint32.bind(_e3)];
      _size_root_decorators = [(_f2 = types2).uint32.bind(_f2)];
      _free_count_decorators = [(_g2 = types2).uint32.bind(_g2)];
      _free_bytes_decorators = [(_h = types2).uint32.bind(_h)];
      _spare_head_decorators = [(_j = types2).uint32.bind(_j)];
      _spare_count_decorators = [(_k = types2).uint32.bind(_k)];
      _spare_total_decorators = [(_l = types2).uint32.bind(_l)];
      _pending_head_decorators = [(_m = types2).uint32.bind(_m)];
      _pending_tail_decorators = [(_o = types2).uint32.bind(_o)];
      _pending_bytes_decorators = [(_p = types2).uint32.bind(_p)];
      __esDecorate7(_a13, null, _checksum_decorators, { kind: "accessor", name: "checksum", static: false, private: false, access: { has: (obj) => "checksum" in obj, get: (obj) => obj.checksum, set: (obj, value) => {
        obj.checksum = value;
      } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
      __esDecorate7(_a13, null, _generation_decorators, { kind: "accessor", name: "generation", static: false, private: false, access: { has: (obj) => "generation" in obj, get: (obj) => obj.generation, set: (obj, value) => {
        obj.generation = value;
      } }, metadata: _metadata }, _generation_initializers, _generation_extraInitializers);
      __esDecorate7(_a13, null, _index_root_decorators, { kind: "accessor", name: "index_root", static: false, private: false, access: { has: (obj) => "index_root" in obj, get: (obj) => obj.index_root, set: (obj, value) => {
        obj.index_root = value;
      } }, metadata: _metadata }, _index_root_initializers, _index_root_extraInitializers);
      __esDecorate7(_a13, null, _index_count_decorators, { kind: "accessor", name: "index_count", static: false, private: false, access: { has: (obj) => "index_count" in obj, get: (obj) => obj.index_count, set: (obj, value) => {
        obj.index_count = value;
      } }, metadata: _metadata }, _index_count_initializers, _index_count_extraInitializers);
      __esDecorate7(_a13, null, _free_root_decorators, { kind: "accessor", name: "free_root", static: false, private: false, access: { has: (obj) => "free_root" in obj, get: (obj) => obj.free_root, set: (obj, value) => {
        obj.free_root = value;
      } }, metadata: _metadata }, _free_root_initializers, _free_root_extraInitializers);
      __esDecorate7(_a13, null, _size_root_decorators, { kind: "accessor", name: "size_root", static: false, private: false, access: { has: (obj) => "size_root" in obj, get: (obj) => obj.size_root, set: (obj, value) => {
        obj.size_root = value;
      } }, metadata: _metadata }, _size_root_initializers, _size_root_extraInitializers);
      __esDecorate7(_a13, null, _free_count_decorators, { kind: "accessor", name: "free_count", static: false, private: false, access: { has: (obj) => "free_count" in obj, get: (obj) => obj.free_count, set: (obj, value) => {
        obj.free_count = value;
      } }, metadata: _metadata }, _free_count_initializers, _free_count_extraInitializers);
      __esDecorate7(_a13, null, _free_bytes_decorators, { kind: "accessor", name: "free_bytes", static: false, private: false, access: { has: (obj) => "free_bytes" in obj, get: (obj) => obj.free_bytes, set: (obj, value) => {
        obj.free_bytes = value;
      } }, metadata: _metadata }, _free_bytes_initializers, _free_bytes_extraInitializers);
      __esDecorate7(_a13, null, _spare_head_decorators, { kind: "accessor", name: "spare_head", static: false, private: false, access: { has: (obj) => "spare_head" in obj, get: (obj) => obj.spare_head, set: (obj, value) => {
        obj.spare_head = value;
      } }, metadata: _metadata }, _spare_head_initializers, _spare_head_extraInitializers);
      __esDecorate7(_a13, null, _spare_count_decorators, { kind: "accessor", name: "spare_count", static: false, private: false, access: { has: (obj) => "spare_count" in obj, get: (obj) => obj.spare_count, set: (obj, value) => {
        obj.spare_count = value;
      } }, metadata: _metadata }, _spare_count_initializers, _spare_count_extraInitializers);
      __esDecorate7(_a13, null, _spare_total_decorators, { kind: "accessor", name: "spare_total", static: false, private: false, access: { has: (obj) => "spare_total" in obj, get: (obj) => obj.spare_total, set: (obj, value) => {
        obj.spare_total = value;
      } }, metadata: _metadata }, _spare_total_initializers, _spare_total_extraInitializers);
      __esDecorate7(_a13, null, _pending_head_decorators, { kind: "accessor", name: "pending_head", static: false, private: false, access: { has: (obj) => "pending_head" in obj, get: (obj) => obj.pending_head, set: (obj, value) => {
        obj.pending_head = value;
      } }, metadata: _metadata }, _pending_head_initializers, _pending_head_extraInitializers);
      __esDecorate7(_a13, null, _pending_tail_decorators, { kind: "accessor", name: "pending_tail", static: false, private: false, access: { has: (obj) => "pending_tail" in obj, get: (obj) => obj.pending_tail, set: (obj, value) => {
        obj.pending_tail = value;
      } }, metadata: _metadata }, _pending_tail_initializers, _pending_tail_extraInitializers);
      __esDecorate7(_a13, null, _pending_bytes_decorators, { kind: "accessor", name: "pending_bytes", static: false, private: false, access: { has: (obj) => "pending_bytes" in obj, get: (obj) => obj.pending_bytes, set: (obj, value) => {
        obj.pending_bytes = value;
      } }, metadata: _metadata }, _pending_bytes_initializers, _pending_bytes_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      Commit2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.Commit"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return Commit2 = _classThis;
  })();
  var State = (() => {
    var _a13, _lock_accessor_storage, _generation_accessor_storage, _next_id_accessor_storage, _commits_accessor_storage;
    var _a12, _b3, _c3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _lock_decorators;
    let _lock_initializers = [];
    let _lock_extraInitializers = [];
    let _generation_decorators;
    let _generation_initializers = [];
    let _generation_extraInitializers = [];
    let _next_id_decorators;
    let _next_id_initializers = [];
    let _next_id_extraInitializers = [];
    let _commits_decorators;
    let _commits_initializers = [];
    let _commits_extraInitializers = [];
    var State2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _lock_accessor_storage, __runInitializers7(this, _lock_initializers, void 0));
        __privateAdd(this, _generation_accessor_storage, (__runInitializers7(this, _lock_extraInitializers), __runInitializers7(this, _generation_initializers, void 0)));
        __privateAdd(this, _next_id_accessor_storage, (__runInitializers7(this, _generation_extraInitializers), __runInitializers7(this, _next_id_initializers, void 0)));
        __privateAdd(this, _commits_accessor_storage, (__runInitializers7(this, _next_id_extraInitializers), __runInitializers7(this, _commits_initializers, void 0)));
        __runInitializers7(this, _commits_extraInitializers);
      }
      /** Held by writers */
      get lock() {
        return __privateGet(this, _lock_accessor_storage);
      }
      set lock(value) {
        __privateSet(this, _lock_accessor_storage, value);
      }
      /** The generation of the current commit */
      get generation() {
        return __privateGet(this, _generation_accessor_storage);
      }
      set generation(value) {
        __privateSet(this, _generation_accessor_storage, value);
      }
      get next_id() {
        return __privateGet(this, _next_id_accessor_storage);
      }
      set next_id(value) {
        __privateSet(this, _next_id_accessor_storage, value);
      }
      /** The current and previous commits, at their generation modulo 2 */
      get commits() {
        return __privateGet(this, _commits_accessor_storage);
      }
      set commits(value) {
        __privateSet(this, _commits_accessor_storage, value);
      }
    }, _lock_accessor_storage = new WeakMap(), _generation_accessor_storage = new WeakMap(), _next_id_accessor_storage = new WeakMap(), _commits_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _lock_decorators = [(_a12 = types2).uint64.bind(_a12)];
      _generation_decorators = [(_b3 = types2).uint64.bind(_b3)];
      _next_id_decorators = [(_c3 = types2).uint64.bind(_c3)];
      _commits_decorators = [field(array(Commit, 2))];
      __esDecorate7(_a13, null, _lock_decorators, { kind: "accessor", name: "lock", static: false, private: false, access: { has: (obj) => "lock" in obj, get: (obj) => obj.lock, set: (obj, value) => {
        obj.lock = value;
      } }, metadata: _metadata }, _lock_initializers, _lock_extraInitializers);
      __esDecorate7(_a13, null, _generation_decorators, { kind: "accessor", name: "generation", static: false, private: false, access: { has: (obj) => "generation" in obj, get: (obj) => obj.generation, set: (obj, value) => {
        obj.generation = value;
      } }, metadata: _metadata }, _generation_initializers, _generation_extraInitializers);
      __esDecorate7(_a13, null, _next_id_decorators, { kind: "accessor", name: "next_id", static: false, private: false, access: { has: (obj) => "next_id" in obj, get: (obj) => obj.next_id, set: (obj, value) => {
        obj.next_id = value;
      } }, metadata: _metadata }, _next_id_initializers, _next_id_extraInitializers);
      __esDecorate7(_a13, null, _commits_decorators, { kind: "accessor", name: "commits", static: false, private: false, access: { has: (obj) => "commits" in obj, get: (obj) => obj.commits, set: (obj, value) => {
        obj.commits = value;
      } }, metadata: _metadata }, _commits_initializers, _commits_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      State2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.State"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return State2 = _classThis;
  })();
  var PendingHeader = (() => {
    var _a13, _next_accessor_storage, _count_accessor_storage, _generation_accessor_storage;
    var _a12, _b3, _c3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _next_decorators;
    let _next_initializers = [];
    let _next_extraInitializers = [];
    let _count_decorators;
    let _count_initializers = [];
    let _count_extraInitializers = [];
    let _generation_decorators;
    let _generation_initializers = [];
    let _generation_extraInitializers = [];
    var PendingHeader2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _next_accessor_storage, __runInitializers7(this, _next_initializers, void 0));
        __privateAdd(this, _count_accessor_storage, (__runInitializers7(this, _next_extraInitializers), __runInitializers7(this, _count_initializers, void 0)));
        __privateAdd(this, _generation_accessor_storage, (__runInitializers7(this, _count_extraInitializers), __runInitializers7(this, _generation_initializers, void 0)));
        __runInitializers7(this, _generation_extraInitializers);
      }
      get next() {
        return __privateGet(this, _next_accessor_storage);
      }
      set next(value) {
        __privateSet(this, _next_accessor_storage, value);
      }
      get count() {
        return __privateGet(this, _count_accessor_storage);
      }
      set count(value) {
        __privateSet(this, _count_accessor_storage, value);
      }
      get generation() {
        return __privateGet(this, _generation_accessor_storage);
      }
      set generation(value) {
        __privateSet(this, _generation_accessor_storage, value);
      }
    }, _next_accessor_storage = new WeakMap(), _count_accessor_storage = new WeakMap(), _generation_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _next_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _count_decorators = [(_b3 = types2).uint32.bind(_b3)];
      _generation_decorators = [(_c3 = types2).uint64.bind(_c3)];
      __esDecorate7(_a13, null, _next_decorators, { kind: "accessor", name: "next", static: false, private: false, access: { has: (obj) => "next" in obj, get: (obj) => obj.next, set: (obj, value) => {
        obj.next = value;
      } }, metadata: _metadata }, _next_initializers, _next_extraInitializers);
      __esDecorate7(_a13, null, _count_decorators, { kind: "accessor", name: "count", static: false, private: false, access: { has: (obj) => "count" in obj, get: (obj) => obj.count, set: (obj, value) => {
        obj.count = value;
      } }, metadata: _metadata }, _count_initializers, _count_extraInitializers);
      __esDecorate7(_a13, null, _generation_decorators, { kind: "accessor", name: "generation", static: false, private: false, access: { has: (obj) => "generation" in obj, get: (obj) => obj.generation, set: (obj, value) => {
        obj.generation = value;
      } }, metadata: _metadata }, _generation_initializers, _generation_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      PendingHeader2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.PendingHeader"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return PendingHeader2 = _classThis;
  })();
  var SpareHeader = (() => {
    var _a13, _next_accessor_storage, _count_accessor_storage;
    var _a12, _b3;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _next_decorators;
    let _next_initializers = [];
    let _next_extraInitializers = [];
    let _count_decorators;
    let _count_initializers = [];
    let _count_extraInitializers = [];
    var SpareHeader2 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _next_accessor_storage, __runInitializers7(this, _next_initializers, void 0));
        __privateAdd(this, _count_accessor_storage, (__runInitializers7(this, _next_extraInitializers), __runInitializers7(this, _count_initializers, void 0)));
        __runInitializers7(this, _count_extraInitializers);
      }
      get next() {
        return __privateGet(this, _next_accessor_storage);
      }
      set next(value) {
        __privateSet(this, _next_accessor_storage, value);
      }
      get count() {
        return __privateGet(this, _count_accessor_storage);
      }
      set count(value) {
        __privateSet(this, _count_accessor_storage, value);
      }
    }, _next_accessor_storage = new WeakMap(), _count_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _next_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _count_decorators = [(_b3 = types2).uint32.bind(_b3)];
      __esDecorate7(_a13, null, _next_decorators, { kind: "accessor", name: "next", static: false, private: false, access: { has: (obj) => "next" in obj, get: (obj) => obj.next, set: (obj, value) => {
        obj.next = value;
      } }, metadata: _metadata }, _next_initializers, _next_extraInitializers);
      __esDecorate7(_a13, null, _count_decorators, { kind: "accessor", name: "count", static: false, private: false, access: { has: (obj) => "count" in obj, get: (obj) => obj.count, set: (obj, value) => {
        obj.count = value;
      } }, metadata: _metadata }, _count_initializers, _count_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      SpareHeader2 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "sbfs.SpareHeader"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return SpareHeader2 = _classThis;
  })();
  var SuperBlock2 = (() => {
    var _a13, _checksum_accessor_storage, _magic_accessor_storage, _version_accessor_storage, _inode_format_accessor_storage, _required_features_accessor_storage, _optional_features_accessor_storage, _block_size_accessor_storage, _total_bytes_accessor_storage, _uuid_accessor_storage, _state_offset_accessor_storage, _epoch_slots_accessor_storage, _label_accessor_storage, __padding_accessor_storage, _lock_accessor_storage;
    var _a12, _b3, _c3, _d3, _e3, _f2, _g2, _h, _j, _k, _l;
    let _classDecorators = [struct.packed()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = $from(BufferView);
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _magic_decorators;
    let _magic_initializers = [];
    let _magic_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _inode_format_decorators;
    let _inode_format_initializers = [];
    let _inode_format_extraInitializers = [];
    let _required_features_decorators;
    let _required_features_initializers = [];
    let _required_features_extraInitializers = [];
    let _optional_features_decorators;
    let _optional_features_initializers = [];
    let _optional_features_extraInitializers = [];
    let _block_size_decorators;
    let _block_size_initializers = [];
    let _block_size_extraInitializers = [];
    let _total_bytes_decorators;
    let _total_bytes_initializers = [];
    let _total_bytes_extraInitializers = [];
    let _uuid_decorators;
    let _uuid_initializers = [];
    let _uuid_extraInitializers = [];
    let _state_offset_decorators;
    let _state_offset_initializers = [];
    let _state_offset_extraInitializers = [];
    let _epoch_slots_decorators;
    let _epoch_slots_initializers = [];
    let _epoch_slots_extraInitializers = [];
    let _label_decorators;
    let _label_initializers = [];
    let _label_extraInitializers = [];
    let __padding_decorators;
    let __padding_initializers = [];
    let __padding_extraInitializers = [];
    let _lock_decorators;
    let _lock_initializers = [];
    let _lock_extraInitializers = [];
    var SuperBlock3 = (_a13 = class extends _classSuper {
      constructor() {
        super(...arguments);
        __privateAdd(this, _checksum_accessor_storage, __runInitializers7(this, _checksum_initializers, void 0));
        __privateAdd(this, _magic_accessor_storage, (__runInitializers7(this, _checksum_extraInitializers), __runInitializers7(this, _magic_initializers, void 0)));
        __privateAdd(this, _version_accessor_storage, (__runInitializers7(this, _magic_extraInitializers), __runInitializers7(this, _version_initializers, void 0)));
        __privateAdd(this, _inode_format_accessor_storage, (__runInitializers7(this, _version_extraInitializers), __runInitializers7(this, _inode_format_initializers, void 0)));
        __privateAdd(this, _required_features_accessor_storage, (__runInitializers7(this, _inode_format_extraInitializers), __runInitializers7(this, _required_features_initializers, void 0)));
        __privateAdd(this, _optional_features_accessor_storage, (__runInitializers7(this, _required_features_extraInitializers), __runInitializers7(this, _optional_features_initializers, void 0)));
        __privateAdd(this, _block_size_accessor_storage, (__runInitializers7(this, _optional_features_extraInitializers), __runInitializers7(this, _block_size_initializers, void 0)));
        __privateAdd(this, _total_bytes_accessor_storage, (__runInitializers7(this, _block_size_extraInitializers), __runInitializers7(this, _total_bytes_initializers, void 0)));
        __privateAdd(this, _uuid_accessor_storage, (__runInitializers7(this, _total_bytes_extraInitializers), __runInitializers7(this, _uuid_initializers, void 0)));
        __privateAdd(this, _state_offset_accessor_storage, (__runInitializers7(this, _uuid_extraInitializers), __runInitializers7(this, _state_offset_initializers, void 0)));
        __privateAdd(this, _epoch_slots_accessor_storage, (__runInitializers7(this, _state_offset_extraInitializers), __runInitializers7(this, _epoch_slots_initializers, void 0)));
        __privateAdd(this, _label_accessor_storage, (__runInitializers7(this, _epoch_slots_extraInitializers), __runInitializers7(this, _label_initializers, void 0)));
        __privateAdd(this, __padding_accessor_storage, (__runInitializers7(this, _label_extraInitializers), __runInitializers7(this, __padding_initializers, void 0)));
        __privateAdd(this, _lock_accessor_storage, (__runInitializers7(this, __padding_extraInitializers), __runInitializers7(this, _lock_initializers, void 0)));
        __runInitializers7(this, _lock_extraInitializers);
      }
      /** crc32c of the bytes from 4 up to `lock` */
      get checksum() {
        return __privateGet(this, _checksum_accessor_storage);
      }
      set checksum(value) {
        __privateSet(this, _checksum_accessor_storage, value);
      }
      get magic() {
        return __privateGet(this, _magic_accessor_storage);
      }
      set magic(value) {
        __privateSet(this, _magic_accessor_storage, value);
      }
      /**
       * The version of the on-disk format
       * 1: v1.10.0+, append-only metadata blocks
       * 2: copy-on-write B+ trees
       */
      get version() {
        return __privateGet(this, _version_accessor_storage);
      }
      set version(value) {
        __privateSet(this, _version_accessor_storage, value);
      }
      /** Which format of `Inode` is used */
      get inode_format() {
        return __privateGet(this, _inode_format_accessor_storage);
      }
      set inode_format(value) {
        __privateSet(this, _inode_format_accessor_storage, value);
      }
      /** Features that must be supported to mount the file system. None are defined. */
      get required_features() {
        return __privateGet(this, _required_features_accessor_storage);
      }
      set required_features(value) {
        __privateSet(this, _required_features_accessor_storage, value);
      }
      /** Features that may be ignored. None are defined. */
      get optional_features() {
        return __privateGet(this, _optional_features_accessor_storage);
      }
      set optional_features(value) {
        __privateSet(this, _optional_features_accessor_storage, value);
      }
      /** Size of tree nodes and other metadata blocks */
      get block_size() {
        return __privateGet(this, _block_size_accessor_storage);
      }
      set block_size(value) {
        __privateSet(this, _block_size_accessor_storage, value);
      }
      /** The size of the entire file system, including the super block */
      get total_bytes() {
        return __privateGet(this, _total_bytes_accessor_storage);
      }
      set total_bytes(value) {
        __privateSet(this, _total_bytes_accessor_storage, value);
      }
      get uuid() {
        return __privateGet(this, _uuid_accessor_storage);
      }
      set uuid(value) {
        __privateSet(this, _uuid_accessor_storage, value);
      }
      /** Byte offset of the shared state */
      get state_offset() {
        return __privateGet(this, _state_offset_accessor_storage);
      }
      set state_offset(value) {
        __privateSet(this, _state_offset_accessor_storage, value);
      }
      get epoch_slots() {
        return __privateGet(this, _epoch_slots_accessor_storage);
      }
      set epoch_slots(value) {
        __privateSet(this, _epoch_slots_accessor_storage, value);
      }
      /** An optional label for the file system */
      get label() {
        return __privateGet(this, _label_accessor_storage);
      }
      set label(value) {
        __privateSet(this, _label_accessor_storage, value);
      }
      get _padding() {
        return __privateGet(this, __padding_accessor_storage);
      }
      set _padding(value) {
        __privateSet(this, __padding_accessor_storage, value);
      }
      /** Held while the file system is created or upgraded. Not covered by the checksum. */
      get lock() {
        return __privateGet(this, _lock_accessor_storage);
      }
      set lock(value) {
        __privateSet(this, _lock_accessor_storage, value);
      }
      computeChecksum() {
        return crc32c(new Uint8Array(this.buffer, this.byteOffset + 4, offsetof(SuperBlock3, "lock") - 4));
      }
      update() {
        this.checksum = this.computeChecksum();
      }
      /** Checks that a file system of `byteLength` bytes can be mounted using this super block */
      validate(byteLength) {
        const { block_size } = this;
        if (this.version != 2)
          throw crit(withErrno("EIO", `sbfs: unsupported version ${this.version}`));
        if (this.checksum != this.computeChecksum())
          throw crit(withErrno("EIO", "sbfs: checksum mismatch for super block"));
        if (this.required_features)
          throw crit(withErrno("EIO", `sbfs: unsupported features 0x${this.required_features.toString(16)}`));
        if (this.inode_format != _inode_version)
          throw crit(withErrno("EIO", "sbfs: inode format mismatch"));
        if (this.total_bytes > BigInt(Math.min(byteLength, max_size)))
          throw crit(withErrno("EIO", "sbfs: buffer is smaller than the file system"));
        if (block_size < 512 || block_size > 65536 || block_size & block_size - 1)
          throw crit(withErrno("EIO", `sbfs: invalid block size ${block_size}`));
        if (!this.epoch_slots)
          throw crit(withErrno("EIO", "sbfs: no epoch slots"));
        if ((this.byteOffset + this.state_offset) % 8)
          throw crit(withErrno("EIO", "sbfs: misaligned shared state"));
      }
    }, _checksum_accessor_storage = new WeakMap(), _magic_accessor_storage = new WeakMap(), _version_accessor_storage = new WeakMap(), _inode_format_accessor_storage = new WeakMap(), _required_features_accessor_storage = new WeakMap(), _optional_features_accessor_storage = new WeakMap(), _block_size_accessor_storage = new WeakMap(), _total_bytes_accessor_storage = new WeakMap(), _uuid_accessor_storage = new WeakMap(), _state_offset_accessor_storage = new WeakMap(), _epoch_slots_accessor_storage = new WeakMap(), _label_accessor_storage = new WeakMap(), __padding_accessor_storage = new WeakMap(), _lock_accessor_storage = new WeakMap(), _classThis = _a13, (() => {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _checksum_decorators = [(_a12 = types2).uint32.bind(_a12)];
      _magic_decorators = [(_b3 = types2).uint32.bind(_b3)];
      _version_decorators = [(_c3 = types2).uint16.bind(_c3)];
      _inode_format_decorators = [(_d3 = types2).uint16.bind(_d3)];
      _required_features_decorators = [(_e3 = types2).uint32.bind(_e3)];
      _optional_features_decorators = [(_f2 = types2).uint32.bind(_f2)];
      _block_size_decorators = [(_g2 = types2).uint32.bind(_g2)];
      _total_bytes_decorators = [(_h = types2).uint64.bind(_h)];
      _uuid_decorators = [types2.uint8(16)];
      _state_offset_decorators = [(_j = types2).uint32.bind(_j)];
      _epoch_slots_decorators = [(_k = types2).uint32.bind(_k)];
      _label_decorators = [types2.char(64)];
      __padding_decorators = [types2.char(128)];
      _lock_decorators = [(_l = types2).uint64.bind(_l)];
      __esDecorate7(_a13, null, _checksum_decorators, { kind: "accessor", name: "checksum", static: false, private: false, access: { has: (obj) => "checksum" in obj, get: (obj) => obj.checksum, set: (obj, value) => {
        obj.checksum = value;
      } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
      __esDecorate7(_a13, null, _magic_decorators, { kind: "accessor", name: "magic", static: false, private: false, access: { has: (obj) => "magic" in obj, get: (obj) => obj.magic, set: (obj, value) => {
        obj.magic = value;
      } }, metadata: _metadata }, _magic_initializers, _magic_extraInitializers);
      __esDecorate7(_a13, null, _version_decorators, { kind: "accessor", name: "version", static: false, private: false, access: { has: (obj) => "version" in obj, get: (obj) => obj.version, set: (obj, value) => {
        obj.version = value;
      } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
      __esDecorate7(_a13, null, _inode_format_decorators, { kind: "accessor", name: "inode_format", static: false, private: false, access: { has: (obj) => "inode_format" in obj, get: (obj) => obj.inode_format, set: (obj, value) => {
        obj.inode_format = value;
      } }, metadata: _metadata }, _inode_format_initializers, _inode_format_extraInitializers);
      __esDecorate7(_a13, null, _required_features_decorators, { kind: "accessor", name: "required_features", static: false, private: false, access: { has: (obj) => "required_features" in obj, get: (obj) => obj.required_features, set: (obj, value) => {
        obj.required_features = value;
      } }, metadata: _metadata }, _required_features_initializers, _required_features_extraInitializers);
      __esDecorate7(_a13, null, _optional_features_decorators, { kind: "accessor", name: "optional_features", static: false, private: false, access: { has: (obj) => "optional_features" in obj, get: (obj) => obj.optional_features, set: (obj, value) => {
        obj.optional_features = value;
      } }, metadata: _metadata }, _optional_features_initializers, _optional_features_extraInitializers);
      __esDecorate7(_a13, null, _block_size_decorators, { kind: "accessor", name: "block_size", static: false, private: false, access: { has: (obj) => "block_size" in obj, get: (obj) => obj.block_size, set: (obj, value) => {
        obj.block_size = value;
      } }, metadata: _metadata }, _block_size_initializers, _block_size_extraInitializers);
      __esDecorate7(_a13, null, _total_bytes_decorators, { kind: "accessor", name: "total_bytes", static: false, private: false, access: { has: (obj) => "total_bytes" in obj, get: (obj) => obj.total_bytes, set: (obj, value) => {
        obj.total_bytes = value;
      } }, metadata: _metadata }, _total_bytes_initializers, _total_bytes_extraInitializers);
      __esDecorate7(_a13, null, _uuid_decorators, { kind: "accessor", name: "uuid", static: false, private: false, access: { has: (obj) => "uuid" in obj, get: (obj) => obj.uuid, set: (obj, value) => {
        obj.uuid = value;
      } }, metadata: _metadata }, _uuid_initializers, _uuid_extraInitializers);
      __esDecorate7(_a13, null, _state_offset_decorators, { kind: "accessor", name: "state_offset", static: false, private: false, access: { has: (obj) => "state_offset" in obj, get: (obj) => obj.state_offset, set: (obj, value) => {
        obj.state_offset = value;
      } }, metadata: _metadata }, _state_offset_initializers, _state_offset_extraInitializers);
      __esDecorate7(_a13, null, _epoch_slots_decorators, { kind: "accessor", name: "epoch_slots", static: false, private: false, access: { has: (obj) => "epoch_slots" in obj, get: (obj) => obj.epoch_slots, set: (obj, value) => {
        obj.epoch_slots = value;
      } }, metadata: _metadata }, _epoch_slots_initializers, _epoch_slots_extraInitializers);
      __esDecorate7(_a13, null, _label_decorators, { kind: "accessor", name: "label", static: false, private: false, access: { has: (obj) => "label" in obj, get: (obj) => obj.label, set: (obj, value) => {
        obj.label = value;
      } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
      __esDecorate7(_a13, null, __padding_decorators, { kind: "accessor", name: "_padding", static: false, private: false, access: { has: (obj) => "_padding" in obj, get: (obj) => obj._padding, set: (obj, value) => {
        obj._padding = value;
      } }, metadata: _metadata }, __padding_initializers, __padding_extraInitializers);
      __esDecorate7(_a13, null, _lock_decorators, { kind: "accessor", name: "lock", static: false, private: false, access: { has: (obj) => "lock" in obj, get: (obj) => obj.lock, set: (obj, value) => {
        obj.lock = value;
      } }, metadata: _metadata }, _lock_initializers, _lock_extraInitializers);
      __esDecorate7(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
      SuperBlock3 = _classThis = _classDescriptor.value;
      if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })(), __publicField(_a13, "name", "SuperBlockV2"), __runInitializers7(_classThis, _classExtraInitializers), _a13);
    return SuperBlock3 = _classThis;
  })();
  var sparesExhausted = withErrno("ENOSPC", "sbfs: no spare blocks");
  var defaultStateSize = sizeof(State) + EpochTable.sizeOf(default_epoch_slots);

  // node_modules/@zenfs/core/dist/backends/single_buffer/backend.js
  var lockOffset = offsetof(SuperBlock2, "lock");

  // node_modules/@zenfs/core/dist/node/async.js
  var import_buffer13 = __toESM(require_buffer(), 1);
  var nop2 = () => {
  };
  function rename4(oldPath, newPath, cb = nop2) {
    rename3.call(this, oldPath, newPath).then(() => cb(null), cb);
  }
  function exists2(path, cb = nop2) {
    exists.call(this, path).then(cb, () => cb(false));
  }
  setPromisified(exists2, function(path) {
    return new Promise((resolve4) => exists2.call(this, path, resolve4));
  });
  function stat4(path, options, callback = nop2) {
    callback = typeof options == "function" ? options : callback;
    stat3.call(this, path, typeof options != "function" ? options : {}).then((stats) => callback(null, stats), callback);
  }
  function lstat2(path, options, callback = nop2) {
    callback = typeof options == "function" ? options : callback;
    lstat.call(this, path, typeof options != "function" ? options : {}).then((stats) => callback(null, stats), callback);
  }
  function truncate2(path, cbLen = 0, cb = nop2) {
    cb = typeof cbLen === "function" ? cbLen : cb;
    const len = typeof cbLen === "number" ? cbLen : 0;
    truncate.call(this, path, len).then(() => cb(null), cb);
  }
  function unlink2(path, cb = nop2) {
    unlink.call(this, path).then(() => cb(null), cb);
  }
  function open4(path, flag, cbMode, cb = nop2) {
    if (typeof flag == "function")
      [cb, flag] = [flag, void 0];
    if (typeof cbMode == "function")
      [cb, cbMode] = [cbMode, void 0];
    open3.call(this, path, flag, normalizeMode(cbMode, 420)).then((handle) => cb(null, handle.fd), cb);
  }
  function readFile2(filename, options, cb = nop2) {
    cb = typeof options === "function" ? options : cb;
    readFile.call(this, typeof filename == "number" ? new FileHandle(this, filename) : filename, typeof options === "function" ? null : options).then((data) => cb(null, data), cb);
  }
  function writeFile2(filename, data, cbEncOpts, cb = nop2) {
    cb = typeof cbEncOpts === "function" ? cbEncOpts : cb;
    writeFile.call(this, typeof filename == "number" ? new FileHandle(this, filename) : filename, data, typeof cbEncOpts != "function" ? cbEncOpts : null).then(() => cb(null), cb);
  }
  function appendFile2(filename, data, cbEncOpts, cb = nop2) {
    const optionsOrEncoding = typeof cbEncOpts != "function" ? cbEncOpts : void 0;
    cb = typeof cbEncOpts === "function" ? cbEncOpts : cb;
    appendFile.call(this, typeof filename == "number" ? new FileHandle(this, filename) : filename, data, optionsOrEncoding).then(() => cb(null), cb);
  }
  function fstat(fd, options, cb = nop2) {
    cb = typeof options == "function" ? options : cb;
    new FileHandle(this, fd).stat().then((stats) => cb(null, typeof options == "object" && options?.bigint ? new BigIntStats(stats) : stats), cb);
  }
  function close(fd, cb = nop2) {
    new FileHandle(this, fd).close().then(() => cb(null), cb);
  }
  function ftruncate(fd, lenOrCB, cb = nop2) {
    const length = typeof lenOrCB === "number" ? lenOrCB : 0;
    cb = typeof lenOrCB === "function" ? lenOrCB : cb;
    new FileHandle(this, fd).truncate(length).then(() => cb(null), cb);
  }
  function fsync(fd, cb = nop2) {
    new FileHandle(this, fd).sync().then(() => cb(null), cb);
  }
  function fdatasync(fd, cb = nop2) {
    new FileHandle(this, fd).datasync().then(() => cb(null), cb);
  }
  function write(fd, data, cbPosOff, cbLenEnc, cbPosEnc, cb = nop2) {
    validateData(data, "buffer");
    let buffer, offset, length, position, encoding;
    const handle = new FileHandle(this, fd);
    const _cb = [cbPosOff, cbLenEnc, cbPosEnc].find((arg) => typeof arg === "function") ?? cb;
    if (typeof data === "string") {
      position = typeof cbPosOff === "number" ? cbPosOff : null;
      encoding = typeof cbLenEnc === "string" ? cbLenEnc : "utf8";
      buffer = import_buffer13.Buffer.from(data, encoding);
      offset = 0;
      length = buffer.byteLength;
    } else if (typeof cbPosOff == "object" && cbPosOff !== null) {
      buffer = import_buffer13.Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      offset = cbPosOff.offset ?? 0;
      length = cbPosOff.length ?? buffer.byteLength - offset;
      position = cbPosOff.position ?? null;
    } else {
      buffer = import_buffer13.Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      offset = typeof cbPosOff === "number" ? cbPosOff : 0;
      length = typeof cbLenEnc === "number" ? cbLenEnc : buffer.byteLength - offset;
      position = typeof cbPosEnc === "number" ? cbPosEnc : null;
    }
    handle.write(buffer, offset, length, position).then(({ bytesWritten }) => _cb(null, bytesWritten, data), _cb);
  }
  promisifyResults(write, "bytesWritten", "buffer");
  function read(fd, ...args) {
    const cb = typeof args.at(-1) == "function" ? args.pop() : nop2;
    new FileHandle(this, fd).read(...args).then(({ bytesRead, buffer }) => cb(null, bytesRead, buffer), cb);
  }
  promisifyResults(read, "bytesRead", "buffer");
  function fchown(fd, uid, gid, cb = nop2) {
    new FileHandle(this, fd).chown(uid, gid).then(() => cb(null), cb);
  }
  function fchmod(fd, mode, cb) {
    new FileHandle(this, fd).chmod(mode).then(() => cb(null), cb);
  }
  function futimes(fd, atime, mtime, cb = nop2) {
    new FileHandle(this, fd).utimes(atime, mtime).then(() => cb(null), cb);
  }
  function rmdir2(path, options, cb = nop2) {
    cb = typeof options == "function" ? options : cb;
    rmdir.call(this, path).then(() => cb(null), cb);
  }
  function mkdir4(path, mode, cb = nop2) {
    mkdir3.call(this, path, mode).then(() => cb(null), cb);
  }
  function readdir4(path, _options, cb = nop2) {
    cb = typeof _options == "function" ? _options : cb;
    const options = typeof _options != "function" ? _options : {};
    readdir2.call(this, path, options).then((entries2) => cb(null, entries2), cb);
  }
  function link4(existing, newpath, cb = nop2) {
    link3.call(this, existing, newpath).then(() => cb(null), cb);
  }
  function symlink2(target, path, typeOrCB, cb = nop2) {
    const type = typeof typeOrCB === "string" ? typeOrCB : "file";
    cb = typeof typeOrCB === "function" ? typeOrCB : cb;
    symlink.call(this, target, path, type).then(() => cb(null), cb);
  }
  function readlink4(path, options, callback = nop2) {
    callback = typeof options == "function" ? options : callback;
    readlink3.call(this, path, typeof options == "function" ? null : options).then((result) => callback(null, result), callback);
  }
  function chown4(path, uid, gid, cb = nop2) {
    chown3.call(this, path, uid, gid).then(() => cb(null), cb);
  }
  function lchown2(path, uid, gid, cb = nop2) {
    lchown.call(this, path, uid, gid).then(() => cb(null), cb);
  }
  function chmod4(path, mode, cb = nop2) {
    chmod3.call(this, path, mode).then(() => cb(null), cb);
  }
  function lchmod2(path, mode, cb = nop2) {
    lchmod.call(this, path, mode).then(() => cb(null), cb);
  }
  function utimes4(path, atime, mtime, cb = nop2) {
    utimes3.call(this, path, atime, mtime).then(() => cb(null), cb);
  }
  function lutimes2(path, atime, mtime, cb = nop2) {
    lutimes.call(this, path, atime, mtime).then(() => cb(null), cb);
  }
  function realpath2(path, options, callback) {
    const cb = typeof options == "function" ? options : callback ?? nop2;
    realpath.call(this, path, typeof options == "function" ? null : options).then((result) => cb(null, result), cb);
  }
  realpath2.native = realpath2;
  function access2(path, cbMode, cb = nop2) {
    const mode = typeof cbMode === "number" ? cbMode : R_OK;
    cb = typeof cbMode === "function" ? cbMode : cb;
    access.call(this, path, mode).then(() => cb(null), cb);
  }
  var statWatchers = /* @__PURE__ */ new Map();
  function watchFile(path, options, listener) {
    const normalizedPath = normalizePath.call(this, path);
    const opts = typeof options != "function" ? options : {};
    listener = typeof options == "function" ? options : listener;
    if (!listener)
      throw UV("EINVAL", "watch", path.toString());
    let watcher = statWatchers.get(normalizedPath);
    if (!watcher) {
      watcher = new StatWatcher(this, normalizedPath, opts);
      statWatchers.set(normalizedPath, watcher);
    }
    watcher.on("change", listener);
    return watcher;
  }
  function unwatchFile(path, listener) {
    const normalizedPath = normalizePath.call(this, path);
    const watcher = statWatchers.get(normalizedPath);
    if (!watcher)
      return;
    if (listener)
      watcher.off("change", listener);
    else
      watcher.removeAllListeners("change");
    if (watcher.listenerCount("change"))
      return;
    watcher.stop();
    statWatchers.delete(normalizedPath);
  }
  function watch2(path, options, listener) {
    const watcher = new FSWatcher(this, normalizePath.call(this, path), typeof options == "object" ? options : {});
    listener = typeof options == "function" ? options : listener;
    watcher.on("change", listener || nop2);
    return watcher;
  }
  function streamHandle(context, path, defaultFlags, options) {
    const { fd } = options;
    const operations = options.fs;
    if (operations) {
      validateOperations(operations, defaultFlags == "r" ? "read" : "write", options);
      return OperationsHandle.open(operations, path, fd, options.flags ?? defaultFlags, options.mode ?? 438);
    }
    if (typeof fd == "number")
      return new FileHandle(context, fd);
    if (fd != null)
      return fd;
    return open3.call(context, path, options.flags ?? defaultFlags, options.mode);
  }
  function createReadStream(path, options) {
    options = typeof options == "object" ? options : { encoding: options };
    return new ReadStream({ ...options, signal: options?.signal ?? void 0 }, streamHandle(this, path, "r", options));
  }
  function createWriteStream(path, options) {
    options = typeof options == "object" ? options : { encoding: options };
    return new WriteStream(options, streamHandle(this, path, "w", options));
  }
  function rm2(path, options, callback = nop2) {
    callback = typeof options === "function" ? options : callback;
    rm.call(this, path, typeof options === "function" ? void 0 : options).then(() => callback(null), callback);
  }
  function mkdtemp2(prefix, options, callback = nop2) {
    callback = typeof options === "function" ? options : callback;
    mkdtemp.call(this, prefix, typeof options != "function" ? options : null).then((result) => callback(null, result), callback);
  }
  function mkstemp2(prefix, options, callback = nop2) {
    const done = typeof options == "function" ? options : callback;
    mkstemp.call(this, prefix, typeof options == "function" ? void 0 : options).then(({ path, handle }) => done(null, { path, fd: handle.fd }), done);
  }
  function copyFile2(src, dest, flags, callback = nop2) {
    callback = typeof flags === "function" ? flags : callback;
    copyFile.call(this, src, dest, typeof flags === "function" ? void 0 : flags).then(() => callback(null), callback);
  }
  function readv(fd, buffers, position, cb = nop2) {
    cb = typeof position === "function" ? position : cb;
    new FileHandle(this, fd).readv(buffers, typeof position === "function" ? void 0 : position).then(({ buffers: buffers2, bytesRead }) => cb(null, bytesRead, buffers2), cb);
  }
  promisifyResults(readv, "bytesRead", "buffers");
  function writev(fd, buffers, position, cb = nop2) {
    cb = typeof position === "function" ? position : cb;
    new FileHandle(this, fd).writev(buffers, typeof position === "function" ? void 0 : position).then(({ buffers: buffers2, bytesWritten }) => cb(null, bytesWritten, buffers2), cb);
  }
  promisifyResults(writev, "bytesWritten", "buffer");
  function opendir2(path, options, cb = nop2) {
    cb = typeof options === "function" ? options : cb;
    opendir.call(this, path, typeof options === "function" ? void 0 : options).then((result) => cb(null, result), cb);
  }
  function cp2(source, destination, opts, callback = nop2) {
    callback = typeof opts === "function" ? opts : callback;
    cp.call(this, source, destination, typeof opts === "function" ? void 0 : opts).then(() => callback(null), callback);
  }
  function statfs2(path, options, callback = nop2) {
    callback = typeof options === "function" ? options : callback;
    statfs.call(this, path, typeof options === "function" ? void 0 : options).then((result) => callback(null, result), callback);
  }
  async function openAsBlob(path, options = {}) {
    const type = blobType(options);
    return new Blob([await readFile.call(this, normalizePath.call(this, path), {})], { type });
  }
  function glob2(pattern2, options, callback = nop2) {
    callback = typeof options == "function" ? options : callback;
    const it = glob.call(this, pattern2, typeof options === "function" ? void 0 : options);
    Array.fromAsync(it).then((results) => callback(null, results ?? []), (e) => callback(e));
  }

  // node_modules/@zenfs/core/dist/node/utf8stream.js
  var import_buffer14 = __toESM(require_buffer(), 1);
  function error(code, message) {
    return Object.assign(new Error(message), { code });
  }
  function invalidState(message) {
    return error("ERR_INVALID_STATE", "Invalid state: " + message);
  }
  function validateUint32(value, name) {
    validateType(value, name, "number");
    if (!Number.isInteger(value) || value < 0 || value > 4294967295)
      throw outOfRange(name, "an integer >= 0 and <= 4294967295", value);
  }
  var maxWriteDefault = 16 * 1024;
  var busyWriteTimeout = 100;
  var emptyBuffer2 = import_buffer14.Buffer.alloc(0);
  var _utf8StreamFS = { open: open4, openSync, close, write, writeSync, fsync, fsyncSync, mkdir: mkdir4, mkdirSync };
  function _release(writingBuf, len, n) {
    if (typeof writingBuf == "string") {
      const byteLength = import_buffer14.Buffer.byteLength(writingBuf);
      if (byteLength === n) {
        n = writingBuf.length;
      } else {
        const buf = import_buffer14.Buffer.from(writingBuf);
        while (n > 0 && (buf[n] & 192) === 128)
          n--;
        n = buf.subarray(0, n).toString().length;
      }
    }
    return { writingBuf: writingBuf.slice(n), len: Math.max(len - n, 0) };
  }
  function _mergeBuffers(bufs, len) {
    if (!bufs.length)
      return emptyBuffer2;
    if (bufs.length == 1)
      return bufs[0];
    return import_buffer14.Buffer.concat(bufs, len);
  }
  var kUtf8StreamFS = Symbol("Utf8StreamFS");
  var _a11, _len, _fd, _bufs, _lens, _writing, _ending, _reopening, _asyncDrainScheduled, _flushPending, _hwm, _file, _destroyed, _minLength, _maxLength, _maxWrite, _opening, _periodicFlush, _periodicFlushTimer, _sync, _fsync, _append, _mode, _retryEAGAIN, _mkdir, _contentMode, _writingBuf, _fs, _Utf8Stream_instances, flushSyncBuffer_fn, flushSyncUtf8_fn, emitDrain_fn, released_fn, writeToFS_fn, writeToFSSync_fn, openFile_fn, actualClose_fn, actualWrite_fn, callFlushCallbackOnDrain_fn;
  var _Utf8Stream = class _Utf8Stream extends import_index.default {
    constructor(options = {}) {
      validateType(options, "options", "object");
      const {
        dest,
        minLength,
        maxLength,
        maxWrite,
        periodicFlush,
        sync,
        append = true,
        mkdir: mkdir5,
        retryEAGAIN,
        fsync: fsync2,
        contentMode = "utf8",
        mode,
        // Provides for a custom fs implementation. Mostly useful for testing.
        fs: overrideFS = {}
      } = options;
      super();
      __privateAdd(this, _Utf8Stream_instances);
      __privateAdd(this, _len, 0);
      __privateAdd(this, _fd, -1);
      /** Pending chunks. Strings when `contentMode` is `utf8`, groups of buffers when it is `buffer`. */
      __privateAdd(this, _bufs, []);
      /** The byte length of each group in `#bufs`. Only used when `contentMode` is `buffer`. */
      __privateAdd(this, _lens, []);
      __privateAdd(this, _writing, false);
      __privateAdd(this, _ending, false);
      __privateAdd(this, _reopening, false);
      __privateAdd(this, _asyncDrainScheduled, false);
      __privateAdd(this, _flushPending, false);
      /** 16 KB */
      __privateAdd(this, _hwm, 16387);
      __privateAdd(this, _file, null);
      __privateAdd(this, _destroyed, false);
      __privateAdd(this, _minLength, 0);
      __privateAdd(this, _maxLength, 0);
      __privateAdd(this, _maxWrite, maxWriteDefault);
      __privateAdd(this, _opening, false);
      __privateAdd(this, _periodicFlush, 0);
      __privateAdd(this, _periodicFlushTimer);
      __privateAdd(this, _sync, false);
      __privateAdd(this, _fsync, false);
      __privateAdd(this, _append, true);
      __privateAdd(this, _mode);
      __privateAdd(this, _retryEAGAIN, () => true);
      __privateAdd(this, _mkdir, false);
      __privateAdd(this, _contentMode);
      __privateAdd(this, _writingBuf, "");
      __privateAdd(this, _fs);
      const fd = options.fd ?? dest;
      validateType(overrideFS, "options.fs", "object");
      __privateSet(this, _fs, { ...this.constructor[kUtf8StreamFS], ...overrideFS });
      const _fs2 = __privateGet(this, _fs);
      for (const key of ["write", "writeSync", "fsync", "fsyncSync", "close", "open", "mkdir", "mkdirSync"]) {
        validateType(_fs2[key], `options.fs.${key}`, "function");
      }
      __privateSet(this, _hwm, Math.max(minLength || 0, __privateGet(this, _hwm)));
      __privateSet(this, _minLength, minLength || 0);
      __privateSet(this, _maxLength, maxLength || 0);
      __privateSet(this, _maxWrite, maxWrite || maxWriteDefault);
      __privateSet(this, _periodicFlush, periodicFlush || 0);
      __privateSet(this, _sync, sync || false);
      __privateSet(this, _fsync, fsync2 || false);
      __privateSet(this, _append, append || false);
      __privateSet(this, _mode, mode);
      __privateSet(this, _retryEAGAIN, retryEAGAIN || (() => true));
      __privateSet(this, _mkdir, mkdir5 || false);
      validateUint32(__privateGet(this, _hwm), "options.hwm");
      validateUint32(__privateGet(this, _minLength), "options.minLength");
      validateUint32(__privateGet(this, _maxLength), "options.maxLength");
      validateUint32(__privateGet(this, _maxWrite), "options.maxWrite");
      validateUint32(__privateGet(this, _periodicFlush), "options.periodicFlush");
      for (const [key, value] of [
        ["sync", __privateGet(this, _sync)],
        ["fsync", __privateGet(this, _fsync)],
        ["append", __privateGet(this, _append)],
        ["mkdir", __privateGet(this, _mkdir)]
      ]) {
        validateType(value, `options.${key}`, "boolean");
      }
      validateType(__privateGet(this, _retryEAGAIN), "options.retryEAGAIN", "function");
      if (contentMode != "buffer" && contentMode != "utf8")
        throw invalidArgumentValue("options.contentMode", contentMode, "must be one of: 'buffer', 'utf8'");
      __privateSet(this, _contentMode, contentMode);
      __privateSet(this, _writingBuf, contentMode == "buffer" ? emptyBuffer2 : "");
      if (typeof fd == "number") {
        __privateSet(this, _fd, fd);
        queueMicrotask(() => this.emit("ready"));
      } else if (typeof fd == "string") {
        __privateMethod(this, _Utf8Stream_instances, openFile_fn).call(this, fd);
      } else {
        throw invalidArgumentType("fd", ["number", "string"], fd);
      }
      if (__privateGet(this, _minLength) >= __privateGet(this, _maxWrite))
        throw invalidArgumentValue("minLength", __privateGet(this, _minLength), `should be smaller than maxWrite (${__privateGet(this, _maxWrite)})`);
      if (__privateGet(this, _periodicFlush) !== 0) {
        __privateSet(this, _periodicFlushTimer, setInterval(() => this.flush(), __privateGet(this, _periodicFlush)));
        __privateGet(this, _periodicFlushTimer).unref?.();
      }
    }
    /** @hidden @internal */
    static _withContext(ctx) {
      var _a12, _b3;
      assertContext(ctx);
      class $Utf8Stream extends (_b3 = _Utf8Stream, _a12 = kUtf8StreamFS, _b3) {
      }
      __publicField($Utf8Stream, _a12, bindFunctions(_utf8StreamFS, ctx));
      return $Utf8Stream;
    }
    /**
     * When `contentMode` is `utf8`, `data` must be a string. When it is `buffer`, `data` must be a `Buffer`.
     * @returns Whether the internal buffer is below the high water mark
     */
    write(data) {
      if (__privateGet(this, _destroyed))
        throw invalidState("Utf8Stream is destroyed");
      if (__privateGet(this, _contentMode) == "buffer") {
        validateType(data, "data", "Buffer");
      } else {
        validateType(data, "data", "string");
      }
      const len = __privateGet(this, _len) + data.length;
      if (__privateGet(this, _maxLength) && len > __privateGet(this, _maxLength)) {
        this.emit("drop", data);
        return __privateGet(this, _len) < __privateGet(this, _hwm);
      }
      const last = __privateGet(this, _bufs).length - 1;
      if (__privateGet(this, _contentMode) == "buffer") {
        const bufs = __privateGet(this, _bufs);
        if (!bufs.length || __privateGet(this, _lens)[last] + data.length > __privateGet(this, _maxWrite)) {
          bufs.push([data]);
          __privateGet(this, _lens).push(data.length);
        } else {
          bufs[last].push(data);
          __privateGet(this, _lens)[last] += data.length;
        }
      } else {
        const bufs = __privateGet(this, _bufs);
        if (!bufs.length || bufs[last].length + data.length > __privateGet(this, _maxWrite))
          bufs.push(data);
        else
          bufs[last] += data;
      }
      __privateSet(this, _len, len);
      if (!__privateGet(this, _writing) && __privateGet(this, _len) >= __privateGet(this, _minLength))
        __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
      return __privateGet(this, _len) < __privateGet(this, _hwm);
    }
    /**
     * Writes the current buffer to the file if a write was not in progress.
     * Does nothing if `minLength` is zero or if it is already writing.
     */
    flush(cb) {
      if (cb != null)
        validateType(cb, "cb", "function");
      if (__privateGet(this, _destroyed)) {
        const error2 = invalidState("Utf8Stream is destroyed");
        if (!cb)
          throw error2;
        cb(error2);
        return;
      }
      if (__privateGet(this, _minLength) <= 0) {
        cb?.(null);
        return;
      }
      if (cb)
        __privateMethod(this, _Utf8Stream_instances, callFlushCallbackOnDrain_fn).call(this, cb);
      if (__privateGet(this, _writing))
        return;
      if (!__privateGet(this, _bufs).length) {
        __privateGet(this, _bufs).push(__privateGet(this, _contentMode) == "buffer" ? [] : "");
        if (__privateGet(this, _contentMode) == "buffer")
          __privateGet(this, _lens).push(0);
      }
      __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
    }
    /**
     * Flushes the buffered data synchronously. This is a costly operation.
     */
    flushSync() {
      if (__privateGet(this, _destroyed))
        throw invalidState("Utf8Stream is destroyed");
      if (__privateGet(this, _fd) < 0)
        throw invalidState("Invalid file descriptor");
      if (__privateGet(this, _contentMode) == "buffer")
        __privateMethod(this, _Utf8Stream_instances, flushSyncBuffer_fn).call(this);
      else
        __privateMethod(this, _Utf8Stream_instances, flushSyncUtf8_fn).call(this);
    }
    /**
     * Reopen the file in place, useful for log rotation.
     */
    reopen(file) {
      if (__privateGet(this, _destroyed))
        throw invalidState("Utf8Stream is destroyed");
      if (__privateGet(this, _opening)) {
        this.once("ready", () => this.reopen(file));
        return;
      }
      if (__privateGet(this, _ending))
        return;
      if (!__privateGet(this, _file))
        throw error("ERR_OPERATION_FAILED", "Unable to reopen a file descriptor, you must pass a file to Utf8Stream");
      if (file)
        __privateSet(this, _file, file.toString());
      __privateSet(this, _reopening, true);
      if (__privateGet(this, _writing))
        return;
      const fd = __privateGet(this, _fd);
      this.once("ready", () => {
        if (fd === __privateGet(this, _fd))
          return;
        __privateGet(this, _fs).close(fd, (err2) => {
          if (err2)
            this.emit("error", err2);
        });
      });
      __privateMethod(this, _Utf8Stream_instances, openFile_fn).call(this, __privateGet(this, _file));
    }
    /**
     * Close the stream gracefully, flushing the internal buffer before closing.
     */
    end() {
      if (__privateGet(this, _destroyed))
        throw invalidState("Utf8Stream is destroyed");
      if (__privateGet(this, _opening)) {
        this.once("ready", () => this.end());
        return;
      }
      if (__privateGet(this, _ending))
        return;
      __privateSet(this, _ending, true);
      if (__privateGet(this, _writing))
        return;
      if (__privateGet(this, _len) > 0 && __privateGet(this, _fd) >= 0)
        __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
      else
        __privateMethod(this, _Utf8Stream_instances, actualClose_fn).call(this);
    }
    /**
     * Close the stream immediately, without flushing the internal buffer.
     */
    destroy() {
      if (__privateGet(this, _destroyed))
        return;
      __privateMethod(this, _Utf8Stream_instances, actualClose_fn).call(this);
    }
    /** The mode of the file that is being written to */
    get mode() {
      return __privateGet(this, _mode);
    }
    /** The file that is being written to */
    get file() {
      return __privateGet(this, _file);
    }
    /** The file descriptor that is being written to */
    get fd() {
      return __privateGet(this, _fd);
    }
    /** The minimum length of the internal buffer that is required to be full before flushing */
    get minLength() {
      return __privateGet(this, _minLength);
    }
    /**
     * The maximum length of the internal buffer.
     * If a write would cause the buffer to exceed this, the data is dropped and a `drop` event is emitted with it.
     */
    get maxLength() {
      return __privateGet(this, _maxLength);
    }
    /** Whether the stream is currently writing data to the file */
    get writing() {
      return __privateGet(this, _writing);
    }
    /** Whether the stream is writing synchronously or asynchronously */
    get sync() {
      return __privateGet(this, _sync);
    }
    /** Whether the stream performs a `fsyncSync` after every write */
    get fsync() {
      return __privateGet(this, _fsync);
    }
    /** Whether the stream is appending to the file or truncating it */
    get append() {
      return __privateGet(this, _append);
    }
    /** The number of milliseconds between flushes. `0` means no periodic flushes are performed. */
    get periodicFlush() {
      return __privateGet(this, _periodicFlush);
    }
    /** The type of data that can be written to the stream */
    get contentMode() {
      return __privateGet(this, _contentMode);
    }
    /** Whether the directory for `file` is created if it does not exist */
    get mkdir() {
      return __privateGet(this, _mkdir);
    }
    [(_a11 = kUtf8StreamFS, Symbol.dispose)]() {
      this.destroy();
    }
    // Node relies on the `newListener` event to know when a `drain` listener is added.
    // `eventemitter3` does not have it, so the listener methods are patched instead.
    on(event, fn, context) {
      if (event === "drain")
        __privateSet(this, _asyncDrainScheduled, false);
      return super.on(event, fn, context);
    }
    addListener(event, fn, context) {
      return this.on(event, fn, context);
    }
    once(event, fn, context) {
      if (event === "drain")
        __privateSet(this, _asyncDrainScheduled, false);
      return super.once(event, fn, context);
    }
    off(event, fn, context, once2) {
      return super.off(event, fn, context, once2);
    }
    removeListener(event, fn, context, once2) {
      return super.removeListener(event, fn, context, once2);
    }
    setMaxListeners() {
      throw UV("ENOSYS", "Utf8Stream.setMaxListeners");
    }
    getMaxListeners() {
      throw UV("ENOSYS", "Utf8Stream.getMaxListeners");
    }
    prependListener() {
      throw UV("ENOSYS", "Utf8Stream.prependListener");
    }
    prependOnceListener() {
      throw UV("ENOSYS", "Utf8Stream.prependOnceListener");
    }
    rawListeners() {
      throw UV("ENOSYS", "Utf8Stream.rawListeners");
    }
  };
  _len = new WeakMap();
  _fd = new WeakMap();
  _bufs = new WeakMap();
  _lens = new WeakMap();
  _writing = new WeakMap();
  _ending = new WeakMap();
  _reopening = new WeakMap();
  _asyncDrainScheduled = new WeakMap();
  _flushPending = new WeakMap();
  _hwm = new WeakMap();
  _file = new WeakMap();
  _destroyed = new WeakMap();
  _minLength = new WeakMap();
  _maxLength = new WeakMap();
  _maxWrite = new WeakMap();
  _opening = new WeakMap();
  _periodicFlush = new WeakMap();
  _periodicFlushTimer = new WeakMap();
  _sync = new WeakMap();
  _fsync = new WeakMap();
  _append = new WeakMap();
  _mode = new WeakMap();
  _retryEAGAIN = new WeakMap();
  _mkdir = new WeakMap();
  _contentMode = new WeakMap();
  _writingBuf = new WeakMap();
  _fs = new WeakMap();
  _Utf8Stream_instances = new WeakSet();
  flushSyncBuffer_fn = function() {
    const bufs = __privateGet(this, _bufs);
    if (!__privateGet(this, _writing) && __privateGet(this, _writingBuf).length > 0) {
      bufs.unshift([__privateGet(this, _writingBuf)]);
      __privateSet(this, _writingBuf, emptyBuffer2);
    }
    let buf = emptyBuffer2;
    while (bufs.length || buf.length) {
      if (buf.length <= 0)
        buf = _mergeBuffers(bufs[0], __privateGet(this, _lens)[0]);
      const n = __privateGet(this, _fs).writeSync(__privateGet(this, _fd), buf);
      buf = buf.subarray(n);
      __privateSet(this, _len, Math.max(__privateGet(this, _len) - n, 0));
      if (buf.length <= 0) {
        bufs.shift();
        __privateGet(this, _lens).shift();
      }
    }
  };
  flushSyncUtf8_fn = function() {
    const bufs = __privateGet(this, _bufs);
    if (!__privateGet(this, _writing) && __privateGet(this, _writingBuf).length > 0) {
      bufs.unshift(__privateGet(this, _writingBuf));
      __privateSet(this, _writingBuf, "");
    }
    let buf = "";
    while (bufs.length || buf) {
      if (buf.length <= 0)
        buf = bufs[0];
      const n = __privateGet(this, _fs).writeSync(__privateGet(this, _fd), buf, "utf8");
      const released = _release(buf, __privateGet(this, _len), n);
      buf = released.writingBuf;
      __privateSet(this, _len, released.len);
      if (buf.length <= 0)
        bufs.shift();
    }
    try {
      __privateGet(this, _fs).fsyncSync(__privateGet(this, _fd));
    } catch {
    }
  };
  emitDrain_fn = function() {
    if (!this.listenerCount("drain"))
      return;
    __privateSet(this, _asyncDrainScheduled, false);
    this.emit("drain");
  };
  released_fn = function(err2, n = 0) {
    if (err2) {
      if (!__privateGet(this, _sync) && (err2.code === "EAGAIN" || err2.code === "EBUSY") && __privateGet(this, _retryEAGAIN).call(this, err2, __privateGet(this, _writingBuf).length, __privateGet(this, _len) - __privateGet(this, _writingBuf).length)) {
        setTimeout(() => __privateMethod(this, _Utf8Stream_instances, writeToFS_fn).call(this), busyWriteTimeout);
      } else {
        __privateSet(this, _writing, false);
        this.emit("error", err2);
      }
      return;
    }
    this.emit("write", n);
    const released = _release(__privateGet(this, _writingBuf), __privateGet(this, _len), n);
    __privateSet(this, _len, released.len);
    __privateSet(this, _writingBuf, released.writingBuf);
    if (__privateGet(this, _writingBuf).length) {
      if (!__privateGet(this, _sync)) {
        __privateMethod(this, _Utf8Stream_instances, writeToFS_fn).call(this);
        return;
      }
      try {
        do {
          const written = __privateMethod(this, _Utf8Stream_instances, writeToFSSync_fn).call(this);
          const released2 = _release(__privateGet(this, _writingBuf), __privateGet(this, _len), written);
          __privateSet(this, _len, released2.len);
          __privateSet(this, _writingBuf, released2.writingBuf);
        } while (__privateGet(this, _writingBuf).length);
      } catch (e) {
        __privateMethod(this, _Utf8Stream_instances, released_fn).call(this, e);
        return;
      }
    }
    if (__privateGet(this, _fsync))
      __privateGet(this, _fs).fsyncSync(__privateGet(this, _fd));
    const len = __privateGet(this, _len);
    if (__privateGet(this, _reopening)) {
      __privateSet(this, _writing, false);
      __privateSet(this, _reopening, false);
      this.reopen();
    } else if (len > __privateGet(this, _minLength)) {
      __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
    } else if (__privateGet(this, _ending)) {
      if (len > 0) {
        __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
      } else {
        __privateSet(this, _writing, false);
        __privateMethod(this, _Utf8Stream_instances, actualClose_fn).call(this);
      }
    } else {
      __privateSet(this, _writing, false);
      if (!__privateGet(this, _sync)) {
        this.emit("drain");
      } else if (!__privateGet(this, _asyncDrainScheduled)) {
        __privateSet(this, _asyncDrainScheduled, true);
        queueMicrotask(() => __privateMethod(this, _Utf8Stream_instances, emitDrain_fn).call(this));
      }
    }
  };
  writeToFS_fn = function() {
    if (__privateGet(this, _contentMode) == "buffer")
      __privateGet(this, _fs).write(__privateGet(this, _fd), __privateGet(this, _writingBuf), (err2, n) => __privateMethod(this, _Utf8Stream_instances, released_fn).call(this, err2, n));
    else
      __privateGet(this, _fs).write(__privateGet(this, _fd), __privateGet(this, _writingBuf), "utf8", (err2, n) => __privateMethod(this, _Utf8Stream_instances, released_fn).call(this, err2, n));
  };
  writeToFSSync_fn = function() {
    return __privateGet(this, _contentMode) == "buffer" ? __privateGet(this, _fs).writeSync(__privateGet(this, _fd), __privateGet(this, _writingBuf)) : __privateGet(this, _fs).writeSync(__privateGet(this, _fd), __privateGet(this, _writingBuf), "utf8");
  };
  openFile_fn = function(file) {
    __privateSet(this, _opening, true);
    __privateSet(this, _writing, true);
    __privateSet(this, _asyncDrainScheduled, false);
    const fileOpened = (err2, fd = -1) => {
      if (err2) {
        __privateSet(this, _reopening, false);
        __privateSet(this, _writing, false);
        __privateSet(this, _opening, false);
        if (!__privateGet(this, _sync))
          this.emit("error", err2);
        else
          queueMicrotask(() => void (this.listenerCount("error") && this.emit("error", err2)));
        return;
      }
      const reopening = __privateGet(this, _reopening);
      __privateSet(this, _fd, fd);
      __privateSet(this, _file, file);
      __privateSet(this, _reopening, false);
      __privateSet(this, _opening, false);
      __privateSet(this, _writing, false);
      if (!__privateGet(this, _sync))
        this.emit("ready");
      else
        queueMicrotask(() => this.emit("ready"));
      if (__privateGet(this, _destroyed))
        return;
      if (!__privateGet(this, _writing) && __privateGet(this, _len) > __privateGet(this, _minLength) || __privateGet(this, _flushPending))
        __privateMethod(this, _Utf8Stream_instances, actualWrite_fn).call(this);
      else if (reopening)
        queueMicrotask(() => this.emit("drain"));
    };
    const flags = __privateGet(this, _append) ? "a" : "w";
    const mode = __privateGet(this, _mode) ?? 438;
    if (__privateGet(this, _sync)) {
      try {
        if (__privateGet(this, _mkdir))
          __privateGet(this, _fs).mkdirSync(dirname(file), { recursive: true });
        fileOpened(null, __privateGet(this, _fs).openSync(file, flags, mode));
      } catch (e) {
        fileOpened(e);
        throw e;
      }
    } else if (__privateGet(this, _mkdir)) {
      __privateGet(this, _fs).mkdir(dirname(file), { recursive: true }, (err2) => {
        if (err2)
          return fileOpened(err2);
        __privateGet(this, _fs).open(file, flags, mode, fileOpened);
      });
    } else {
      __privateGet(this, _fs).open(file, flags, mode, fileOpened);
    }
  };
  actualClose_fn = function() {
    if (__privateGet(this, _fd) === -1) {
      this.once("ready", () => __privateMethod(this, _Utf8Stream_instances, actualClose_fn).call(this));
      return;
    }
    if (__privateGet(this, _periodicFlushTimer) !== void 0)
      clearInterval(__privateGet(this, _periodicFlushTimer));
    __privateSet(this, _destroyed, true);
    __privateSet(this, _bufs, []);
    __privateSet(this, _lens, []);
    const done = (err2) => {
      if (err2) {
        this.emit("error", err2);
        return;
      }
      if (__privateGet(this, _ending) && !__privateGet(this, _writing))
        this.emit("finish");
      this.emit("close");
    };
    const closeWrapped = () => {
      if (__privateGet(this, _fd) !== 1 && __privateGet(this, _fd) !== 2)
        __privateGet(this, _fs).close(__privateGet(this, _fd), done);
      else
        done(null);
    };
    try {
      __privateGet(this, _fs).fsync(__privateGet(this, _fd), closeWrapped);
    } catch {
    }
  };
  actualWrite_fn = function() {
    __privateSet(this, _writing, true);
    if (__privateGet(this, _contentMode) == "buffer") {
      __privateSet(this, _writingBuf, __privateGet(this, _writingBuf).length ? __privateGet(this, _writingBuf) : _mergeBuffers(__privateGet(this, _bufs).shift() ?? [], __privateGet(this, _lens).shift() ?? 0));
    } else {
      __privateGet(this, _writingBuf) || __privateSet(this, _writingBuf, __privateGet(this, _bufs).shift() || "");
    }
    if (!__privateGet(this, _sync)) {
      __privateMethod(this, _Utf8Stream_instances, writeToFS_fn).call(this);
      return;
    }
    try {
      __privateMethod(this, _Utf8Stream_instances, released_fn).call(this, null, __privateMethod(this, _Utf8Stream_instances, writeToFSSync_fn).call(this));
    } catch (e) {
      __privateMethod(this, _Utf8Stream_instances, released_fn).call(this, e);
    }
  };
  callFlushCallbackOnDrain_fn = function(cb) {
    __privateSet(this, _flushPending, true);
    const onDrain = () => {
      if (__privateGet(this, _fsync) || __privateGet(this, _destroyed)) {
        __privateSet(this, _flushPending, false);
        cb(null);
      } else {
        try {
          __privateGet(this, _fs).fsync(__privateGet(this, _fd), (err2) => {
            __privateSet(this, _flushPending, false);
            cb(err2?.code == "EBADF" ? null : err2);
          });
        } catch (e) {
          __privateSet(this, _flushPending, false);
          cb(e);
        }
      }
      this.off("error", onError);
    };
    const onError = (err2) => {
      __privateSet(this, _flushPending, false);
      cb(err2);
      this.off("drain", onDrain);
    };
    this.once("drain", onDrain);
    this.once("error", onError);
  };
  __publicField(_Utf8Stream, _a11, _utf8StreamFS);
  var Utf8Stream = _Utf8Stream;

  // node_modules/@zenfs/core/dist/vfs/xattr.js
  var xattr_exports = {};
  __export(xattr_exports, {
    allowedRestrictedNames: () => allowedRestrictedNames,
    get: () => get2,
    getSync: () => getSync,
    list: () => list2,
    listSync: () => listSync,
    remove: () => remove,
    removeSync: () => removeSync,
    set: () => set2,
    setSync: () => setSync
  });
  var import_buffer15 = __toESM(require_buffer(), 1);
  var allowedRestrictedNames = /* @__PURE__ */ new Set();
  function checkName($, name, path, syscall) {
    if (!name.startsWith("user.") && !allowedRestrictedNames.has(name))
      throw UV("ENOTSUP", syscall, path);
  }
  async function get2(path, name, opt = {}) {
    path = normalizePath.call(this, path);
    const { cache, path: resolved } = await resolve3(this, path, opt.noFollow);
    checkName(this, name, path, "xattr.get");
    const inode = await cache.stat(resolved).catch(rethrow("xattr.get", path));
    if (checkAccess && !hasAccess(this, inode, R_OK))
      throw UV("EACCES", "xattr.get", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const value = inode.attributes.get(name);
    if (!value)
      throw UV("ENODATA", "xattr.get", path);
    const buffer = import_buffer15.Buffer.from(value);
    return opt.encoding == "buffer" || !opt.encoding ? buffer : buffer.toString(opt.encoding);
  }
  function getSync(path, name, opt = {}) {
    path = normalizePath.call(this, path);
    checkName(this, name, path, "xattr.get");
    const { cache, path: resolved } = resolve2(this, path, opt.noFollow);
    let inode;
    try {
      inode = cache.statSync(resolved);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
    if (checkAccess && !hasAccess(this, inode, R_OK))
      throw UV("EACCES", "xattr.get", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const value = inode.attributes.get(name);
    if (!value)
      throw UV("ENODATA", "xattr.get", path);
    const buffer = import_buffer15.Buffer.from(value);
    return opt.encoding == "buffer" || !opt.encoding ? buffer : buffer.toString(opt.encoding);
  }
  async function set2(path, name, value, opt = {}) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = await resolve3(this, path, opt.noFollow);
    checkName(this, name, path, "xattr.set");
    const inode = await cache.stat(resolved).catch(rethrow("xattr.set", path));
    if (checkAccess && !hasAccess(this, inode, W_OK))
      throw UV("EACCES", "xattr.set", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const attr = inode.attributes.get(name);
    if (opt.create && attr)
      throw UV("EEXIST", "xattr.set", path);
    if (opt.replace && !attr)
      throw UV("ENODATA", "xattr.set", path);
    inode.attributes.set(name, import_buffer15.Buffer.from(value));
    await fs.touch(resolved, inode).catch(rethrow("xattr.set", path));
  }
  function setSync(path, name, value, opt = {}) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = resolve2(this, path, opt.noFollow);
    checkName(this, name, path, "xattr.set");
    let inode;
    try {
      inode = cache.statSync(resolved);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
    if (checkAccess && !hasAccess(this, inode, W_OK))
      throw UV("EACCES", "xattr.set", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const attr = inode.attributes.get(name);
    if (opt.create && attr)
      throw UV("EEXIST", "xattr.set", path);
    if (opt.replace && !attr)
      throw UV("ENODATA", "xattr.set", path);
    inode.attributes.set(name, import_buffer15.Buffer.from(value));
    try {
      fs.touchSync(resolved, inode);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
  }
  async function remove(path, name) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = await resolve3(this, path);
    checkName(this, name, path, "xattr.remove");
    const inode = await cache.stat(resolved).catch(rethrow("xattr.remove", path));
    if (checkAccess && !hasAccess(this, inode, W_OK))
      throw UV("EACCES", "xattr.remove", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const attr = inode.attributes.get(name);
    if (!attr)
      throw UV("ENODATA", "xattr.remove", path);
    inode.attributes.remove(name);
    await fs.touch(resolved, inode);
  }
  function removeSync(path, name) {
    path = normalizePath.call(this, path);
    const { fs, cache, path: resolved } = resolve2(this, path);
    checkName(this, name, path, "xattr.remove");
    let inode;
    try {
      inode = cache.statSync(resolved);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
    if (checkAccess && !hasAccess(this, inode, W_OK))
      throw UV("EACCES", "xattr.remove", path);
    inode.attributes ?? (inode.attributes = new Attributes());
    const attr = inode.attributes.get(name);
    if (!attr)
      throw UV("ENODATA", "xattr.remove", path);
    inode.attributes.remove(name);
    try {
      fs.touchSync(resolved, inode);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
  }
  async function list2(path) {
    path = normalizePath.call(this, path);
    const { cache, path: resolved } = await resolve3(this, path);
    const inode = await cache.stat(resolved).catch(rethrow("xattr.list", path));
    if (!inode.attributes)
      return [];
    return [...inode.attributes.keys()];
  }
  function listSync(path) {
    path = normalizePath.call(this, path);
    const { cache, path: resolved } = resolve2(this, path);
    let inode;
    try {
      inode = cache.statSync(resolved);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { path }));
    }
    if (!inode.attributes)
      return [];
    return [...inode.attributes.keys()];
  }

  // node_modules/@zenfs/core/dist/node/compat.js
  var compat_exports = {};
  __export(compat_exports, {
    BigIntStatsFs: () => BigIntStatsFs,
    Dir: () => Dir,
    Dirent: () => Dirent2,
    OperationsHandle: () => OperationsHandle,
    ReadStream: () => ReadStream,
    Stats: () => Stats,
    StatsFs: () => StatsFs,
    Utf8Stream: () => Utf8Stream,
    WriteStream: () => WriteStream,
    _version: () => _version,
    access: () => access2,
    accessSync: () => accessSync,
    appendFile: () => appendFile2,
    appendFileSync: () => appendFileSync,
    chmod: () => chmod4,
    chmodSync: () => chmodSync,
    chown: () => chown4,
    chownSync: () => chownSync,
    chroot: () => chroot,
    close: () => close,
    closeSync: () => closeSync,
    constants: () => constants_exports,
    copyFile: () => copyFile2,
    copyFileSync: () => copyFileSync,
    cp: () => cp2,
    cpSync: () => cpSync,
    createReadStream: () => createReadStream,
    createWriteStream: () => createWriteStream,
    exists: () => exists2,
    existsSync: () => existsSync,
    fchmod: () => fchmod,
    fchmodSync: () => fchmodSync,
    fchown: () => fchown,
    fchownSync: () => fchownSync,
    fdatasync: () => fdatasync,
    fdatasyncSync: () => fdatasyncSync,
    fstat: () => fstat,
    fstatSync: () => fstatSync,
    fsync: () => fsync,
    fsyncSync: () => fsyncSync,
    ftruncate: () => ftruncate,
    ftruncateSync: () => ftruncateSync,
    futimes: () => futimes,
    futimesSync: () => futimesSync,
    glob: () => glob2,
    globSync: () => globSync,
    ioctl: () => ioctl,
    ioctlSync: () => ioctlSync,
    lchmod: () => lchmod2,
    lchmodSync: () => lchmodSync,
    lchown: () => lchown2,
    lchownSync: () => lchownSync,
    link: () => link4,
    linkSync: () => linkSync,
    lopenSync: () => lopenSync,
    lstat: () => lstat2,
    lstatSync: () => lstatSync,
    lutimes: () => lutimes2,
    lutimesSync: () => lutimesSync,
    mkdir: () => mkdir4,
    mkdirSync: () => mkdirSync,
    mkdtemp: () => mkdtemp2,
    mkdtempDisposableSync: () => mkdtempDisposableSync,
    mkdtempSync: () => mkdtempSync,
    mkstemp: () => mkstemp2,
    mkstempSync: () => mkstempSync,
    mount: () => mount,
    open: () => open4,
    openAsBlob: () => openAsBlob,
    openAsBlobSync: () => openAsBlobSync,
    openSync: () => openSync,
    opendir: () => opendir2,
    opendirSync: () => opendirSync,
    promises: () => promises_exports,
    read: () => read,
    readFile: () => readFile2,
    readFileSync: () => readFileSync,
    readSync: () => readSync,
    readdir: () => readdir4,
    readdirSync: () => readdirSync,
    readlink: () => readlink4,
    readlinkSync: () => readlinkSync,
    readv: () => readv,
    readvSync: () => readvSync,
    realpath: () => realpath2,
    realpathSync: () => realpathSync,
    rename: () => rename4,
    renameSync: () => renameSync,
    rm: () => rm2,
    rmSync: () => rmSync,
    rmdir: () => rmdir2,
    rmdirSync: () => rmdirSync,
    stat: () => stat4,
    statSync: () => statSync,
    statfs: () => statfs2,
    statfsSync: () => statfsSync,
    symlink: () => symlink2,
    symlinkSync: () => symlinkSync,
    truncate: () => truncate2,
    truncateSync: () => truncateSync,
    umount: () => umount,
    unlink: () => unlink2,
    unlinkSync: () => unlinkSync,
    unwatchFile: () => unwatchFile,
    utimes: () => utimes4,
    utimesSync: () => utimesSync,
    validateOperations: () => validateOperations,
    watch: () => watch2,
    watchFile: () => watchFile,
    write: () => write,
    writeFile: () => writeFile2,
    writeFileSync: () => writeFileSync,
    writeSync: () => writeSync,
    writev: () => writev,
    writevSync: () => writevSync,
    xattr: () => xattr_exports
  });

  // node_modules/@zenfs/core/dist/vfs/ioctl.js
  async function ioctl(path, command, ...args) {
    let vcache, vnode, file;
    if (typeof path == "number") {
      file = fromFD(this, path);
      vcache = cacheOf(file.fs);
      vnode = file.vnode;
      vnode.refs++;
    } else {
      path = normalizePath.call(this, path);
      const mnt = await resolve3(this, path, false, { syscall: "ioctl", path });
      if (!mnt.stats)
        throw UV("ENOENT", { syscall: "ioctl", path });
      vcache = mnt.cache;
      vnode = vcache.ref(mnt.path, vcache.get(mnt.path)?.inode ?? mnt.stats);
    }
    const context = {
      fs: vnode.fs,
      inode: vnode.inode,
      path: vnode.path,
      file
    };
    try {
      return await vnode.fs.ioctl(context, command, ...args);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { syscall: "ioctl", path }));
    } finally {
      vcache.unref(vnode);
    }
  }
  function ioctlSync(path, command, ...args) {
    let vcache, vnode, file;
    if (typeof path == "number") {
      file = fromFD(this, path);
      vcache = cacheOf(file.fs);
      vnode = file.vnode;
      vnode.refs++;
    } else {
      path = normalizePath.call(this, path);
      const mnt = resolve2(this, path, false, { syscall: "ioctl", path });
      if (!mnt.stats)
        throw UV("ENOENT", { syscall: "ioctl", path });
      vcache = mnt.cache;
      vnode = vcache.ref(mnt.path, vcache.get(mnt.path)?.inode ?? mnt.stats);
    }
    const context = {
      fs: vnode.fs,
      inode: vnode.inode,
      path: vnode.path,
      file
    };
    try {
      return vnode.fs.ioctlSync(context, command, ...args);
    } catch (e) {
      throw setUVMessage(Object.assign(e, { syscall: "ioctl", path }));
    } finally {
      vcache.unref(vnode);
    }
  }

  // node_modules/@zenfs/core/package.json
  var package_default = {
    name: "@zenfs/core",
    version: "2.9.0",
    description: "A filesystem, anywhere",
    funding: {
      type: "individual",
      url: "https://github.com/sponsors/james-pre"
    },
    main: "dist/index.js",
    types: "dist/index.d.ts",
    keywords: [
      "filesystem",
      "node",
      "storage",
      "fs",
      "browser"
    ],
    bin: {
      "make-index": "scripts/make-index.js",
      "zenfs-test": "scripts/test.js",
      zci: "scripts/ci-cli.js"
    },
    files: [
      "dist",
      "tests",
      "scripts/deprecated.js",
      "license.md",
      "eslint.shared.js"
    ],
    type: "module",
    homepage: "https://zenfs.dev/core",
    author: "James Prevett <jp@jamespre.dev> (https://jamespre.dev)",
    contributors: [
      "John Vilk <jvilk@cs.umass.edu>"
    ],
    license: "LGPL-3.0-or-later",
    repository: {
      type: "git",
      url: "git+https://github.com/zen-fs/core.git"
    },
    bugs: {
      url: "https://github.com/zen-fs/core/issues"
    },
    engines: {
      node: ">= 18"
    },
    exports: {
      ".": "./dist/index.js",
      "./*.js": "./dist/*.js",
      "./*": "./dist/*.js",
      "./emulation/*": "./dist/node/*",
      "./promises": "./dist/node/promises.js",
      "./readline": "./dist/node/readline.js",
      "./eslint": "./eslint.shared.js",
      "./tests/*.ts": "./tests/*.ts",
      "./tests/*.js": "./tests/*.js",
      "./tests/*": "./tests/*.js",
      "./types/*": "./types/*"
    },
    publishConfig: {
      access: "public",
      provenance: true
    },
    scripts: {
      format: "prettier --write .",
      "format:check": "prettier --check .",
      "spdx:check": "npx lice -a src tests/*.ts tests/**/*.test.ts",
      "spdx:fix": "npx lice -aw src tests/*.ts tests/**/*.test.ts",
      lint: "eslint src tests",
      test: "npx -s zenfs-test -abc --report",
      "test:native": "npx -s zenfs-test tests/native-setup.ts --verbose",
      "test:perf": "zbench",
      build: "tsc --build",
      dev: "tsc --build --watch",
      prepublishOnly: "npm run build"
    },
    dependencies: {
      "@types/node": "^26.6.0",
      "@zenfs/streams": "^1.0.2",
      buffer: "^6.0.3",
      eventemitter3: "^5.0.1",
      kerium: "^1.5.0",
      memium: "^1.1.0",
      utilium: "^3.7.0"
    },
    devDependencies: {
      "@zenfs/devel": "^1.1.0",
      eslint: "^10.1.0",
      prettier: "^3.2.5",
      typedoc: "^0.28.18",
      typescript: "^6.0.0",
      "zbench-js": "^0.2.0"
    },
    overrides: {
      "@zenfs/devel": {
        "@zenfs/core": "file:../../.."
      }
    },
    prettier: {
      singleQuote: true,
      useTabs: true,
      tabWidth: 4,
      printWidth: 150,
      arrowParens: "avoid",
      experimentalOperatorPosition: "start"
    }
  };

  // node_modules/@zenfs/core/dist/node/compat.js
  var _version = package_default.version;

  // node_modules/@zenfs/core/dist/index.js
  globalThis.__zenfs__ = Object.create(compat_exports);

  // node_modules/@richard432/localstorage-logger/dist/index.mjs
  var PREFIX = "debug:";
  function hasLocalStorage() {
    try {
      return typeof localStorage !== "undefined" && localStorage !== null;
    } catch {
      return false;
    }
  }
  function getProcessEnv() {
    try {
      if (typeof process !== "undefined" && process.env !== void 0) {
        return process.env;
      }
    } catch {
    }
    return null;
  }
  function moduleToEnvKey(module) {
    return "DEBUG_" + module.replace(/[:-]/g, "_").toUpperCase();
  }
  function isEnabled2(module) {
    const key = `${PREFIX}${module}`;
    if (hasLocalStorage()) {
      const val = localStorage.getItem(key);
      if (val === null) {
        localStorage.setItem(key, "1");
        return true;
      }
      return val === "1";
    }
    const env = getProcessEnv();
    if (env) {
      const envKey = moduleToEnvKey(module);
      const val = env[envKey];
      if (val === void 0) return true;
      return val === "1";
    }
    return true;
  }
  function createLogger(module) {
    return {
      log(...args) {
        if (isEnabled2(module)) {
          console.log(`[${module}]`, ...args);
        }
      },
      warn(...args) {
        if (isEnabled2(module)) {
          console.warn(`[${module}]`, ...args);
        }
      },
      error(...args) {
        if (isEnabled2(module)) {
          console.error(`[${module}]`, ...args);
        }
      }
    };
  }

  // node_modules/zen-fs-cache/dist/index.js
  var IdbKVStore = class {
    /**
     * @param dbName    IndexedDB database name. Use a unique name per
     *                  backend/connection to avoid collisions.
     * @param storeName Object store name within the database.
     */
    constructor(dbName = "zen-fs-kv", storeName = "kv") {
      this.dbName = dbName;
      this.storeName = storeName;
      this.failed = false;
    }
    open() {
      if (this.failed) return Promise.reject(new Error("IndexedDB unavailable"));
      if (this.dbPromise) return this.dbPromise;
      if (!idbAvailable2()) {
        this.failed = true;
        return Promise.reject(new Error("IndexedDB unavailable"));
      }
      this.dbPromise = new Promise((resolve4, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = () => resolve4(req.result);
        req.onerror = () => reject(req.error);
      });
      return this.dbPromise;
    }
    /**
     * Retrieve a value by key, or `undefined` if not found.
     */
    async get(key) {
      try {
        const db = await this.open();
        return await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readonly");
          const req = tx.objectStore(this.storeName).get(key);
          req.onsuccess = () => resolve4(req.result ?? void 0);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return void 0;
      }
    }
    /**
     * Store a value under the given key. Overwrites existing entries.
     */
    async set(key, value) {
      try {
        const db = await this.open();
        await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.objectStore(this.storeName).put(value, key);
          tx.oncomplete = () => resolve4();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
      }
    }
    /**
     * Delete a single key. No-op if the key does not exist.
     */
    async delete(key) {
      try {
        const db = await this.open();
        await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.objectStore(this.storeName).delete(key);
          tx.oncomplete = () => resolve4();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
      }
    }
    /**
     * Remove all entries from this object store.
     */
    async clear() {
      try {
        const db = await this.open();
        await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.objectStore(this.storeName).clear();
          tx.oncomplete = () => resolve4();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
      }
    }
    /**
     * Return all keys in this store. Useful for bulk operations.
     */
    async keys() {
      try {
        const db = await this.open();
        return await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readonly");
          const req = tx.objectStore(this.storeName).getAllKeys();
          req.onsuccess = () => resolve4(req.result ?? []);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return [];
      }
    }
    /**
     * Return all key-value pairs as an array of `[key, value]` tuples.
     * Useful for bulk-loading an entire cache into memory on startup.
     */
    async entries() {
      try {
        const db = await this.open();
        return await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readonly");
          const store = tx.objectStore(this.storeName);
          const result = [];
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              result.push([cursor.key, cursor.value]);
              cursor.continue();
            } else {
              resolve4(result);
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        });
      } catch {
        return [];
      }
    }
    /**
     * Bulk-set multiple key-value pairs in a single transaction.
     * More efficient than calling `set()` in a loop.
     */
    async setMany(entries2) {
      if (entries2.length === 0) return;
      try {
        const db = await this.open();
        await new Promise((resolve4, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          const store = tx.objectStore(this.storeName);
          for (const [key, value] of entries2) {
            store.put(value, key);
          }
          tx.oncomplete = () => resolve4();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
      }
    }
  };
  function idbAvailable2() {
    try {
      return typeof indexedDB !== "undefined" && indexedDB !== null;
    } catch {
      return false;
    }
  }

  // node_modules/zen-fs-remotestoragejs/dist/index.js
  var RemoteStorageError = class extends Error {
    constructor(message, code, status) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "RemoteStorageError";
    }
  };
  var FileNotFoundError = class extends RemoteStorageError {
    constructor(path) {
      super(`File not found: ${path}`, "ENOENT", 404);
      this.name = "FileNotFoundError";
    }
  };
  var DirectoryNotFoundError = class extends RemoteStorageError {
    constructor(path) {
      super(`Directory not found: ${path}`, "ENOENT", 404);
      this.name = "DirectoryNotFoundError";
    }
  };
  var FileExistsError = class extends RemoteStorageError {
    constructor(path) {
      super(`File already exists: ${path}`, "EEXIST", 409);
      this.name = "FileExistsError";
    }
  };
  var AuthenticationError = class extends RemoteStorageError {
    constructor(message = "Authentication failed") {
      super(message, "EAUTH", 401);
      this.name = "AuthenticationError";
    }
  };
  var PermissionDeniedError = class extends RemoteStorageError {
    constructor(path) {
      super(`Permission denied: ${path}`, "EACCES", 403);
      this.name = "PermissionDeniedError";
    }
  };
  function normalizePath2(path) {
    if (!path || path === "/") {
      return "";
    }
    if (path.startsWith("/")) {
      path = path.slice(1);
    }
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  }
  function getParentPath(path) {
    const normalized = normalizePath2(path);
    if (!normalized) {
      return "";
    }
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash === -1) {
      return "";
    }
    return normalized.slice(0, lastSlash);
  }
  function getBasename(path) {
    const normalized = normalizePath2(path);
    if (!normalized) {
      return "";
    }
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash === -1) {
      return normalized;
    }
    return normalized.slice(lastSlash + 1);
  }
  function ensureDirectoryPath(path) {
    if (!path) {
      return "/";
    }
    return path.endsWith("/") ? path : path + "/";
  }
  function isValidPath(path) {
    if (typeof path !== "string") {
      return false;
    }
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(path)) {
      return false;
    }
    return true;
  }
  function joinPath(...segments) {
    const joined = segments.filter((segment) => segment && segment.length > 0).map((segment) => segment.replace(/^\/+|\/+$/g, "")).join("/");
    return joined || "";
  }
  function mtimePathFor(filePath) {
    if (filePath.endsWith(".mtime")) {
      console.warn(
        `[zen-fs-remotestoragejs] mtimePathFor received a path that already ends with ".mtime" (${filePath}); returning it unchanged to avoid a nested sidecar. Pass the data file path instead.`
      );
      return filePath;
    }
    const lastSlash = filePath.lastIndexOf("/");
    const dir = lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
    const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    const mtimeFileName = `${fileName}.mtime`;
    return dir ? `${dir}/${mtimeFileName}` : mtimeFileName;
  }
  function isMtimeSidecar(name) {
    return name.endsWith(".mtime") && name.length > 6;
  }
  function sidecarToDataPath(sidecarPath) {
    const lastSlash = sidecarPath.lastIndexOf("/");
    const dir = lastSlash >= 0 ? sidecarPath.slice(0, lastSlash) : "";
    const fileName = lastSlash >= 0 ? sidecarPath.slice(lastSlash + 1) : sidecarPath;
    if (!fileName.endsWith(".mtime")) return null;
    const dataFilename = fileName.slice(0, -6);
    if (dataFilename === "") return null;
    return dir ? `${dir}/${dataFilename}` : dataFilename;
  }
  var DOT_META_SUFFIXES = [".mtime", ".version"];
  function isDotMetaSidecar(name) {
    if (!name.startsWith(".")) return false;
    return DOT_META_SUFFIXES.some((s) => name.includes(s));
  }
  function isDoubleDotFile(name) {
    return name.startsWith("..");
  }
  function isMetadataSidecarToDelete(name) {
    return isDotMetaSidecar(name) || isDoubleDotFile(name);
  }
  var loggers = {
    /** HTTP-level request/response logging (buildUrl, makeRequest) */
    http: createLogger("rs:http"),
    /** File existence checks + existence cache */
    exists: createLogger("rs:exists"),
    /** File read operations (readFile, readFileMeta, read) */
    read: createLogger("rs:read"),
    /** File write operations (writeFile, writeFileWithMtime, write, createFile) */
    write: createLogger("rs:write"),
    /** stat() / metadata probing (HEAD requests, dir probes) */
    stat: createLogger("rs:stat"),
    /** Directory listing + cache + patch (ensureDirListing, patchDirListingEntry, readdir, mkdir, rmdir) */
    dir: createLogger("rs:dir"),
    /** File/directory deletion (unlink, rmdir) */
    delete: createLogger("rs:delete"),
    /** Cache persistence (load/save dirListingCache to IndexedDB) */
    cache: createLogger("rs:cache"),
    /** Sync status (shouldSync, buildSnapshot, sync, disconnect) */
    sync: createLogger("rs:sync"),
    /** mtime sidecar operations (writeMtimeSidecar, deleteMtimeSidecar, getRevision, touch, link) */
    mtime: createLogger("rs:mtime"),
    /** Rename operations */
    rename: createLogger("rs:rename"),
    /** Metadata operations not covered by other areas */
    meta: createLogger("rs:meta")
  };
  function truncate3(data, max = 200) {
    let s;
    try {
      s = typeof data === "string" ? data : JSON.stringify(data);
    } catch {
      s = String(data);
    }
    if (s === void 0) s = "undefined";
    if (s.length > max) return s.slice(0, max) + "...";
    return s;
  }
  var methodToArea = {
    buildUrl: "http",
    makeRequest: "http",
    exists: "exists",
    readFile: "read",
    readFileMeta: "read",
    read: "read",
    writeFile: "write",
    writeFileWithMtime: "write",
    write: "write",
    createFile: "write",
    stat: "stat",
    readdir: "dir",
    mkdir: "dir",
    rmdir: "dir",
    ensureDirListing: "dir",
    patchDirListingEntry: "dir",
    unlink: "delete",
    rename: "rename",
    cache: "cache",
    shouldSync: "sync",
    buildSnapshot: "sync",
    sync: "sync",
    disconnect: "sync",
    writeMtimeSidecar: "mtime",
    deleteMtimeSidecar: "mtime",
    getRevision: "mtime",
    touch: "mtime",
    link: "mtime"
  };
  function createLogger2(backendName, scope = "/") {
    const log2 = (method, path, detail) => {
      const area = methodToArea[method] ?? "meta";
      const logger = loggers[area];
      const parts = [`${method} path=${path} backend=${backendName} scope=${scope}`];
      if (detail) {
        for (const [k, v] of Object.entries(detail)) {
          parts.push(`${k}=${truncate3(v)}`);
        }
      }
      logger.log(parts.join(" "));
    };
    const logResult = (method, path, result, ok = true) => {
      const area = methodToArea[method] ?? "meta";
      const logger = loggers[area];
      const status = ok ? "OK" : "ERR";
      logger.log(`${method} path=${path} backend=${backendName} scope=${scope} \u2192 ${status} ${truncate3(result)}`);
    };
    return { log: log2, logResult };
  }
  function isBrowserLike() {
    return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined" && typeof globalThis.window !== "undefined";
  }
  function idbAvailable() {
    try {
      return typeof indexedDB !== "undefined" && indexedDB !== null;
    } catch {
      return false;
    }
  }
  var IdbCacheStorage = class {
    constructor(storageKey) {
      this.store = new IdbKVStore(storageKey, "cache");
    }
    async load() {
      try {
        const entries2 = await this.store.entries();
        const result = {};
        for (const [key, value] of entries2) {
          result[key] = value;
        }
        return result;
      } catch {
        return {};
      }
    }
    async save(data) {
      try {
        const entries2 = Object.entries(data).map(([k, v]) => [k, v]);
        await this.store.setMany(entries2);
      } catch {
      }
    }
  };
  var LocalStorageCache = class {
    constructor(key) {
      this.key = key;
    }
    async load() {
      try {
        const raw = globalThis.localStorage.getItem(this.key);
        if (!raw) return {};
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    async save(data) {
      try {
        globalThis.localStorage.setItem(this.key, JSON.stringify(data));
      } catch {
      }
    }
  };
  var FileCache = class {
    constructor(filePath) {
      this.filePath = filePath;
    }
    async readFile() {
      try {
        const { readFile: readFile3 } = await import("fs/promises");
        return await readFile3(this.filePath, "utf-8");
      } catch (err2) {
        if (err2 && err2.code === "ENOENT") return null;
        return null;
      }
    }
    async load() {
      const raw = await this.readFile();
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    async save(data) {
      try {
        const { writeFile: writeFile3, mkdir: mkdir5 } = await import("fs/promises");
        const { dirname: dirname2 } = await import("path");
        await mkdir5(dirname2(this.filePath), { recursive: true });
        await writeFile3(this.filePath, JSON.stringify(data), "utf-8");
      } catch {
      }
    }
  };
  var MemoryCache = class {
    constructor() {
      this.map = {};
    }
    async load() {
      return this.map;
    }
    async save(data) {
      this.map = data;
    }
  };
  function createCacheStorage(storageKey, fileOption) {
    if (isBrowserLike() && idbAvailable()) {
      return new IdbCacheStorage(storageKey);
    }
    if (isBrowserLike()) {
      return new LocalStorageCache(storageKey);
    }
    try {
      const filePath = fileOption || (typeof process !== "undefined" && process.cwd ? `${process.cwd()}/.zen-fs-remotestorage-cache.json` : ".zen-fs-remotestorage-cache.json");
      return new FileCache(filePath);
    } catch {
      return new MemoryCache();
    }
  }
  var _RemoteStorageFileSystem = class _RemoteStorageFileSystem2 extends FileSystem {
    constructor(config) {
      super(0, 0);
      this.config = config;
      this.existenceCache = /* @__PURE__ */ new Map();
      this.dirListingCache = /* @__PURE__ */ new Map();
      this.mtimeCache = /* @__PURE__ */ new Map();
      this.snapshot = null;
      this.rootEtag = null;
      this.snapshotLoaded = false;
      this.storage = null;
      this.loadPromise = null;
      this.saveTimer = null;
      this.backendName = `RemoteStorage@${config.href.replace(/^https?:\/\//, "")}`;
      this.baseUrl = config.href.endsWith("/") ? config.href.slice(0, -1) : config.href;
      let bp = config.basePath || "";
      if (bp && !bp.startsWith("/")) bp = "/" + bp;
      if (bp && !bp.endsWith("/")) bp = bp + "/";
      this.config = { ...config, basePath: bp };
      this.backendScope = bp || "/";
      this.logger = createLogger2(this.backendName, this.backendScope);
      const srp = bp ? "/" : "app_data/";
      this.syncRootPath = srp.endsWith("/") ? srp : srp + "/";
      this.headers = new Headers({
        "Authorization": `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...config.headers
      });
      this.timeout = config.timeout || 3e4;
      this.usePreciseMtime = config.preciseMtime !== false;
      this.persistCache = config.persistCache !== false;
      this.cacheNamespace = `${this.baseUrl}${this.config.basePath}`;
      if (this.persistCache) {
        this.storage = createCacheStorage(
          "zen-fs-remotestorage-cache",
          config.cacheFile
        );
        this.loadPromise = this.ensureCacheLoaded();
      }
      const idbDbBase = `zen-fs-remotestorage:${this.cacheNamespace}`;
      this.snapshotStore = new IdbKVStore(`${idbDbBase}:snapshot`, "cache");
      this.mtimeStore = new IdbKVStore(`${idbDbBase}:mtime`, "cache");
    }
    /**
     * 校验并标准化路径，抛出异常或返回标准化后的路径
     */
    validateAndNormalizePath(path, ensureDir = false) {
      if (!isValidPath(path)) {
        throw new RemoteStorageError("Invalid path format");
      }
      let p = normalizePath2(path);
      if (ensureDir) {
        p = ensureDirectoryPath(p);
      }
      return p;
    }
    /**
     * 获取目录下的所有条目，返回标准化后的绝对路径数组
     */
    async getDirectoryEntries(path) {
      const entries2 = await this.readdir(path);
      return entries2.map((entry) => joinPath(path, entry));
    }
    /**
     * Resolve the remote URL for a path without logging (used by log lines that
     * need to show the real object address alongside the Fs-relative path).
     */
    urlFor(path) {
      const basePath = this.config.basePath || "";
      const normalizedPath = normalizePath2(path);
      const isDir = path === "/" || path.endsWith("/");
      const suffix = normalizedPath ? "/" + normalizedPath + (isDir ? "/" : "") : isDir ? "/" : "";
      const fullPath = basePath.endsWith("/") && suffix.startsWith("/") ? basePath + suffix.slice(1) : basePath + suffix;
      return this.baseUrl + fullPath;
    }
    /**
     * Build full URL for a path
     */
    buildUrl(path) {
      const url = this.urlFor(path);
      const isDir = path === "/" || path.endsWith("/");
      this.logger.log("buildUrl", path, { isDir, url });
      return url;
    }
    /**
     * Make HTTP request with timeout
     */
    async makeRequest(url, options = {}) {
      const method = options.method || "GET";
      this.logger.log("makeRequest", url, { method, attempt: "start" });
      const maxRetries = 3;
      let lastError = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
          const mergedHeaders = new Headers({
            "Authorization": `Bearer ${this.config.token}`,
            "Content-Type": "application/json",
            ...this.config.headers
          });
          new Headers(options.headers).forEach((value, key) => mergedHeaders.set(key, value));
          const response = await fetch(url, {
            ...options,
            credentials: "omit",
            headers: mergedHeaders,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          this.logger.logResult("makeRequest", url, `${method} status=${response.status}`);
          return response;
        } catch (error2) {
          clearTimeout(timeoutId);
          lastError = error2;
          this.logger.logResult("makeRequest", url, `${method} attempt=${attempt + 1} error=${error2 instanceof Error ? error2.message : String(error2)}`, false);
          if (error2 instanceof Error && (error2.name === "AbortError" || error2.name === "FetchError" || error2.message?.includes("network"))) {
            if (attempt < maxRetries - 1) {
              await new Promise((res) => setTimeout(res, 200 * (attempt + 1)));
              continue;
            }
          }
          if (error2 instanceof Error && error2.name === "AbortError") {
            throw new RemoteStorageError("Request timeout");
          }
          throw error2;
        }
      }
      throw lastError || new RemoteStorageError("Unknown HTTP request error");
    }
    /**
     * Handle HTTP response errors
     */
    handleHttpError(response, path, operation) {
      if (response.status === 404) {
        throw new FileNotFoundError(path);
      } else if (response.status === 401) {
        throw new AuthenticationError("Invalid or expired token");
      } else if (response.status === 403) {
        throw new PermissionDeniedError(path);
      } else if (response.status === 409) {
        throw new FileExistsError(path);
      } else if (!response.ok) {
        throw new RemoteStorageError(
          `${operation} failed for ${path}: ${response.status} ${response.statusText}`
        );
      }
    }
    /**
     * Check if path is a directory by trying to list it
     */
    async isDirectory(path) {
      try {
        const dirPath = path.endsWith("/") ? path : path + "/";
        const dirUrl = this.buildUrl(dirPath);
        const response = await this.makeRequest(dirUrl, { method: "GET" });
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          return contentType.includes("application/ld+json") || contentType.includes("text/html");
        }
        return false;
      } catch {
        return false;
      }
    }
    /**
     * Check if file/directory exists
     */
    async exists(path) {
      this.logger.log("exists", path);
      const normalized = normalizePath2(path);
      await this.ensureCacheLoaded();
      loggers.exists.log(`exists(${path}) backend=${this.backendName} scope=${this.backendScope}`);
      loggers.exists.log(`exists(${path}) cacheState=${this.dumpCacheState(path)}`);
      const cached = this.existenceCache.get(normalized);
      if (cached) {
        if (cached.exists) {
          if (Date.now() - cached.ts < _RemoteStorageFileSystem2.POSITIVE_CACHE_TTL) {
            loggers.exists.log(`exists(${path}) result=true source=existenceCache-positive ageMs=${Date.now() - cached.ts} ttlMs=${_RemoteStorageFileSystem2.POSITIVE_CACHE_TTL}`);
            this.logger.logResult("exists", path, true, true);
            return true;
          }
          loggers.exists.log(`exists(${path}) cache=positive-expired ageMs=${Date.now() - cached.ts} next=stat`);
        } else {
          if (Date.now() - cached.ts < _RemoteStorageFileSystem2.NEGATIVE_CACHE_TTL) {
            loggers.exists.log(`exists(${path}) result=false source=existenceCache-negative ageMs=${Date.now() - cached.ts} ttlMs=${_RemoteStorageFileSystem2.NEGATIVE_CACHE_TTL}`);
            this.logger.logResult("exists", path, false, true);
            return false;
          }
          loggers.exists.log(`exists(${path}) cache=negative-expired ageMs=${Date.now() - cached.ts} next=stat`);
        }
      } else {
        loggers.exists.log(`exists(${path}) cache=miss normalized=${normalized} next=stat`);
      }
      try {
        loggers.exists.log(`exists(${path}) next=stat`);
        await this.stat(path);
        this.existenceCache.set(normalized, { exists: true, ts: Date.now() });
        loggers.exists.log(`exists(${path}) result=true source=stat cache=updated-positive`);
        this.logger.logResult("exists", path, true);
        return true;
      } catch (error2) {
        if (error2 instanceof FileNotFoundError) {
          this.existenceCache.set(normalized, { exists: false, ts: Date.now() });
          loggers.exists.log(`exists(${path}) result=false source=stat error=FileNotFoundError cache=updated-negative`);
          this.logger.logResult("exists", path, false);
          return false;
        }
        loggers.exists.log(`exists(${path}) result=error message=${error2 instanceof Error ? error2.message : String(error2)}`);
        this.logger.logResult("exists", path, error2, false);
        throw error2;
      }
    }
    /**
     * Read file contents
     */
    async readFile(path) {
      this.logger.log("readFile", path);
      path = this.validateAndNormalizePath(path);
      const url = this.buildUrl(path);
      try {
        const response = await this.makeRequest(url, { method: "GET" });
        if (!response.ok) {
          this.handleHttpError(response, path, "readFile");
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        this.logger.logResult("readFile", path, `size=${data.byteLength}`);
        return data;
      } catch (error2) {
        this.logger.logResult("readFile", path, error2, false);
        if (error2 instanceof FileNotFoundError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to read file ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Write file contents
     */
    async writeFile(path, data, options) {
      const size = typeof data === "string" ? data.length : data.byteLength;
      this.logger.log("writeFile", path, { flag: options?.flag, size });
      path = this.validateAndNormalizePath(path);
      const flag = options?.flag;
      if (flag === "x" || flag === "wx") {
        const exists3 = await this.exists(path);
        if (exists3) {
          this.logger.logResult("writeFile", path, "FileExistsError", false);
          throw new FileExistsError(path);
        }
      }
      const url = this.buildUrl(path);
      try {
        await this.ensureParentDirectories(path);
        let body;
        let contentType;
        if (typeof data === "string") {
          body = data;
          contentType = "text/plain; charset=utf-8";
        } else if (data instanceof Uint8Array) {
          body = data;
          contentType = "application/octet-stream";
        } else if (data instanceof ArrayBuffer) {
          body = data;
          contentType = "application/octet-stream";
        } else {
          throw new RemoteStorageError("Unsupported data type for writing");
        }
        const headers = new Headers(this.headers);
        headers.set("Content-Type", contentType);
        const response = await this.makeRequest(url, {
          method: "PUT",
          body,
          headers
        });
        if (!response.ok) {
          this.handleHttpError(response, path, "writeFile");
        }
        this.logger.logResult("writeFile", path, `status=${response.status}`);
        this.invalidateExistenceCache(path);
        if (this.usePreciseMtime) {
          const mtime = options?.mtime ?? Date.now();
          await this.writeMtimeSidecar(path, mtime);
        }
        const newEtag = response.headers.get("ETag") ?? void 0;
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        await this.patchDirListingEntry(parentDir, getBasename(path), {
          name: getBasename(path),
          isDir: false,
          etag: newEtag,
          size,
          lastModified: response.headers.get("Last-Modified") ?? void 0
        });
        this.updateSnapshotForPath(path, newEtag ?? null);
      } catch (error2) {
        this.logger.logResult("writeFile", path, error2, false);
        if (error2 instanceof FileExistsError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to write file ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * 写入前逐级确保父目录存在。
     *
     * RemoteStorage 要求父目录先存在，直接 PUT 一个深层文件（例如
     * `.meta/backends/x.json`）会被服务端拒绝并返回 “no such file or
     * directory”。这里从最外层开始逐级探测，缺失的目录用
     * `Content-Type: application/x-directory` 的 PUT 创建，已存在的目录直接跳过。
     */
    async ensureParentDirectories(path) {
      const parent = getParentPath(path);
      if (!parent) return;
      let current = "";
      for (const segment of parent.split("/")) {
        current = current ? `${current}/${segment}` : segment;
        const dirPath = `/${current}/`;
        if (await this.exists(dirPath)) continue;
        try {
          await this.createRemoteDirectory(dirPath);
        } catch (error2) {
          if (error2 instanceof AuthenticationError || error2 instanceof PermissionDeniedError) {
            throw error2;
          }
        }
      }
    }
    /**
     * 用 remoteStorage 的目录 PUT（`application/x-directory`）创建一个目录。
     * 409 表示并发创建，目标状态已达成，视为成功。
     */
    async createRemoteDirectory(dirPath) {
      const url = this.buildUrl(ensureDirectoryPath(dirPath));
      const headers = new Headers(this.headers);
      headers.set("Content-Type", "application/x-directory");
      const response = await this.makeRequest(url, { method: "PUT", body: "", headers });
      if (!response.ok && response.status !== 409) {
        this.handleHttpError(response, dirPath, "mkdir");
      }
      this.existenceCache.set(normalizePath2(dirPath), { exists: true, ts: Date.now() });
      this.logger.logResult("mkdir", dirPath, "auto-created for nested write");
    }
    /**
     * Write file with precise mtime — implements SyncableFS.writeFileWithMtime.
     *
     * Delegates to writeFile() with { mtime } option. When preciseMtime is
     * enabled, a .mtime sidecar is written preserving the exact mtime.
     */
    async writeFileWithMtime(path, data, mtime) {
      this.logger.log("writeFileWithMtime", path, { mtime });
      await this.writeFile(path, data, { mtime });
    }
    /**
     * Delete file.
     *
     * Pre-DELETE existence check:
     * 1. Check existence cache and cached directory listing (zero network cost).
     *    If either definitively says the file doesn't exist, skip the DELETE
     *    entirely — avoids 404 errors on remote backends.
     * 2. If cache is inconclusive, send the DELETE. A 404 response is treated
     *    as success (DELETE is idempotent in REST semantics — the resource is
     *    already gone, which is the desired end state).
     */
    async unlink(path) {
      this.logger.log("unlink", path);
      path = this.validateAndNormalizePath(path);
      const normalized = normalizePath2(path);
      const existCached = this.existenceCache.get(normalized);
      const targetUrl = this.urlFor(path);
      const cacheDesc = existCached ? `hit exists=${existCached.exists} ageMs=${Date.now() - existCached.ts}` : "miss";
      loggers.delete.log(
        `unlink path=${path} normalized=${normalized} backend=${this.backendName} scope=${this.backendScope} url=${targetUrl} cache=${cacheDesc} state=${this.dumpCacheState(path)}`
      );
      if (existCached && !existCached.exists) {
        if (Date.now() - existCached.ts < _RemoteStorageFileSystem2.NEGATIVE_CACHE_TTL) {
          loggers.delete.log(`unlink path=${path} result=skipped reason=negative-cache ttlMs=${_RemoteStorageFileSystem2.NEGATIVE_CACHE_TTL}`);
          this.logger.logResult("unlink", path, "skipped (existence cache: not found)");
          return;
        }
        loggers.delete.log(`unlink path=${path} phase=delete reason=negative-cache-expired`);
      }
      try {
        const url = this.buildUrl(path);
        const response = await this.makeRequest(url, { method: "DELETE" });
        loggers.delete.log(`unlink path=${path} phase=delete status=${response.status}`);
        if (response.status === 404) {
          loggers.delete.log(`unlink path=${path} phase=delete status=404 result=already-deleted`);
          this.logger.logResult("unlink", path, "404 \u2014 already deleted, treating as success");
          this.removeFromExistenceCache(path);
          const parentPath2 = getParentPath(path);
          const parentDir2 = parentPath2 ? `/${parentPath2}/` : "/";
          await this.patchDirListingEntry(parentDir2, getBasename(path), null);
          await this.flushSaveNow();
          if (this.usePreciseMtime && !isMtimeSidecar(path)) {
            await this.deleteMtimeSidecar(path);
          }
          this.updateSnapshotForPath(path, null);
          return;
        }
        if (!response.ok) {
          this.handleHttpError(response, path, "unlink");
        }
        this.logger.logResult("unlink", path, `status=${response.status}`);
        this.removeFromExistenceCache(path);
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        await this.patchDirListingEntry(parentDir, getBasename(path), null);
        await this.flushSaveNow();
        if (this.usePreciseMtime && !isMtimeSidecar(path)) {
          await this.deleteMtimeSidecar(path);
        }
        this.updateSnapshotForPath(path, null);
      } catch (error2) {
        this.logger.logResult("unlink", path, error2, false);
        if (error2 instanceof FileNotFoundError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to unlink ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Read directory contents
     */
    async readdir(path) {
      this.logger.log("readdir", path);
      path = this.validateAndNormalizePath(path, true);
      try {
        const entries2 = await this.ensureDirListing(path);
        if (!entries2) {
          this.logger.logResult("readdir", path, "DirectoryNotFoundError", false);
          throw new DirectoryNotFoundError(path);
        }
        const entryNames = new Set(entries2.keys());
        const names = [];
        for (const [name] of entries2) {
          if (name === ".keep") continue;
          if (isMtimeSidecar(name)) {
            const dataName = sidecarToDataPath(name);
            const orphaned = name.endsWith(".mtime.mtime") || // pathological nested sidecar
            !dataName || !entryNames.has(dataName);
            if (orphaned) {
              const full = `${path}${name}`;
              loggers.dir.log(`pruning orphaned mtime sidecar: ${full}`);
              void this.unlink(full).catch(() => {
              });
            }
            continue;
          }
          names.push(name);
        }
        loggers.dir.log(`readdir(${path}) backend=${this.backendName} scope=${this.backendScope}: ${entries2.size} entries, returning ${names.length} visible names`);
        this.logger.logResult("readdir", path, `count=${names.length} [${names.join(", ")}]`);
        this.existenceCache.set(normalizePath2(path), { exists: true, ts: Date.now() });
        return names;
      } catch (error2) {
        this.logger.logResult("readdir", path, error2, false);
        if (error2 instanceof DirectoryNotFoundError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to read directory ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Recursively delete `.mtime` sidecar files whose data file no longer
     * exists in remote storage (orphaned sidecars). Returns the number of
     * sidecars removed. Safe to call at any time; each deletion is best-effort.
     *
     * NOTE: `readdir()` and the snapshot builder already prune orphans on the
     * fly during normal operation; this method forces a full walk for an
     * explicit, on-demand cleanup (e.g. from a maintenance task).
     */
    async pruneOrphanedMtimeSidecars(root = "/") {
      let removed = 0;
      const stack = [root];
      while (stack.length) {
        const dir = stack.pop();
        let entries2;
        try {
          entries2 = await this.ensureDirListing(dir);
        } catch {
          continue;
        }
        if (!entries2) continue;
        const entryNames = new Set(entries2.keys());
        for (const [name, entry] of entries2) {
          if (entry.isDir) {
            stack.push(joinPath(dir, name));
            continue;
          }
          if (isMetadataSidecarToDelete(name)) {
            const full = joinPath(dir, name);
            try {
              await this.unlink(full);
              removed++;
            } catch {
            }
            continue;
          }
          if (!isMtimeSidecar(name)) continue;
          const dataName = sidecarToDataPath(name);
          const orphaned = name.endsWith(".mtime.mtime") || !dataName || !entryNames.has(dataName);
          if (orphaned) {
            const full = joinPath(dir, name);
            try {
              await this.unlink(full);
              removed++;
            } catch {
            }
          }
        }
      }
      return removed;
    }
    /**
     * Parse HTML directory listing (fallback)
     */
    parseHtmlDirectoryListing(html) {
      const items = [];
      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const name = match[2];
        if (href !== "../" && href !== "./" && name !== ".." && name !== ".") {
          const cleanName = href.endsWith("/") ? href.slice(0, -1) : href;
          if (cleanName) {
            items.push(cleanName);
          }
        }
      }
      return items;
    }
    /**
     * Create directory
     */
    async mkdir(path, options) {
      this.logger.log("mkdir", path);
      path = this.validateAndNormalizePath(path, true);
      try {
        try {
          const keepFilePath = joinPath(path, ".keep");
          await this.writeFile(keepFilePath, "");
        } catch (e) {
        }
        const result = {
          ino: 0,
          mode: options?.mode || 16877,
          uid: options?.uid || 0,
          gid: options?.gid || 0,
          size: 0,
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          atimeMs: Date.now(),
          birthtimeMs: Date.now(),
          nlink: 1
        };
        this.logger.logResult("mkdir", path, `mode=${result.mode.toString(8)}`);
        this.invalidateExistenceCache(path);
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        await this.patchDirListingEntry(parentDir, getBasename(path), {
          name: getBasename(path),
          isDir: true,
          etag: void 0
        });
        return result;
      } catch (error2) {
        this.logger.logResult("mkdir", path, error2, false);
        if (error2 instanceof FileExistsError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to create directory ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Remove directory
     */
    async rmdir(path) {
      this.logger.log("rmdir", path);
      path = this.validateAndNormalizePath(path, true);
      try {
        const stats = await this.stat(path);
        if (!this.isDirectoryMode(stats.mode)) {
          this.logger.logResult("rmdir", path, "Not a directory", false);
          throw new RemoteStorageError(`Not a directory: ${path}`);
        }
        const entries2 = await this.readdir(path);
        if (entries2.length > 0) {
          this.logger.logResult("rmdir", path, `Directory not empty: [${entries2.join(", ")}]`, false);
          throw new RemoteStorageError(`Directory not empty: ${path}`);
        }
        try {
          await this.unlink(joinPath(path, ".keep"));
        } catch {
        }
        this.logger.logResult("rmdir", path, "OK");
        this.removeFromExistenceCache(path);
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        await this.patchDirListingEntry(parentDir, getBasename(path), null);
        this.dirListingCache.delete(normalizePath2(path));
        await this.flushSaveNow();
      } catch (error2) {
        this.logger.logResult("rmdir", path, error2, false);
        if (error2 instanceof FileNotFoundError || error2 instanceof DirectoryNotFoundError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to remove directory ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Remove directory recursively (helper method)
     */
    async rmdirRecursive(path) {
      const entries2 = await this.readdir(path);
      for (const entry of entries2) {
        const entryPath = joinPath(path, entry);
        const stats = await this.stat(entryPath);
        if (this.isDirectoryMode(stats.mode)) {
          await this.rmdirRecursive(entryPath);
          await this.rmdir(entryPath);
        } else {
          await this.unlink(entryPath);
        }
      }
      await this.rmdir(path);
    }
    /**
     * Rename/move file or directory
     */
    async rename(oldPath, newPath) {
      this.logger.log("rename", oldPath, { to: newPath });
      if (!isValidPath(oldPath) || !isValidPath(newPath)) {
        this.logger.logResult("rename", oldPath, "Invalid path format", false);
        throw new RemoteStorageError("Invalid path format");
      }
      try {
        const stats = await this.stat(oldPath);
        const destExists = await this.exists(newPath);
        if (destExists) {
          this.logger.logResult("rename", oldPath, `FileExistsError: ${newPath}`, false);
          throw new FileExistsError(newPath);
        }
        if (this.isFileMode(stats.mode)) {
          const content = await this.readFile(oldPath);
          await this.writeFile(newPath, content);
          await this.unlink(oldPath);
        } else {
          await this.copyDirectoryRecursive(oldPath, newPath);
          await this.rmdirRecursive(oldPath);
        }
        this.logger.logResult("rename", oldPath, `\u2192 ${newPath}`);
      } catch (error2) {
        this.logger.logResult("rename", oldPath, error2, false);
        if (error2 instanceof FileNotFoundError || error2 instanceof FileExistsError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to rename ${oldPath} to ${newPath}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Helper method to ensure directory exists
     */
    async ensureDirectoryExists(path) {
      const exists3 = await this.exists(path);
      if (!exists3) {
        await this.mkdir(path, {
          recursive: true,
          uid: 0,
          gid: 0,
          mode: 16877
        });
      }
    }
    /**
     * Helper method to copy directory recursively
     */
    async copyDirectoryRecursive(srcPath, destPath) {
      await this.mkdir(destPath, {
        recursive: true,
        uid: 0,
        gid: 0,
        mode: 16877
      });
      const entries2 = await this.readdir(srcPath);
      for (const entry of entries2) {
        const srcEntryPath = joinPath(srcPath, entry);
        const destEntryPath = joinPath(destPath, entry);
        const stats = await this.stat(srcEntryPath);
        if (this.isDirectoryMode(stats.mode)) {
          await this.copyDirectoryRecursive(srcEntryPath, destEntryPath);
        } else {
          const content = await this.readFile(srcEntryPath);
          await this.writeFile(destEntryPath, content);
        }
      }
    }
    /**
     * Get filesystem metadata
     */
    metadata() {
      return {
        name: "RemoteStorageFileSystem",
        readonly: false,
        totalSpace: 0,
        freeSpace: 0
      };
    }
    /**
     * Sync filesystem (no-op for RemoteStorage as it's always synced)
     */
    async sync() {
      this.logger.log("sync", "(root)");
    }
    /**
     * Disconnect and cleanup
     */
    async disconnect() {
      this.logger.log("disconnect", "(root)");
    }
    // zen-fs required sync methods (throwing not implemented errors)
    statSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    readdirSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    readFileSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    writeFileSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    unlinkSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    rmdirSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    mkdirSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    renameSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    createFileSync() {
      throw new Error("createFileSync operation not supported by RemoteStorage");
    }
    linkSync() {
      throw new Error("linkSync operation not supported by RemoteStorage");
    }
    symlink() {
      return Promise.reject(new Error("symlink operation not supported by RemoteStorage"));
    }
    symlinkSync() {
      throw new Error("symlinkSync operation not supported by RemoteStorage");
    }
    readlink() {
      return Promise.reject(new Error("readlink operation not supported by RemoteStorage"));
    }
    readlinkSync() {
      throw new Error("readlinkSync operation not supported by RemoteStorage");
    }
    lstat() {
      return Promise.reject(new Error("lstat operation not supported by RemoteStorage"));
    }
    lstatSync() {
      throw new Error("lstatSync operation not supported by RemoteStorage");
    }
    /**
     * Modify metadata (touch).
     *
     * With precise mtime enabled, writing `mtimeMs` via the `.mtime` sidecar
     * is supported. Other metadata fields are ignored (RemoteStorage protocol
     * does not support them). If precise mtime is disabled, this is a no-op.
     */
    async touch(path, metadata) {
      this.logger.log("touch", path, metadata);
      if (this.usePreciseMtime && metadata.mtimeMs !== void 0) {
        path = this.validateAndNormalizePath(path);
        await this.writeMtimeSidecar(path, metadata.mtimeMs);
        this.logger.logResult("touch", path, `mtimeMs=${metadata.mtimeMs}`);
        return;
      }
      this.logger.logResult("touch", path, "no-op (preciseMtime disabled or no mtimeMs)");
    }
    /**
     * Create the file at path with the given options
     */
    async createFile(path, options) {
      this.logger.log("createFile", path);
      await this.writeFile(path, new Uint8Array(0));
      const result = {
        ino: 0,
        mode: options.mode || 33188,
        uid: options.uid || 0,
        gid: options.gid || 0,
        size: 0,
        mtimeMs: Date.now(),
        ctimeMs: Date.now(),
        atimeMs: Date.now(),
        birthtimeMs: Date.now(),
        nlink: 1
      };
      this.logger.logResult("createFile", path, `mode=${result.mode.toString(8)}`);
      this.invalidateExistenceCache(path);
      return result;
    }
    /**
     * Get file/directory stat information
     */
    async stat(path) {
      this.logger.log("stat", path);
      if (!isValidPath(path)) {
        this.logger.logResult("stat", path, "Invalid path format", false);
        throw new RemoteStorageError("Invalid path format");
      }
      await this.ensureCacheLoaded();
      const callerSaysDir = path.endsWith("/");
      const baseName = getBasename(path);
      loggers.stat.log(`stat ENTER(${path}) backend=${this.backendName} scope=${this.backendScope} baseName=${baseName} callerSaysDir=${callerSaysDir}`);
      loggers.stat.log(`stat(${path}) cacheState=${this.dumpCacheState(path)}`);
      let existsViaDir = false;
      let isDirViaDir = false;
      let dirListingAvailable = false;
      let cachedEntry;
      if (baseName) {
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        let entries2 = null;
        try {
          entries2 = await this.ensureDirListing(parentDir);
          const listingAge = this.getDirListingAge(parentDir);
          loggers.stat.log(`stat(${path}): ensureDirListing(${parentDir}) \u2192 ${entries2 ? `${entries2.size} entries, age=${listingAge}ms` : "null (dir not found)"}`);
        } catch (err2) {
          loggers.stat.log(`stat(${path}): ensureDirListing(${parentDir}) FAILED: ${err2}`);
          entries2 = null;
        }
        if (entries2) {
          dirListingAvailable = true;
          cachedEntry = entries2.get(baseName);
          if (cachedEntry) {
            existsViaDir = true;
            isDirViaDir = cachedEntry.isDir;
            loggers.stat.log(`stat(${path}): FOUND in dir listing (isDir=${isDirViaDir}, size=${cachedEntry.size ?? "undefined"})`);
          } else {
            loggers.stat.log(`stat(${path}): NOT in dir listing (entries: ${[...entries2.keys()].join(", ")})`);
          }
        }
      }
      if (dirListingAvailable && !existsViaDir && !callerSaysDir) {
        const parentPath = getParentPath(path);
        const parentDir = parentPath ? `/${parentPath}/` : "/";
        const listingAge = this.getDirListingAge(parentDir);
        if (listingAge !== null && listingAge < _RemoteStorageFileSystem2.DIR_LISTING_TTL) {
          loggers.stat.log(`stat(${path}): \u2192 FileNotFoundError (not in dir listing, age=${listingAge}ms < ${_RemoteStorageFileSystem2.DIR_LISTING_TTL}ms)`);
          this.logger.logResult("stat", path, "FileNotFoundError (not in dir listing)", false);
          throw new FileNotFoundError(path);
        }
        loggers.stat.log(`stat(${path}): not in STALE dir listing (age=${listingAge}ms >= ${_RemoteStorageFileSystem2.POSITIVE_CACHE_TTL}ms), falling through to file GET probe`);
      }
      if (dirListingAvailable && !existsViaDir && !callerSaysDir) {
        const listingAge = this.getDirListingAge(
          getParentPath(path) ? `/${getParentPath(path)}/` : "/"
        );
        const stale = listingAge === null || listingAge >= _RemoteStorageFileSystem2.DIR_LISTING_TTL;
        if (stale) {
          loggers.stat.log(`stat(${path}): stale listing \u2014 probing file via GET ${this.buildUrl(path)}`);
          try {
            const fileResp = await this.makeRequest(this.buildUrl(path), { method: "GET" });
            if (fileResp.ok) {
              const contentType = fileResp.headers.get("content-type") || "";
              if (!contentType.includes("application/ld+json") && !contentType.includes("text/html")) {
                const contentLength = fileResp.headers.get("content-length");
                const lastModified = fileResp.headers.get("last-modified");
                const size = contentLength ? parseInt(contentLength, 10) : 0;
                let mtime = lastModified ? new Date(lastModified).getTime() : Date.now();
                if (this.usePreciseMtime) {
                  const preciseMtime = await this.readMtimeSidecar(path);
                  if (preciseMtime !== void 0) mtime = preciseMtime;
                }
                loggers.stat.log(`stat(${path}): returning via file GET (size=${size}), setting existenceCache=true`);
                this.existenceCache.set(normalizePath2(path), { exists: true, ts: Date.now() });
                return {
                  ino: 0,
                  mode: 33188,
                  uid: 0,
                  gid: 0,
                  size,
                  mtimeMs: mtime,
                  ctimeMs: mtime,
                  atimeMs: mtime,
                  birthtimeMs: mtime,
                  nlink: 1
                };
              }
            } else if (fileResp.status === 401 || fileResp.status === 403) {
              this.handleHttpError(fileResp, path, "stat");
            } else if (fileResp.status === 404) {
              loggers.stat.log(`stat(${path}): file GET 404 \u2014 confirmed not found, setting existenceCache=false`);
              this.existenceCache.set(normalizePath2(path), { exists: false, ts: Date.now() });
              throw new FileNotFoundError(path);
            }
          } catch (error2) {
            if (error2 instanceof AuthenticationError || error2 instanceof PermissionDeniedError) throw error2;
            if (error2 instanceof FileNotFoundError) throw error2;
          }
        }
      }
      if (existsViaDir && isDirViaDir) {
        this.logger.logResult("stat", path, `DIR mode=40755 (via dir listing)`);
        loggers.stat.log(`stat(${path}): returning via dir listing (isDir), setting existenceCache=true`);
        this.existenceCache.set(normalizePath2(path), { exists: true, ts: Date.now() });
        return {
          ino: 0,
          mode: 16877,
          uid: 0,
          gid: 0,
          size: 0,
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          atimeMs: Date.now(),
          birthtimeMs: Date.now(),
          nlink: 1
        };
      }
      if (existsViaDir && !isDirViaDir) {
        const size = cachedEntry?.size ?? 0;
        let mtime = cachedEntry?.lastModified ? new Date(cachedEntry.lastModified).getTime() : Date.now();
        if (this.usePreciseMtime) {
          const preciseMtime = await this.readMtimeSidecar(path);
          if (preciseMtime !== void 0) {
            mtime = preciseMtime;
          }
        }
        this.logger.logResult("stat", path, `FILE mode=100644 (via dir listing, size=${size})`);
        loggers.stat.log(`stat(${path}): returning via dir listing (file, size=${size}), setting existenceCache=true`);
        this.existenceCache.set(normalizePath2(path), { exists: true, ts: Date.now() });
        return {
          ino: 0,
          mode: 33188,
          uid: 0,
          gid: 0,
          size,
          mtimeMs: mtime,
          ctimeMs: mtime,
          atimeMs: mtime,
          birthtimeMs: mtime,
          nlink: 1
        };
      }
      const dirPath = path.endsWith("/") ? path : path + "/";
      const dirUrl = this.buildUrl(dirPath);
      loggers.stat.log(`stat(${path}): trying dir probe GET ${dirUrl}`);
      try {
        const response = await this.makeRequest(dirUrl, {
          method: "GET",
          headers: { "Accept": "application/ld+json" }
        });
        loggers.stat.log(`stat(${path}): dir probe response status=${response.status}`);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/ld+json") || contentType.includes("text/html")) {
            this.logger.logResult("stat", path, `DIR mode=40755 (via dir probe)`);
            loggers.stat.log(`stat(${path}): returning via dir probe, setting existenceCache=true`);
            this.existenceCache.set(normalizePath2(path), { exists: true, ts: Date.now() });
            return {
              ino: 0,
              mode: 16877,
              uid: 0,
              gid: 0,
              size: 0,
              mtimeMs: Date.now(),
              ctimeMs: Date.now(),
              atimeMs: Date.now(),
              birthtimeMs: Date.now(),
              nlink: 1
            };
          }
        }
        if (response.status === 401 || response.status === 403) {
          this.handleHttpError(response, path, "stat");
        }
      } catch (error2) {
        if (error2 instanceof AuthenticationError || error2 instanceof PermissionDeniedError) {
          throw error2;
        }
      }
      this.logger.logResult("stat", path, "FileNotFoundError", false);
      loggers.stat.log(`stat(${path}): \u2192 FileNotFoundError (all paths exhausted)`);
      throw new FileNotFoundError(path);
    }
    /**
     * Freshness-aware file read used by `zen-fs-cache`.
     *
     * Performs a conditional `GET` when validators are supplied, returning
     * `304` (no body) when the content is unchanged so the cache can serve the
     * previously stored bytes. The response's `ETag` / `Last-Modified` are
     * surfaced so the cache can re-validate on the next read.
     */
    async readFileMeta(path, opts) {
      this.logger.log("readFileMeta", path, opts);
      path = this.validateAndNormalizePath(path);
      const url = this.buildUrl(path);
      const headers = {};
      if (opts?.ifNoneMatch) headers["If-None-Match"] = opts.ifNoneMatch;
      else if (opts?.ifModifiedSince) headers["If-Modified-Since"] = opts.ifModifiedSince;
      try {
        const response = await this.makeRequest(url, { method: "GET", headers });
        if (response.status === 304) {
          this.logger.logResult("readFileMeta", path, "304 Not Modified");
          return {
            status: 304,
            etag: response.headers.get("ETag") ?? opts?.ifNoneMatch,
            lastModified: response.headers.get("Last-Modified") ?? opts?.ifModifiedSince
          };
        }
        if (!response.ok) {
          this.handleHttpError(response, path, "readFileMeta");
        }
        const data = new Uint8Array(await response.arrayBuffer());
        this.logger.logResult("readFileMeta", path, `200 size=${data.byteLength}`);
        let preciseMtime;
        if (this.usePreciseMtime) {
          preciseMtime = await this.readMtimeSidecar(path);
        }
        return {
          status: 200,
          data,
          etag: response.headers.get("ETag") ?? void 0,
          lastModified: response.headers.get("Last-Modified") ?? void 0,
          preciseMtime,
          contentType: response.headers.get("Content-Type") ?? void 0
        };
      } catch (error2) {
        this.logger.logResult("readFileMeta", path, error2, false);
        if (error2 instanceof FileNotFoundError || error2 instanceof RemoteStorageError) {
          throw error2;
        }
        throw new RemoteStorageError(
          `Failed to read file meta ${path}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    }
    /**
     * Return a revision token for any path (file or directory). Used by
     * `zen-fs-cache` for cheap revalidation of `readdir` / `stat` and as a
     * fallback for `readFile`. Prefers the `ETag`, falling back to
     * `Last-Modified` (HTTP-date string).
     *
     * RemoteStorage servers require a trailing '/' for directory URLs; a GET
     * on a directory path without the slash returns 404.  To avoid this we:
     *   1. Check the cached parent-dir listing — if it says the path is a
     *      directory, append '/' before building the URL.
     *   2. If no listing is cached, try the URL as-is first; on 404 retry
     *      with a trailing '/' (covers the case where the caller passes a
     *      directory path without a slash).
     */
    /**
     * Get the cached ETag of a directory itself (distinct from the ETags of its
     * children). Returns `null` if the directory isn't cached or has no ETag.
     */
    getCachedDirEtag(dirPath) {
      const key = normalizePath2(dirPath);
      const cached = this.dirListingCache.get(key);
      return cached ? cached.etag ?? null : null;
    }
    async getRevision(path) {
      this.logger.log("getRevision", path);
      path = this.validateAndNormalizePath(path);
      let isDir = path === "/" || path.endsWith("/");
      if (isDir) {
        const selfDir = path.endsWith("/") ? path : `${path}/`;
        try {
          const entries2 = await this.ensureDirListing(selfDir);
          if (entries2 === null) {
            this.logger.logResult("getRevision", path, "directory not found (null listing)");
            return void 0;
          }
          const rev = this.getCachedDirEtag(selfDir) ?? void 0;
          this.logger.logResult("getRevision", path, rev ?? "no-dir-etag", rev !== void 0);
          return rev;
        } catch (err2) {
          this.logger.logResult("getRevision", path, err2, false);
          return void 0;
        }
      }
      const baseName = getBasename(path);
      const parentPath = getParentPath(path);
      const parentDir = parentPath ? `/${parentPath}/` : "/";
      try {
        const entries2 = await this.ensureDirListing(parentDir);
        this.logger.log("getRevision", path, {
          dirCheck: "ensureDirListing",
          parentDir,
          hasCache: entries2 !== null,
          cacheKeys: entries2 ? [...entries2.keys()] : null
        });
        if (entries2) {
          const entry = entries2.get(baseName);
          this.logger.log("getRevision", path, {
            dirCheck: "parent-listing-hit",
            baseName,
            found: !!entry,
            isDir: entry?.isDir,
            etag: entry?.etag
          });
          if (!entry) {
            this.logger.logResult("getRevision", path, "not in parent listing");
            return void 0;
          }
          if (entry.isDir) {
            isDir = true;
            const rev = this.getCachedDirEtag(`${parentDir}${baseName}/`) ?? void 0;
            this.logger.logResult("getRevision", path, rev ?? "no-dir-etag", rev !== void 0);
            return rev;
          }
          if (entry.etag) {
            this.logger.logResult("getRevision", path, `etag=${entry.etag} (from dir listing)`);
            return entry.etag;
          }
        } else {
          this.logger.log("getRevision", path, { dirCheck: "parent-dir-not-found" });
        }
      } catch (err2) {
        this.logger.log("getRevision", path, { dirCheck: "ensureDirListing-error", error: String(err2) });
      }
      const url = this.buildUrl(path);
      this.logger.log("getRevision", path, { fallback: "GET", url });
      try {
        const response = await this.makeRequest(url, { method: "GET" });
        this.logger.log("getRevision", path, { getStatus: response.status });
        if (!response.ok) {
          this.logger.logResult("getRevision", path, `status=${response.status}`);
          return void 0;
        }
        const rev = response.headers.get("ETag") ?? response.headers.get("Last-Modified") ?? void 0;
        this.logger.logResult("getRevision", path, rev);
        return rev;
      } catch (err2) {
        this.logger.logResult("getRevision", path, err2, false);
        return void 0;
      }
    }
    /**
     * Hard link operation (not supported)
     */
    async link(target, link5) {
      this.logger.log("link", target, { link: link5 });
      throw new Error("Link operation not supported by RemoteStorage");
    }
    /**
     * Read into a buffer
     */
    async read(path, buffer, start, end) {
      this.logger.log("read", path, { start, end, bufLen: buffer.length });
      const data = await this.readFile(path);
      const slice = data.slice(start, end);
      buffer.set(slice, 0);
      this.logger.logResult("read", path, `copied=${slice.length}`);
    }
    /**
     * Write a buffer to a file
     */
    async write(path, buffer, offset) {
      this.logger.log("write", path, { offset, len: buffer.length });
      let existingData;
      try {
        existingData = await this.readFile(path);
      } catch (error2) {
        if (error2 instanceof FileNotFoundError) {
          existingData = new Uint8Array(0);
        } else {
          throw error2;
        }
      }
      const newSize = Math.max(existingData.length, offset + buffer.length);
      const newData = new Uint8Array(newSize);
      newData.set(existingData);
      newData.set(buffer, offset);
      await this.writeFile(path, newData);
      this.logger.logResult("write", path, `newSize=${newSize}`);
    }
    /**
     * Check if mode indicates a directory
     */
    isDirectoryMode(mode) {
      return (mode & 16384) === 16384;
    }
    /**
     * Check if mode indicates a regular file
     */
    isFileMode(mode) {
      return (mode & 32768) === 32768;
    }
    // Additional required sync methods
    touchSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    syncSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    readSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    writeSync() {
      throw new Error("Synchronous operations not supported by RemoteStorage");
    }
    /**
     * Invalidate existence cache for a path and all its ancestors.
     * Called after writes, creates, and deletes.
     */
    invalidateExistenceCache(path) {
      const normalized = normalizePath2(path);
      this.existenceCache.delete(normalized);
      this.existenceCache.delete(ensureDirectoryPath(getParentPath(normalized)));
      this.existenceCache.set(normalized, { exists: true, ts: Date.now() });
    }
    /**
     * Remove a path from the existence cache (after deletion).
     */
    removeFromExistenceCache(path) {
      const normalized = normalizePath2(path);
      this.existenceCache.delete(normalized);
      this.existenceCache.delete(ensureDirectoryPath(getParentPath(normalized)));
    }
    // -------------------------------------------------------------------------
    // Directory listing cache management
    // -------------------------------------------------------------------------
    /**
     * Debug helper: dump all cache state relevant to a given path.
     * Returns a compact string for logging.
     */
    dumpCacheState(path) {
      const normalized = normalizePath2(path);
      const parentPath = getParentPath(path);
      const parentDir = parentPath ? `/${parentPath}/` : "/";
      const parentKey = normalizePath2(parentDir);
      const exEntry = this.existenceCache.get(normalized);
      const exStr = exEntry ? `{exists=${exEntry.exists}, age=${Date.now() - exEntry.ts}ms}` : "MISS";
      const dirEntry = this.dirListingCache.get(parentKey);
      let dirStr;
      if (dirEntry) {
        const entryNames = [...dirEntry.entries.keys()];
        const baseName = getBasename(path);
        const hasFile = dirEntry.entries.has(baseName);
        dirStr = `{age=${Date.now() - dirEntry.ts}ms, ${entryNames.length} entries=[${entryNames.join(",")}], hasFile=${hasFile}}`;
      } else {
        dirStr = "MISS";
      }
      const exParent = this.existenceCache.get(parentKey);
      const exParentStr = exParent ? `{exists=${exParent.exists}, age=${Date.now() - exParent.ts}ms}` : "MISS";
      return `existenceCache[${normalized}]=${exStr} | dirListingCache[${parentKey}]=${dirStr} | existenceCache[${parentKey}]=${exParentStr}`;
    }
    /**
     * Get the cached directory listing for a directory path, or null if
     * not cached / expired. Does NOT make any network requests.
     *
     * ETag-based invalidation: a cached entry is considered stale only when its
     * directory ETag differs from `currentDirEtag` (when provided) — not on every
     * write. A long TTL acts as a fallback for servers that don't return ETags.
     */
    getCachedDirListing(dirPath) {
      const key = normalizePath2(dirPath);
      const cached = this.dirListingCache.get(key);
      if (!cached) {
        loggers.dir.log(`getCachedDirListing(${dirPath}) key=${key}: CACHE MISS (no entry)`);
        return null;
      }
      const age = Date.now() - cached.ts;
      const ttl = _RemoteStorageFileSystem2.DIR_LISTING_TTL;
      if (age >= ttl) {
        loggers.dir.log(`getCachedDirListing(${dirPath}) key=${key}: EXPIRED (age=${age}ms >= TTL=${ttl}ms, ts=${cached.ts}, now=${Date.now()}) \u2192 deleting cache entry, will trigger network fetch`);
        this.dirListingCache.delete(key);
        return null;
      }
      loggers.dir.log(`getCachedDirListing(${dirPath}) key=${key}: FRESH (age=${age}ms < TTL=${ttl}ms, ts=${cached.ts}, now=${Date.now()}) \u2192 returning ${cached.entries.size} entries`);
      return cached.entries;
    }
    /**
     * Get the age (in ms) of a cached directory listing, or `null` if the
     * directory is not cached / expired. Used by `stat()` to decide whether
     * a "file not in listing" result is trustworthy or needs a file GET probe.
     */
    getDirListingAge(dirPath) {
      const key = normalizePath2(dirPath);
      const cached = this.dirListingCache.get(key);
      if (!cached) return null;
      if (Date.now() - cached.ts >= _RemoteStorageFileSystem2.DIR_LISTING_TTL) {
        return null;
      }
      return Date.now() - cached.ts;
    }
    /**
     * Cache a directory listing result (with per-entry metadata) and the
     * directory's own ETag. Replaces any previous listing for this directory.
     */
    cacheDirListing(dirPath, entries2, dirEtag) {
      const key = normalizePath2(dirPath);
      const map2 = /* @__PURE__ */ new Map();
      for (const e of entries2) {
        map2.set(e.name, e);
      }
      this.dirListingCache.set(key, { etag: dirEtag, ts: Date.now(), entries: map2 });
      this.scheduleSave();
    }
    /**
     * Ensure a directory listing is in the cache, fetching from the network if
     * necessary. This is the single shared entry point used by readdir(),
     * stat(), and getRevision() to obtain directory entries.
     *
     * @param dirPath Directory path (with or without trailing slash)
     * @returns The cached entries map, or `null` if the directory doesn't exist (404)
     */
    async ensureDirListing(dirPath) {
      await this.ensureCacheLoaded();
      const normalized = normalizePath2(dirPath);
      if (!normalized && !this.config.basePath && this.syncRootPath !== "/") {
        loggers.dir.log(`ensureDirListing('${dirPath}') \u2192 redirect to syncRootPath '${this.syncRootPath}'`);
        return this.ensureDirListing(this.syncRootPath);
      }
      const cached = this.getCachedDirListing(dirPath);
      if (cached) {
        loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: cache HIT (${cached.size} entries)`);
        return cached;
      }
      const parentPath = getParentPath(normalized);
      if (parentPath) {
        const parentDir = `/${parentPath}/`;
        const parentListing = await this.ensureDirListing(parentDir);
        if (parentListing) {
          const baseName = getBasename(normalized);
          const entry = parentListing.get(baseName);
          if (entry && !entry.isDir) {
            loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: parent listing says "${baseName}" is a file (isDir=false), skipping fetch`);
            return null;
          }
          if (!entry) {
            loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: "${baseName}" not in parent listing, skipping fetch`);
            return null;
          }
          loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: parent listing confirms "${baseName}" is a directory, proceeding to fetch`);
        }
        if (parentListing === null) {
          loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: parent directory "${parentDir}" does not exist, skipping fetch`);
          return null;
        }
      }
      const dirUrl = this.buildUrl(ensureDirectoryPath(normalized));
      const previousEtag = this.getCachedDirEtag(normalized);
      loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: CACHE MISS (expired or not cached), fetching ${dirUrl} \u2014 previousEtag=${previousEtag ?? "null"}`);
      loggers.sync.log(`ensureDirListing NETWORK REQUEST: ${dirUrl} (dirPath=${dirPath}, previousEtag=${previousEtag ?? "null"})`);
      const response = await this.makeRequest(dirUrl, {
        method: "GET",
        headers: { "Accept": "application/ld+json" }
      });
      loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: network response status=${response.status} etag=${response.headers.get("ETag") ?? "null"}`);
      if (!response.ok) {
        if (response.status === 404) {
          loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: 404 \u2014 directory not found`);
          return null;
        }
        this.handleHttpError(response, normalized, "ensureDirListing");
      }
      const contentType = response.headers.get("content-type") || "";
      let entries2;
      if (contentType.includes("application/ld+json")) {
        const listing = await response.json();
        entries2 = [];
        if (listing["@graph"]) {
          for (const item of listing["@graph"]) {
            if (item["@id"] && item["@id"] !== "./") {
              const rawName = item["@id"];
              const isDir = rawName.endsWith("/");
              const name = rawName.replace(/\/$/, "");
              if (name) {
                entries2.push({
                  name,
                  isDir,
                  etag: item["ETag"] ?? item["etag"],
                  size: item["Content-Length"] != null ? Number(item["Content-Length"]) : void 0,
                  lastModified: item["Last-Modified"] ?? item["last-modified"]
                });
              }
            }
          }
        } else if (listing["items"] && typeof listing["items"] === "object") {
          for (const entryKey of Object.keys(listing["items"])) {
            if (entryKey && entryKey !== "./") {
              const isDir = entryKey.endsWith("/");
              const name = entryKey.replace(/\/$/, "");
              const item = listing["items"][entryKey];
              entries2.push({
                name,
                isDir,
                etag: item?.ETag ?? item?.etag,
                size: item?.["Content-Length"] != null ? Number(item["Content-Length"]) : void 0,
                lastModified: item?.["Last-Modified"] ?? item?.["last-modified"]
              });
            }
          }
        }
      } else {
        const html = await response.text();
        const names = this.parseHtmlDirectoryListing(html);
        entries2 = names.map((name) => ({ name, isDir: name.endsWith("/"), etag: void 0 }));
      }
      this.cacheDirListing(normalized, entries2, response.headers.get("ETag"));
      const result = this.getCachedDirListing(normalized);
      loggers.dir.log(`ensureDirListing(${dirPath}) backend=${this.backendName} scope=${this.backendScope}: fetched and cached ${entries2.length} entries (etag=${response.headers.get("ETag") ?? "null"})`);
      return result;
    }
    /**
     * Precisely patch a single child entry inside a parent directory's cached
     * listing — used after a local write/delete so siblings stay valid. This is
     * the ETag-based fine-grained invalidation (no whole-directory drop).
     */
    async patchDirListingEntry(parentDir, name, entry) {
      await this.ensureCacheLoaded();
      const key = normalizePath2(parentDir);
      const cached = this.dirListingCache.get(key);
      if (!cached) {
        loggers.dir.log(`patchDirListingEntry(${parentDir}, ${name}, ${entry ? "add" : "delete"}) backend=${this.backendName} scope=${this.backendScope}: dir NOT in cache, nothing to patch`);
        return;
      }
      if (entry === null) {
        const had = cached.entries.has(name);
        cached.entries.delete(name);
        loggers.dir.log(`patchDirListingEntry(${parentDir}, ${name}, DELETE) backend=${this.backendName} scope=${this.backendScope}: hadEntry=${had}, remaining entries=[${[...cached.entries.keys()].join(",")}], scheduling save`);
      } else {
        cached.entries.set(name, entry);
        loggers.dir.log(`patchDirListingEntry(${parentDir}, ${name}, ADD) backend=${this.backendName} scope=${this.backendScope}: entries now=[${[...cached.entries.keys()].join(",")}], scheduling save`);
      }
      cached.ts = Date.now();
      this.scheduleSave();
    }
    /**
     * Ensure the persisted cache has been loaded from storage at least once.
     * Memoized — the actual load runs a single time per instance.
     */
    ensureCacheLoaded() {
      if (!this.persistCache || !this.storage) return Promise.resolve();
      if (!this.loadPromise) {
        this.loadPromise = (async () => {
          try {
            const blob = await this.storage.load();
            const data = blob[this.cacheNamespace];
            if (data && typeof data === "object") {
              const parsed = data;
              loggers.cache.log(`backend=${this.backendName} scope=${this.backendScope} loading persisted dirListingCache from storage...`);
              const now = Date.now();
              for (const [k, v] of Object.entries(parsed)) {
                const m = /* @__PURE__ */ new Map();
                for (const [name, e] of Object.entries(v.entries)) {
                  m.set(name, e);
                }
                this.dirListingCache.set(k, { etag: v.etag, ts: v.ts, entries: m });
                const age = now - v.ts;
                loggers.cache.log(`restored dir=${k} entries=${m.size} names=[${[...m.keys()].join(",")}] originalAgeMs=${age} etag=${v.etag ?? "null"}`);
              }
              this.logger.logResult("cache", "load", `restored ${this.dirListingCache.size} dirs`);
              loggers.cache.log(`backend=${this.backendName} scope=${this.backendScope} total ${this.dirListingCache.size} dirs restored`);
            } else {
              loggers.cache.log(`backend=${this.backendName} scope=${this.backendScope} no persisted cache data found`);
            }
          } catch (err2) {
            this.logger.logResult("cache", "load", err2, false);
            loggers.cache.log(`backend=${this.backendName} scope=${this.backendScope} FAILED to load: ${err2}`);
          }
        })();
      }
      return this.loadPromise;
    }
    /**
     * Debounced persistence of the whole directory cache blob.
     */
    scheduleSave() {
      if (!this.persistCache || !this.storage) return;
      if (this.saveTimer) {
        loggers.cache.log(`scheduleSave backend=${this.backendName} scope=${this.backendScope}: timer already pending (debounce), skipping`);
        return;
      }
      loggers.cache.log(`scheduleSave backend=${this.backendName} scope=${this.backendScope}: scheduling flushSave in 500ms`);
      this.saveTimer = setTimeout(() => {
        this.saveTimer = null;
        void this.flushSave();
      }, 500);
    }
    /**
     * Immediately persist the directory cache, bypassing the debounce timer.
     * Used after deletions so that a page refresh cannot lose the cache update.
     */
    async flushSaveNow() {
      if (!this.persistCache || !this.storage) return;
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        loggers.cache.log(`flushSaveNow backend=${this.backendName} scope=${this.backendScope}: cancelled pending debounce timer`);
      }
      await this.flushSave();
    }
    async flushSave() {
      try {
        const blob = await this.storage.load();
        const out = {};
        for (const [k, v] of this.dirListingCache.entries()) {
          const entries2 = {};
          for (const [name, e] of v.entries.entries()) {
            entries2[name] = e;
          }
          out[k] = { etag: v.etag, ts: v.ts, entries: entries2 };
        }
        blob[this.cacheNamespace] = out;
        await this.storage.save(blob);
        const dirSummary = Object.entries(out).map(([k, v]) => `${k}:[${Object.keys(v.entries).join(",")}]`).join(" ");
        loggers.cache.log(`flushSave backend=${this.backendName} scope=${this.backendScope}: persisted ${this.dirListingCache.size} dirs \u2014 ${dirSummary}`);
        this.logger.logResult("cache", "save", `persisted ${this.dirListingCache.size} dirs`);
      } catch (err2) {
        loggers.cache.log(`flushSave backend=${this.backendName} scope=${this.backendScope}: FAILED: ${err2}`);
        this.logger.logResult("cache", "save", err2, false);
      }
    }
    /**
     * Clear the entire existence cache.
     */
    clearExistenceCache() {
      this.existenceCache.clear();
      this.dirListingCache.clear();
      this.scheduleSave();
    }
    // ===========================================================================
    // Precise mtime — .mtime sidecar file management
    // ===========================================================================
    /**
     * Write (or overwrite) the `.mtime` sidecar file for `filePath`.
     *
     * The sidecar stores `{ "mtime": <ms> }` and is invisible to upper layers
     * (filtered from readdir, excluded from sync).
     */
    async writeMtimeSidecar(filePath, mtime) {
      if (isMtimeSidecar(getBasename(filePath))) return;
      const sidecarPath = mtimePathFor(filePath);
      const sidecarUrl = this.buildUrl(sidecarPath);
      const body = JSON.stringify({ mtime });
      try {
        const headers = new Headers(this.headers);
        headers.set("Content-Type", "application/json");
        const response = await this.makeRequest(sidecarUrl, {
          method: "PUT",
          body,
          headers
        });
        if (!response.ok) {
          this.logger.logResult("writeMtimeSidecar", filePath, `status=${response.status}`, false);
        } else {
          const normalized = normalizePath2(filePath);
          this.mtimeCache.set(normalized, mtime);
          this.mtimeStore.set(normalized, mtime).catch(() => {
          });
          this.logger.logResult("writeMtimeSidecar", filePath, `mtime=${mtime}`);
        }
      } catch (error2) {
        this.logger.logResult("writeMtimeSidecar", filePath, error2, false);
      }
    }
    /**
     * Read the `.mtime` sidecar for `filePath` and return the precise mtime
     * in milliseconds, or `undefined` if the sidecar does not exist / cannot
     * be parsed.
     *
     * Checks in-memory cache first, then IndexedDB (for cross-session
     * persistence), then falls back to a network GET.
     */
    async readMtimeSidecar(filePath) {
      const normalized = normalizePath2(filePath);
      const cached = this.mtimeCache.get(normalized);
      if (cached !== void 0) {
        return cached;
      }
      const idbCached = await this.mtimeStore.get(normalized);
      if (idbCached !== void 0) {
        this.mtimeCache.set(normalized, idbCached);
        return idbCached;
      }
      const sidecarPath = mtimePathFor(filePath);
      const lastSlash = sidecarPath.lastIndexOf("/");
      const sidecarDir = lastSlash >= 0 ? sidecarPath.slice(0, lastSlash) : "";
      const sidecarName = lastSlash >= 0 ? sidecarPath.slice(lastSlash + 1) : sidecarPath;
      if (sidecarDir) {
        const dirEntries = this.getCachedDirListing(sidecarDir);
        if (dirEntries !== null && !dirEntries.has(sidecarName)) {
          return void 0;
        }
      }
      const sidecarUrl = this.buildUrl(sidecarPath);
      try {
        const response = await this.makeRequest(sidecarUrl, { method: "GET" });
        if (!response.ok) {
          return void 0;
        }
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (typeof parsed.mtime === "number") {
          this.mtimeCache.set(normalized, parsed.mtime);
          this.mtimeStore.set(normalized, parsed.mtime).catch(() => {
          });
          return parsed.mtime;
        }
        return void 0;
      } catch {
        return void 0;
      }
    }
    /**
     * Delete the `.mtime` sidecar for `filePath`. Called from `unlink()`.
     * Failure is non-fatal — a stale sidecar just means stat() will return
     * the server's Last-Modified instead.
     */
    async deleteMtimeSidecar(filePath) {
      const sidecarPath = mtimePathFor(filePath);
      const normalized = normalizePath2(filePath);
      const lastSlash = sidecarPath.lastIndexOf("/");
      const sidecarDir = lastSlash >= 0 ? sidecarPath.slice(0, lastSlash) : "";
      const sidecarName = lastSlash >= 0 ? sidecarPath.slice(lastSlash + 1) : sidecarPath;
      if (sidecarDir) {
        const dirEntries = this.getCachedDirListing(sidecarDir);
        if (dirEntries !== null && !dirEntries.has(sidecarName)) {
          this.mtimeCache.delete(normalized);
          this.mtimeStore.delete(normalized).catch(() => {
          });
          this.logger.logResult("deleteMtimeSidecar", filePath, "skipped (not in dir listing)");
          return;
        }
      }
      const memCached = this.mtimeCache.get(normalized);
      const idbCached = await this.mtimeStore.get(normalized);
      if (memCached === void 0 && idbCached === void 0) {
        if (sidecarDir) {
          this.mtimeCache.delete(normalized);
          this.mtimeStore.delete(normalized).catch(() => {
          });
          this.logger.logResult("deleteMtimeSidecar", filePath, "skipped (no cache, dir listing unavailable)");
          return;
        }
      }
      const sidecarUrl = this.buildUrl(sidecarPath);
      try {
        const response = await this.makeRequest(sidecarUrl, { method: "DELETE" });
        if (response.ok || response.status === 404) {
          this.mtimeCache.delete(normalized);
          this.mtimeStore.delete(normalized).catch(() => {
          });
          this.logger.logResult("deleteMtimeSidecar", filePath, "OK");
        }
      } catch {
      }
    }
    // ===========================================================================
    // Snapshot — ETag baseline for shouldSync()
    // ===========================================================================
    /**
     * Implement `zen-fs-sync`'s `SyncableFS.shouldSync()` interface.
     *
     * Compares the in-memory ETag baseline (snapshot) with the actual remote
     * state. Returns `true` when remote changes are detected (or on first call
     * when no baseline exists). The snapshot is rebuilt as a side effect.
     *
     * On first call, attempts to restore the snapshot from IndexedDB. If the
     * persisted rootEtag still matches the remote root, returns `false` —
     * skipping the expensive full tree walk.
     */
    async shouldSync() {
      loggers.sync.log(`shouldSync() called (snapshot=${this.snapshot === null ? "null" : `${this.snapshot.size} entries`}, rootEtag=${this.rootEtag ?? "null"})`);
      this.logger.log("shouldSync", "(snapshot check)");
      if (this.snapshot === null) {
        await this.loadSnapshotFromIDB();
        const snap = this.snapshot;
        loggers.sync.log(`shouldSync: after IDB restore \u2192 snapshot=${snap === null ? "null" : `${snap.size} entries`}, rootEtag=${this.rootEtag ?? "null"}`);
        if (this.snapshot !== null && this.rootEtag !== null) {
          loggers.sync.log(`shouldSync: snapshot restored, fetching current root ETag to compare with stored rootEtag='${this.rootEtag}'`);
          const currentRootEtag2 = await this.fetchRootEtag();
          loggers.sync.log(`shouldSync: currentRootEtag='${currentRootEtag2 ?? "null"}' vs stored rootEtag='${this.rootEtag}' \u2192 ${currentRootEtag2 === this.rootEtag ? "SAME (no sync)" : "DIFFERENT (will sync)"}`);
          if (currentRootEtag2 !== null && currentRootEtag2 === this.rootEtag) {
            this.logger.logResult("shouldSync", "", "false (snapshot restored from IDB, root ETag unchanged)");
            return false;
          }
          await this.buildSnapshot();
          this.logger.logResult("shouldSync", "", "true (snapshot restored but root ETag changed)");
          return true;
        }
        loggers.sync.log(`shouldSync: no persisted snapshot, building from scratch`);
        await this.buildSnapshot();
        this.logger.logResult("shouldSync", "", "true (first call, baseline built)");
        return true;
      }
      loggers.sync.log(`shouldSync: existing snapshot (${this.snapshot.size} entries), fetching current root ETag...`);
      const currentRootEtag = await this.fetchRootEtag();
      if (currentRootEtag === null) {
        loggers.sync.log(`shouldSync: currentRootEtag=null (unavailable) \u2192 returning true (sync)`);
        this.logger.logResult("shouldSync", "", "true (root ETag unavailable)");
        return true;
      }
      loggers.sync.log(`shouldSync: currentRootEtag='${currentRootEtag}' vs stored rootEtag='${this.rootEtag}' \u2192 ${currentRootEtag === this.rootEtag ? "SAME (no sync)" : "DIFFERENT (will sync)"}`);
      if (currentRootEtag === this.rootEtag) {
        this.logger.logResult("shouldSync", "", "false (root ETag unchanged)");
        return false;
      }
      loggers.sync.log(`shouldSync: root ETag changed, rebuilding snapshot...`);
      await this.buildSnapshot();
      this.logger.logResult("shouldSync", "", "true (root ETag changed)");
      return true;
    }
    /**
     * Fetch the sync-baseline folder's ETag via a GET request.
     * Returns `null` if the request fails or no ETag is present.
     *
     * We probe `syncRootPath` (default 'app_data/') instead of the account root,
     * because a RemoteStorage Bearer token is scoped to the modules declared via
     * claimAccess(); the account root (e.g. `/username/`) is NOT in any scope and
     * returns 401. Probing an authorized module root keeps the request inside the
     * token's scope while still serving as a reliable "did anything change?" check.
     */
    async fetchRootEtag() {
      loggers.sync.log(`fetchRootEtag() called for syncRootPath='${this.syncRootPath}'`);
      const cacheKey = normalizePath2(this.syncRootPath);
      const preCached = this.dirListingCache.get(cacheKey);
      if (preCached) {
        const age = Date.now() - preCached.ts;
        const expired = age >= _RemoteStorageFileSystem2.DIR_LISTING_TTL;
        loggers.sync.log(`fetchRootEtag: cache BEFORE ensureDirListing \u2192 key=${cacheKey} age=${age}ms TTL=${_RemoteStorageFileSystem2.DIR_LISTING_TTL}ms expired=${expired} etag=${preCached.etag ?? "null"}`);
      } else {
        loggers.sync.log(`fetchRootEtag: cache BEFORE ensureDirListing \u2192 key=${cacheKey} NOT IN CACHE (will trigger network fetch)`);
      }
      try {
        await this.ensureDirListing(this.syncRootPath);
        const etag = this.getCachedDirEtag(this.syncRootPath);
        const postCached = this.dirListingCache.get(cacheKey);
        if (postCached && preCached) {
          const wasRefreshed = postCached.ts !== preCached.ts;
          loggers.sync.log(`fetchRootEtag: cache AFTER ensureDirListing \u2192 ts_changed=${wasRefreshed} (pre=${preCached.ts} post=${postCached.ts}) \u2192 ${wasRefreshed ? "NETWORK FETCH occurred" : "CACHE HIT (no network request)"}`);
        }
        loggers.sync.log(`fetchRootEtag: returning etag=${etag ?? "null"}`);
        return etag;
      } catch (e) {
        loggers.sync.log(`fetchRootEtag: FAILED: ${e}`);
        this.logger.log("fetchRootEtag", this.syncRootPath, { error: String(e) });
        return null;
      }
    }
    /**
     * Build (or rebuild) the in-memory snapshot by walking the remote folder
     * tree and recording ETags for every document and folder.
     *
     * Uses subtree pruning: if a subfolder's ETag hasn't changed since the
     * previous snapshot, its subtree is skipped entirely.
     *
     * After building, persists the snapshot and rootEtag to IndexedDB so that
     * the next session can skip the full tree walk if the root ETag is unchanged.
     */
    async buildSnapshot() {
      this.logger.log("buildSnapshot", "(building ETag baseline)");
      const previousSnapshot = this.snapshot;
      const previousRootEtag = this.rootEtag;
      this.snapshot = /* @__PURE__ */ new Map();
      const rootEtag = await this.fetchRootEtag();
      this.rootEtag = rootEtag;
      await this.buildSnapshotRecursive(this.syncRootPath, previousSnapshot);
      this.logger.logResult("buildSnapshot", "", `entries=${this.snapshot.size}`);
      this.persistSnapshotToIDB();
    }
    /**
     * Load the ETag snapshot and rootEtag from IndexedDB into memory.
     * Called once on the first shouldSync() call to enable a warm start.
     * Sets `snapshotLoaded` to true regardless of whether data was found.
     */
    async loadSnapshotFromIDB() {
      if (this.snapshotLoaded) return;
      this.snapshotLoaded = true;
      try {
        const [entries2, rootEtag] = await Promise.all([
          this.snapshotStore.entries(),
          this.snapshotStore.get("__rootEtag__")
        ]);
        if (entries2.length > 0) {
          this.snapshot = /* @__PURE__ */ new Map();
          for (const [path, etag] of entries2) {
            if (path !== "__rootEtag__") {
              this.snapshot.set(path, etag);
            }
          }
          this.rootEtag = rootEtag ?? null;
          this.logger.logResult("shouldSync", "", `restored snapshot from IDB: ${this.snapshot.size} entries, rootEtag=${this.rootEtag}`);
        }
      } catch {
      }
    }
    /**
     * Persist the current snapshot and rootEtag to IndexedDB (fire-and-forget).
     * Called after buildSnapshot() and updateSnapshotForPath().
     */
    persistSnapshotToIDB() {
      if (this.snapshot === null) return;
      const entries2 = [["__rootEtag__", this.rootEtag ?? ""]];
      for (const [path, etag] of this.snapshot) {
        entries2.push([path, etag]);
      }
      this.snapshotStore.setMany(entries2).catch(() => {
      });
    }
    /**
     * Recursive helper for `buildSnapshot()`. Walks a folder, stores ETags for
     * all items, and prunes subtrees whose ETag is unchanged from the previous
     * snapshot.
     */
    async buildSnapshotRecursive(dirPath, previousSnapshot) {
      const dirUrl = this.buildUrl(ensureDirectoryPath(dirPath));
      try {
        const response = await this.makeRequest(dirUrl, {
          method: "GET",
          headers: { Accept: "application/ld+json" }
        });
        if (!response.ok) {
          return;
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/ld+json")) {
          return;
        }
        const listing = await response.json();
        const items = [];
        if (listing["@graph"]) {
          for (const item of listing["@graph"]) {
            if (item["@id"] && item["@id"] !== "./") {
              const rawName = item["@id"];
              const isDir = rawName.endsWith("/");
              const name = isDir ? rawName.slice(0, -1) : rawName;
              if (name) {
                items.push({ name, etag: item["ETag"] ?? item["etag"], isDir });
              }
            }
          }
        } else if (listing["items"] && typeof listing["items"] === "object") {
          for (const entryKey of Object.keys(listing["items"])) {
            if (entryKey && entryKey !== "./") {
              const isDir = entryKey.endsWith("/");
              const name = isDir ? entryKey.slice(0, -1) : entryKey;
              const item = listing["items"][entryKey];
              if (name) {
                items.push({ name, etag: item?.ETag ?? item?.etag, isDir });
              }
            }
          }
        }
        const itemNames = new Set(items.map((i) => i.name));
        for (const item of items) {
          const itemPath = dirPath === "/" ? item.name : `${dirPath}/${item.name}`;
          if (isMetadataSidecarToDelete(item.name)) {
            loggers.dir.log(`deleting stale dotfile: ${itemPath}`);
            void this.unlink(itemPath).catch(() => {
            });
            continue;
          }
          if (isMtimeSidecar(item.name)) {
            const dataName = sidecarToDataPath(item.name);
            const orphaned = item.name.endsWith(".mtime.mtime") || !dataName || !itemNames.has(dataName);
            if (orphaned) {
              loggers.dir.log(`pruning orphaned mtime sidecar: ${itemPath}`);
              void this.unlink(itemPath).catch(() => {
              });
            }
            continue;
          }
          if (item.etag) {
            this.snapshot.set(itemPath, item.etag);
          }
          if (item.isDir) {
            const prevEtag = previousSnapshot?.get(itemPath);
            if (prevEtag && item.etag && prevEtag === item.etag) {
              const prefix = itemPath + "/";
              for (const [prevPath, prevVal] of previousSnapshot) {
                if (prevPath.startsWith(prefix) || prevPath === itemPath) {
                  this.snapshot.set(prevPath, prevVal);
                }
              }
              continue;
            }
            await this.buildSnapshotRecursive(itemPath, previousSnapshot);
          }
        }
      } catch {
      }
    }
    /**
     * Update the in-memory snapshot after a local write or delete.
     * Called internally by `writeFile()` and `unlink()`.
     *
     * Persists the change to IndexedDB so the snapshot stays consistent across
     * page reloads.
     */
    updateSnapshotForPath(path, etag) {
      if (this.snapshot === null) {
        return;
      }
      const normalized = normalizePath2(path);
      if (etag === null) {
        this.snapshot.delete(normalized);
        this.snapshotStore.delete(normalized).catch(() => {
        });
      } else {
        this.snapshot.set(normalized, etag);
        this.snapshotStore.set(normalized, etag).catch(() => {
        });
      }
      this.rootEtag = null;
      this.snapshotStore.set("__rootEtag__", "").catch(() => {
      });
    }
  };
  _RemoteStorageFileSystem.NEGATIVE_CACHE_TTL = 6e4;
  _RemoteStorageFileSystem.POSITIVE_CACHE_TTL = 3e5;
  _RemoteStorageFileSystem.DIR_LISTING_TTL = 3e5;
  _RemoteStorageFileSystem.EMPTY_DIR = {
    name: "",
    isDir: true,
    etag: null,
    size: 0,
    lastModified: void 0
  };
  var RemoteStorageFileSystem = _RemoteStorageFileSystem;

  // scripts/_rs-client-entry.js
  globalThis.ZenRSClient = { RemoteStorageFileSystem };
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)

@zenfs/core/dist/index.js:
  (*!
   * @zenfs/core — https://npmjs.com/package/@zenfs/core
   * Copyright © James Prevett and other ZenFS contributors.
   * SPDX-License-Identifier: LGPL-3.0-or-later
   *)
*/
