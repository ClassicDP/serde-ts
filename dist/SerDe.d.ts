export type Class<T = unknown, Arguments extends any[] = any[]> = new (...arguments_: Arguments) => T;
type Primitive = number | string | boolean | undefined | symbol | bigint | Date;
type Parent = {
    obj: object;
    key: string | number | [number, number];
};
export declare class SerDe {
    static initFuncName: string;
    private static id;
    private static weakMap;
    private static classRegistry;
    private static only?;
    private static _map?;
    private static _tempMap?;
    static fromSimple(obj: any): string | number | boolean | Date | undefined;
    static setExclusively(list: Class[]): void;
    static serialise(obj: any, visited?: Map<object, {
        times: number;
        parent: Parent;
    }>, _map?: Map<number, object>, depth?: number, parent?: Parent): any;
    static deserialize(obj: {
        _map?: [number, object][];
        t: string;
        v: any;
    } & Primitive & any): any;
    static classRegistration(classes: Class[]): void;
    private static isPrimitive;
}
export {};
