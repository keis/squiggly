/*squiggle patches=  functions= each,invert,keys,isObject,mixin,functions
*/
(function() {
    var root = this;
    root._;
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype, push = ArrayProto.push, toString = (ArrayProto.slice, 
    ArrayProto.concat, ObjProto.toString);
    ObjProto.hasOwnProperty;
    var nativeKeys = (Array.isArray, Object.keys);
    FuncProto.bind;
    var _ = function(obj) {
        return obj instanceof _ ? obj : this instanceof _ ? (this._wrapped = obj, void 0) : new _(obj);
    };
    "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = _), 
    exports._ = _) : root._ = _, _.VERSION = "1.7.0";
    var createCallback = function(func, context, argCount) {
        if (void 0 === context) return func;
        switch (null == argCount ? 3 : argCount) {
          case 1:
            return function(value) {
                return func.call(context, value);
            };

          case 2:
            return function(value, other) {
                return func.call(context, value, other);
            };

          case 3:
            return function(value, index, collection) {
                return func.call(context, value, index, collection);
            };

          case 4:
            return function(accumulator, value, index, collection) {
                return func.call(context, accumulator, value, index, collection);
            };
        }
        return function() {
            return func.apply(context, arguments);
        };
    };
    _.each = function(obj, iteratee, context) {
        if (null == obj) return obj;
        iteratee = createCallback(iteratee, context);
        var i, length = obj.length;
        if (length === +length) for (i = 0; length > i; i++) iteratee(obj[i], i, obj); else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; length > i; i++) iteratee(obj[keys[i]], keys[i], obj);
        }
        return obj;
    }, _.keys = function(obj) {
        if (!_.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj) _.has(obj, key) && keys.push(key);
        return keys;
    }, _.invert = function(obj) {
        for (var result = {}, keys = _.keys(obj), i = 0, length = keys.length; length > i; i++) result[obj[keys[i]]] = keys[i];
        return result;
    }, _.functions = function(obj) {
        var names = [];
        for (var key in obj) _.isFunction(obj[key]) && names.push(key);
        return names.sort();
    }, _.isObject = function(obj) {
        var type = typeof obj;
        return "function" === type || "object" === type && !!obj;
    }, _.each([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(name) {
        _["is" + name] = function(obj) {
            return toString.call(obj) === "[object " + name + "]";
        };
    }), _.isArguments(arguments) || (_.isArguments = function(obj) {
        return _.has(obj, "callee");
    }), "function" != typeof /./ && (_.isFunction = function(obj) {
        return "function" == typeof obj || !1;
    });
    var escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
    };
    _.invert(escapeMap);
    var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
    };
    _.mixin = function(obj) {
        _.each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
                var args = [ this._wrapped ];
                return push.apply(args, arguments), result.call(this, func.apply(_, args));
            };
        });
    }, _.mixin(_), _.each([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            var obj = this._wrapped;
            return method.apply(obj, arguments), "shift" !== name && "splice" !== name || 0 !== obj.length || delete obj[0], 
            result.call(this, obj);
        };
    }), _.each([ "concat", "join", "slice" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            return result.call(this, method.apply(this._wrapped, arguments));
        };
    }), "function" == typeof define && define.amd && define("underscore", [], function() {
        return _;
    });
}).call(this);
