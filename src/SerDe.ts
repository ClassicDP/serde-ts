export type Class<T = unknown, Arguments extends any[] = any[]> = new (...arguments_: Arguments) => T;

// Primitive types that will be handled directly during serialization
type Primitive = number | string | boolean | undefined | symbol | bigint | Date;

// Parent interface used to track the serialization context
type Parent = {
    obj: object;
    key: string | number | [number, number];
}

// Function to check if a given function is a class constructor
function isClass(func: any) {
    return typeof func === 'function' && /^\s*class\s+/.test(func.toString());
}

export class SerDe {
    public static initFuncName: string = '_initFn'; // Name of the initialization function (if exists)
    private static id = 0; // Unique ID counter for objects
    private static weakMap: WeakMap<object, number> = new WeakMap(); // WeakMap to track objects during serialization
    private static classRegistry = new Map<string, any>([
        ['Array', Array],
        ['Set', Set],
        ['Map', Map],
    ]); // Registry of classes for deserialization
    private static only?: Set<Class>; // Optional set of classes allowed for serialization
    private static _map?: Map<number, object>; // Map to handle object references during serialization
    private static _tempMap?: Map<number, object>; // Temporary map used during deserialization

    // Method to handle simple types directly
    static fromSimple(obj: any) {
        if (obj instanceof Date || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        return undefined;
    }

    // Method to set exclusive classes for serialization
    public static setExclusively(list: Class[]) {
        SerDe.only = new Set([...list, Array, Map, Set]);
    }

    // Main serialization method
    public static serialise(
        obj: any,
        visited: Map<object, { times: number; parent: Parent }> = new Map(),
        _map: Map<number, object> = new Map(),
        depth = 0,
        parent?: Parent,
    ) {
        if (typeof obj === 'undefined' || obj === null) return obj;

        // If the object is a class and is not in the exclusive list, skip serialization
        if (SerDe.only?.size && isClass(obj?.constructor) && !SerDe.only.has(obj.constructor)) return undefined;

        if (obj instanceof Date) return { t: 'Date', v: obj.valueOf() };

        let maybeSimple = SerDe.fromSimple(obj);
        if (maybeSimple !== undefined) return maybeSimple;

        if (visited.has(obj)) {
            visited.get(obj)!.times++;
            return { t: obj?.constructor?.name, v: { _mapId: SerDe.weakMap.get(obj) } };
        }

        if (obj instanceof Function) return { t: 'function', v: obj.name };

        if (parent) visited.set(obj, { times: 1, parent });

        let id = SerDe.weakMap.get(obj) ?? SerDe.id++;
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
            let serialised: any[] = Array(obj instanceof Set ? obj.size : obj.length);
            _map.set(id, serialised);
            let i = 0;
            obj.forEach((value) => {
                serialised[i] = SerDe.serialise(value, visited, _map, depth + 1, { obj: serialised, key: i });
                i++;
            });
            return { t: obj.constructor.name, v: serialised };
        }

        // Handle generic objects
        let serialised: { [key: string]: any } = {};
        _map.set(id, serialised);
        for (let [key, value] of Object.entries(obj)) {
            serialised[key] = SerDe.serialise(value, visited, _map, depth + 1, { obj: serialised, key });
        }

        // If we are at the top level, handle circular references and multiple instances
        if (depth === 0) {
            let recursionVisited: [number, { times: number; parent: Parent }][] = Array.from(visited)
                .filter(([_, val]) => val.times > 1)
                .map(([obj, val]) => [SerDe.weakMap.get(obj) as number, val]); // Explicitly cast id to number

            recursionVisited.forEach(([id, val]) => {
                if (val.parent.key instanceof Array) {
                    ;(<any>val.parent.obj)[val.parent.key[0]][val.parent.key[1]].v = { _mapId: id };
                } else {
                    ;(<any>val.parent.obj)[val.parent.key].v = { _mapId: id };
                }
            });

            // Attach the _map for serialization result
            return { t: obj?.constructor?.name, v: serialised, _map: recursionVisited.map((x) => [x[0], _map.get(x[0])]) };
        }

        return { t: obj?.constructor?.name, v: serialised };
    }

    // Main deserialization method
    public static deserialize(
        obj: {
            _map?: [number, object][];
            t: string;
            v: any;
        } & Primitive &
            any,
    ): any {
        if (obj === undefined || obj === null) return obj;
        if (obj?.t === 'Date') return new Date(obj.v);

        // If obj is a primitive, return it directly (with Date handling)
        if (SerDe.isPrimitive(obj)) {
            return obj instanceof Date ? new Date(obj) : obj;
        }

        if (obj.t === 'function') return SerDe.classRegistry.get(obj.v) ?? {};

        // Handles the restoration of _map for object references if it exists
        if (obj._map) {
            SerDe._map = new Map<number, any>(obj._map);
            SerDe._tempMap = new Map<number, object>();
        }

        // Retrieve the class constructor if available
        const classConstructor = SerDe.classRegistry.get(obj.t);
        let instance;
        if (obj.v?._mapId && SerDe._tempMap?.has(obj.v._mapId)) {
            return SerDe._tempMap?.get(obj.v._mapId);
        } else {
            instance = classConstructor ? Object.create(classConstructor.prototype) : {};
            SerDe._tempMap?.set(obj.v._mapId, instance);
        }

        let nested = SerDe._map?.get(obj.v?._mapId) ?? obj.v;

        // Deserialize based on the type of object
        switch (obj.t) {
            case 'Array': // Handle arrays
                instance = nested.map((item: any) => SerDe.deserialize(item));
                SerDe._tempMap?.set(obj.v._mapId, instance);
                return instance;

            case 'Map': // Handle maps
                instance = new Map(nested.map(([key, value]: [any, any]) => [SerDe.deserialize(key), SerDe.deserialize(value)]));
                SerDe._tempMap?.set(obj.v._mapId, instance);
                return instance;

            case 'Set': // Handle sets
                instance = new Set((nested as any[]).map((item: any) => SerDe.deserialize(item)));
                SerDe._tempMap?.set(obj.v._mapId, instance);
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
    static classRegistration(classes: Class[]) {
        classes.forEach((x) => SerDe.classRegistry.set(x.name, x));
    }

    // Helper method to check if a value is primitive
    private static isPrimitive(value: any): boolean {
        return (
            value === null ||
            ['number', 'string', 'boolean', 'undefined', 'symbol', 'bigint'].includes(typeof value) ||
            value instanceof Date
        );
    }
}

