/*squiggle patches=  functions= each,invert,keys,isObject,mixin,functions
*/
(function() {
    function collectNonEnumProps(obj, keys) {
        var nonEnumIdx = nonEnumerableProps.length, constructor = obj.constructor, proto = _.isFunction(constructor) && constructor.prototype || ObjProto, prop = "constructor";
        for (_.has(obj, prop) && !_.contains(keys, prop) && keys.push(prop); nonEnumIdx--; ) prop = nonEnumerableProps[nonEnumIdx], 
        prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop) && keys.push(prop);
    }
    var root = this, ArrayProto = (root._, Array.prototype), ObjProto = Object.prototype, FuncProto = Function.prototype, push = ArrayProto.push, toString = (ArrayProto.slice, 
    ObjProto.toString), nativeKeys = (ObjProto.hasOwnProperty, Array.isArray, Object.keys), _ = (FuncProto.bind, 
    Object.create, function(obj) {
        return obj instanceof _ ? obj : this instanceof _ ? void (this._wrapped = obj) : new _(obj);
    });
    "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = _), 
    exports._ = _) : root._ = _, _.VERSION = "1.8.3";
    var optimizeCb = function(func, context, argCount) {
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
    }, property = function(key) {
        return function(obj) {
            return null == obj ? void 0 : obj[key];
        };
    }, MAX_ARRAY_INDEX = Math.pow(2, 53) - 1, getLength = property("length"), isArrayLike = function(collection) {
        var length = getLength(collection);
        return "number" == typeof length && length >= 0 && MAX_ARRAY_INDEX >= length;
    };
    _.each = function(obj, iteratee, context) {
        iteratee = optimizeCb(iteratee, context);
        var i, length;
        if (isArrayLike(obj)) for (i = 0, length = obj.length; length > i; i++) iteratee(obj[i], i, obj); else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; length > i; i++) iteratee(obj[keys[i]], keys[i], obj);
        }
        return obj;
    };
    var hasEnumBug = !{
        toString: null
    }.propertyIsEnumerable("toString"), nonEnumerableProps = [ "valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString" ];
    _.keys = function(obj) {
        if (!_.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj) _.has(obj, key) && keys.push(key);
        return hasEnumBug && collectNonEnumProps(obj, keys), keys;
    }, _.invert = function(obj) {
        for (var result = {}, keys = _.keys(obj), i = 0, length = keys.length; length > i; i++) result[obj[keys[i]]] = keys[i];
        return result;
    }, _.functions = function(obj) {
        var names = [];
        for (var key in obj) _.isFunction(obj[key]) && names.push(key);
        return names.sort();
    };
    _.isObject = function(obj) {
        var type = typeof obj;
        return "function" === type || "object" === type && !!obj;
    }, _.each([ "Arguments", "Function", "String", "Number", "Date", "RegExp", "Error" ], function(name) {
        _["is" + name] = function(obj) {
            return toString.call(obj) === "[object " + name + "]";
        };
    }), _.isArguments(arguments) || (_.isArguments = function(obj) {
        return _.has(obj, "callee");
    }), "function" != typeof /./ && "object" != typeof Int8Array && (_.isFunction = function(obj) {
        return "function" == typeof obj || !1;
    });
    var escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
    }, result = (_.invert(escapeMap), function(instance, obj) {
        return instance._chain ? _(obj).chain() : obj;
    });
    _.mixin = function(obj) {
        _.each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
                var args = [ this._wrapped ];
                return push.apply(args, arguments), result(this, func.apply(_, args));
            };
        });
    }, _.mixin(_), _.each([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            var obj = this._wrapped;
            return method.apply(obj, arguments), "shift" !== name && "splice" !== name || 0 !== obj.length || delete obj[0], 
            result(this, obj);
        };
    }), _.each([ "concat", "join", "slice" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            return result(this, method.apply(this._wrapped, arguments));
        };
    }), "function" == typeof define && define.amd && define("underscore", [], function() {
        return _;
    });
}).call(this);
