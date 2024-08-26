
# SerDe: Serialization and Deserialization Library

`SerDe` is a powerful TypeScript library designed to serialize and deserialize complex, nested data structures, while ensuring that the integrity of your objects is maintained throughout the process. This library supports the serialization of custom classes, circular references, and nested objects, and it ensures that during deserialization, existing objects are not redundantly recreated—thus preserving the uniqueness of instances.

## Key Features

- **Preserves Object Uniqueness**: During deserialization, `SerDe` ensures that objects that were serialized and referenced multiple times are not recreated multiple times. This preserves the uniqueness of instances, meaning if two references in your data structure pointed to the same object before serialization, they will continue to do so after deserialization.

- **Custom Class Serialization**: Supports serialization and deserialization of user-defined classes. To utilize this feature, classes need to be registered with `SerDe` to ensure they can be correctly reconstructed during deserialization.

- **Circular Reference Handling**: Efficiently handles circular references in data structures, ensuring that complex graphs of interconnected objects can be serialized and deserialized without issues.

- **Support for Initialization Functions**: Classes can include an `initFn` (default name: `_initFn`) method that will be automatically invoked during deserialization, allowing for custom initialization logic to be executed when an object is reconstructed.

## Installation

You can install `SerDe` via npm:

```bash
npm install serde-ts
```

## Usage

### Registering Classes

Before you can serialize and deserialize custom classes, you need to register them with `SerDe`. This is necessary to allow `SerDe` to know how to properly reconstruct instances of these classes during deserialization.

```typescript
import { SerDe } from './path-to-serde';
import { MyClass } from './path-to-myclass';

SerDe.classRegistration([MyClass]);
```

### Serialization Example

```typescript
const myObject = new MyClass('Example', 123);
const serialized = SerDe.serialise(myObject);
console.log(JSON.stringify(serialized, null, 2));
```

### Deserialization Example

```typescript
const deserialized = SerDe.deserialize(serialized);
console.log(deserialized instanceof MyClass); // true
```

### Using `initFn` for Custom Initialization

If your class requires custom initialization logic upon deserialization, you can define an `initFn` method in your class. `SerDe` will automatically call this method after the object is reconstructed.

```typescript
class MyClass {
    constructor(public name: string, public value: number) {}
    
    _initFn() {
        console.log('MyClass instance has been deserialized and initialized!');
        // Custom logic here...
    }
}

SerDe.classRegistration([MyClass]);
```

When an object of `MyClass` is deserialized, the `_initFn` method will be invoked, allowing you to perform any necessary setup that your class requires.

## Contributing

Feel free to open issues or pull requests to improve the library or add new features.


---

This `README.md` description should help users understand how to use the `SerDe` library and highlight its unique features. The emphasis on object uniqueness, class registration, and the `initFn` mechanism will clarify the powerful capabilities and requirements of the library.