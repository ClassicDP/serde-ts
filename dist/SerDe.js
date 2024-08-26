"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerDe = void 0;
// Function to check if a given function is a class constructor
function isClass(func) {
    return typeof func === 'function' && /^\s*class\s+/.test(func.toString());
}
class SerDe {
    // Method to handle simple types directly
    static fromSimple(obj) {
        if (obj instanceof Date || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        return undefined;
    }
    // Method to set exclusive classes for serialization
    static setExclusively(list) {
        SerDe.only = new Set([...list, Array, Map, Set]);
    }
    // Main serialization method
    static serialise(obj, visited = new Map(), _map = new Map(), depth = 0, parent) {
        var _a, _b, _c, _d, _e;
        if (typeof obj === 'undefined' || obj === null)
            return obj;
        // If the object is a class and is not in the exclusive list, skip serialization
        if (((_a = SerDe.only) === null || _a === void 0 ? void 0 : _a.size) && isClass(obj === null || obj === void 0 ? void 0 : obj.constructor) && !SerDe.only.has(obj.constructor))
            return undefined;
        if (obj instanceof Date)
            return { t: 'Date', v: obj.valueOf() };
        let maybeSimple = SerDe.fromSimple(obj);
        if (maybeSimple !== undefined)
            return maybeSimple;
        if (visited.has(obj)) {
            visited.get(obj).times++;
            return { t: (_b = obj === null || obj === void 0 ? void 0 : obj.constructor) === null || _b === void 0 ? void 0 : _b.name, v: { _mapId: SerDe.weakMap.get(obj) } };
        }
        if (obj instanceof Function)
            return { t: 'function', v: obj.name };
        if (parent)
            visited.set(obj, { times: 1, parent });
        let id = (_c = SerDe.weakMap.get(obj)) !== null && _c !== void 0 ? _c : SerDe.id++;
        SerDe.weakMap.set(obj, id);
        // Handle Map objects
        if (obj instanceof Map) {
            let serialised = new Array(obj.size);
            _map.set(id, serialised);
            let i = 0;
            obj.forEach((value, key) => {
                serialised[i] = [
                    SerDe.serialise(key, visited, _map, depth + 1, { obj: serialised, key: [i, 0] }),
                    SerDe.serialise(value, visited, _map, depth + 1, { obj: serialised, key: [i, 1] }),
                ];
                i++;
            });
            return { t: obj.constructor.name, v: serialised };
        }
        // Handle Set and Array objects
        if (obj instanceof Set || obj instanceof Array) {
            let serialised = Array(obj instanceof Set ? obj.size : obj.length);
            _map.set(id, serialised);
            let i = 0;
            obj.forEach((value) => {
                serialised[i] = SerDe.serialise(value, visited, _map, depth + 1, { obj: serialised, key: i });
                i++;
            });
            return { t: obj.constructor.name, v: serialised };
        }
        // Handle generic objects
        let serialised = {};
        _map.set(id, serialised);
        for (let [key, value] of Object.entries(obj)) {
            serialised[key] = SerDe.serialise(value, visited, _map, depth + 1, { obj: serialised, key });
        }
        // If we are at the top level, handle circular references and multiple instances
        if (depth === 0) {
            let recursionVisited = Array.from(visited)
                .filter(([_, val]) => val.times > 1)
                .map(([obj, val]) => [SerDe.weakMap.get(obj), val]); // Explicitly cast id to number
            recursionVisited.forEach(([id, val]) => {
                if (val.parent.key instanceof Array) {
                    ;
                    val.parent.obj[val.parent.key[0]][val.parent.key[1]].v = { _mapId: id };
                }
                else {
                    ;
                    val.parent.obj[val.parent.key].v = { _mapId: id };
                }
            });
            // Attach the _map for serialization result
            return { t: (_d = obj === null || obj === void 0 ? void 0 : obj.constructor) === null || _d === void 0 ? void 0 : _d.name, v: serialised, _map: recursionVisited.map((x) => [x[0], _map.get(x[0])]) };
        }
        return { t: (_e = obj === null || obj === void 0 ? void 0 : obj.constructor) === null || _e === void 0 ? void 0 : _e.name, v: serialised };
    }
    // Main deserialization method
    static deserialize(obj) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (obj === undefined || obj === null)
            return obj;
        if ((obj === null || obj === void 0 ? void 0 : obj.t) === 'Date')
            return new Date(obj.v);
        // If obj is a primitive, return it directly (with Date handling)
        if (SerDe.isPrimitive(obj)) {
            return obj instanceof Date ? new Date(obj) : obj;
        }
        if (obj.t === 'function')
            return (_a = SerDe.classRegistry.get(obj.v)) !== null && _a !== void 0 ? _a : {};
        // Handles the restoration of _map for object references if it exists
        if (obj._map) {
            SerDe._map = new Map(obj._map);
            SerDe._tempMap = new Map();
        }
        // Retrieve the class constructor if available
        const classConstructor = SerDe.classRegistry.get(obj.t);
        let instance;
        if (((_b = obj.v) === null || _b === void 0 ? void 0 : _b._mapId) && ((_c = SerDe._tempMap) === null || _c === void 0 ? void 0 : _c.has(obj.v._mapId))) {
            return (_d = SerDe._tempMap) === null || _d === void 0 ? void 0 : _d.get(obj.v._mapId);
        }
        else {
            instance = classConstructor ? Object.create(classConstructor.prototype) : {};
            (_e = SerDe._tempMap) === null || _e === void 0 ? void 0 : _e.set(obj.v._mapId, instance);
        }
        let nested = (_h = (_f = SerDe._map) === null || _f === void 0 ? void 0 : _f.get((_g = obj.v) === null || _g === void 0 ? void 0 : _g._mapId)) !== null && _h !== void 0 ? _h : obj.v;
        // Deserialize based on the type of object
        switch (obj.t) {
            case 'Array': // Handle arrays
                instance = nested.map((item) => SerDe.deserialize(item));
                (_j = SerDe._tempMap) === null || _j === void 0 ? void 0 : _j.set(obj.v._mapId, instance);
                return instance;
            case 'Map': // Handle maps
                instance = new Map(nested.map(([key, value]) => [SerDe.deserialize(key), SerDe.deserialize(value)]));
                (_k = SerDe._tempMap) === null || _k === void 0 ? void 0 : _k.set(obj.v._mapId, instance);
                return instance;
            case 'Set': // Handle sets
                instance = new Set(nested.map((item) => SerDe.deserialize(item)));
                (_l = SerDe._tempMap) === null || _l === void 0 ? void 0 : _l.set(obj.v._mapId, instance);
                return instance;
            default: // Handle objects
                for (const [key, value] of Object.entries(nested)) {
                    instance[key] = SerDe.deserialize(value);
                }
                if (classConstructor && SerDe.initFuncName && typeof instance[SerDe.initFuncName] === 'function') {
                    instance[SerDe.initFuncName]();
                }
        }
        // Clear the _map after deserialization is complete to free memory
        if (obj._map) {
            SerDe._map = undefined;
            SerDe._tempMap = undefined;
        }
        return instance; // Return the deserialized instance
    }
    // Method to register classes for deserialization
    static classRegistration(classes) {
        classes.forEach((x) => SerDe.classRegistry.set(x.name, x));
    }
    // Helper method to check if a value is primitive
    static isPrimitive(value) {
        return (value === null ||
            ['number', 'string', 'boolean', 'undefined', 'symbol', 'bigint'].includes(typeof value) ||
            value instanceof Date);
    }
}
exports.SerDe = SerDe;
SerDe.initFuncName = '_initFn'; // Name of the initialization function (if exists)
SerDe.id = 0; // Unique ID counter for objects
SerDe.weakMap = new WeakMap(); // WeakMap to track objects during serialization
SerDe.classRegistry = new Map([
    ['Array', Array],
    ['Set', Set],
    ['Map', Map],
]); // Registry of classes for deserialization
