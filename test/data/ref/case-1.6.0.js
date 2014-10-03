/*squiggle patches= disable-oop,no-global functions= each,map,keys,has,pick,defaults,extend,isFunction,isObject
*/
(function() {
    var root = this;
    root._;
    var breaker = {}, ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype, slice = (ArrayProto.push, 
    ArrayProto.slice), concat = ArrayProto.concat, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty, nativeForEach = ArrayProto.forEach, nativeMap = ArrayProto.map, nativeKeys = (ArrayProto.reduce, 
    ArrayProto.reduceRight, ArrayProto.filter, ArrayProto.every, ArrayProto.some, ArrayProto.indexOf, 
    ArrayProto.lastIndexOf, Array.isArray, Object.keys);
    FuncProto.bind;
    var _ = function(obj) {
        return obj instanceof _ ? obj : this instanceof _ ? (this._wrapped = obj, void 0) : new _(obj);
    };
    _.VERSION = "1.6.0";
    var each = _.each = function(obj, iterator, context) {
        if (null == obj) return obj;
        if (nativeForEach && obj.forEach === nativeForEach) obj.forEach(iterator, context); else if (obj.length === +obj.length) {
            for (var i = 0, length = obj.length; length > i; i++) if (iterator.call(context, obj[i], i, obj) === breaker) return;
        } else for (var keys = _.keys(obj), i = 0, length = keys.length; length > i; i++) if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
        return obj;
    };
    _.map = function(obj, iterator, context) {
        var results = [];
        return null == obj ? results : nativeMap && obj.map === nativeMap ? obj.map(iterator, context) : (each(obj, function(value, index, list) {
            results.push(iterator.call(context, value, index, list));
        }), results);
    }, _.keys = function(obj) {
        if (!_.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj) _.has(obj, key) && keys.push(key);
        return keys;
    }, _.extend = function(obj) {
        return each(slice.call(arguments, 1), function(source) {
            if (source) for (var prop in source) obj[prop] = source[prop];
        }), obj;
    }, _.pick = function(obj) {
        var copy = {}, keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        return each(keys, function(key) {
            key in obj && (copy[key] = obj[key]);
        }), copy;
    }, _.defaults = function(obj) {
        return each(slice.call(arguments, 1), function(source) {
            if (source) for (var prop in source) void 0 === obj[prop] && (obj[prop] = source[prop]);
        }), obj;
    }, _.isObject = function(obj) {
        return obj === Object(obj);
    }, each([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(name) {
        _["is" + name] = function(obj) {
            return toString.call(obj) == "[object " + name + "]";
        };
    }), _.isArguments(arguments) || (_.isArguments = function(obj) {
        return !(!obj || !_.has(obj, "callee"));
    }), "function" != typeof /./ && (_.isFunction = function(obj) {
        return "function" == typeof obj;
    }), _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };
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
    }), "function" == typeof define && define.amd && define("underscore", [], function() {
        return _;
    });
}).call(this);
