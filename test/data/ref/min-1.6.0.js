/*squiggle patches=  functions= each,invert,keys,isObject,mixin,extend,functions
*/
(function() {
    var root = this, breaker = (root._, {}), ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype, push = ArrayProto.push, slice = ArrayProto.slice, toString = (ArrayProto.concat, 
    ObjProto.toString), nativeForEach = (ObjProto.hasOwnProperty, ArrayProto.forEach), nativeKeys = (ArrayProto.map, 
    ArrayProto.reduce, ArrayProto.reduceRight, ArrayProto.filter, ArrayProto.every, 
    ArrayProto.some, ArrayProto.indexOf, ArrayProto.lastIndexOf, Array.isArray, Object.keys), _ = (FuncProto.bind, 
    function(obj) {
        return obj instanceof _ ? obj : this instanceof _ ? void (this._wrapped = obj) : new _(obj);
    });
    "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = _), 
    exports._ = _) : root._ = _, _.VERSION = "1.6.0";
    var each = _.each = function(obj, iterator, context) {
        if (null == obj) return obj;
        if (nativeForEach && obj.forEach === nativeForEach) obj.forEach(iterator, context); else if (obj.length === +obj.length) {
            for (var i = 0, length = obj.length; length > i; i++) if (iterator.call(context, obj[i], i, obj) === breaker) return;
        } else for (var keys = _.keys(obj), i = 0, length = keys.length; length > i; i++) if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
        return obj;
    };
    _.keys = function(obj) {
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
    }, _.extend = function(obj) {
        return each(slice.call(arguments, 1), function(source) {
            if (source) for (var prop in source) obj[prop] = source[prop];
        }), obj;
    };
    _.isObject = function(obj) {
        return obj === Object(obj);
    }, each([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(name) {
        _["is" + name] = function(obj) {
            return toString.call(obj) == "[object " + name + "]";
        };
    }), _.isArguments(arguments) || (_.isArguments = function(obj) {
        return !(!obj || !_.has(obj, "callee"));
    }), "function" != typeof /./ && (_.isFunction = function(obj) {
        return "function" == typeof obj;
    });
    var entityMap = {
        escape: {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;"
        }
    }, entityRegexes = {
        escape: new RegExp("[" + _.keys(entityMap.escape).join("") + "]", "g"),
        unescape: new RegExp("(" + _.keys(entityMap.unescape).join("|") + ")", "g")
    };
    _.each([ "escape", "unescape" ], function(method) {
        _[method] = function(string) {
            return null == string ? "" : ("" + string).replace(entityRegexes[method], function(match) {
                return entityMap[method][match];
            });
        };
    }), _.mixin = function(obj) {
        each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
                var args = [ this._wrapped ];
                return push.apply(args, arguments), result.call(this, func.apply(_, args));
            };
        });
    };
    var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
    };
    _.mixin(_), each([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            var obj = this._wrapped;
            return method.apply(obj, arguments), "shift" != name && "splice" != name || 0 !== obj.length || delete obj[0], 
            result.call(this, obj);
        };
    }), each([ "concat", "join", "slice" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            return result.call(this, method.apply(this._wrapped, arguments));
        };
    }), _.extend(_.prototype, {
        chain: function() {
            return this._chain = !0, this;
        },
        value: function() {
            return this._wrapped;
        }
    }), "function" == typeof define && define.amd && define("underscore", [], function() {
        return _;
    });
}).call(this);
