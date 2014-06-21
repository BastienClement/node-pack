node-pack
=========

```
npm install node-pack
```

- [x] Compact binary data format
- [x] Encode `null`, `boolean`, `number`, `string`, `Buffer`, `Array` and `Object`
- [x] Perform string deduplication
- [x] Handle circular references
- [x] Can take advantage of a predefined list of common values

## API

```js
var Pack = require('node-pack');
```

### `Pack.encode(value, [dictionary])`

Encode `value` and return its serialized `Buffer`.

### `Pack.decode(buffer, [dictionary])`

Decode `buffer` and return its deserialized value.

### Dictionnary

The dictionary is a optional list of commonly used values (up to 127 entries).

When the encoder encounter a value from the dictionary, it can emit a single byte in the serialized form.

The dictionary is not embedded in the serialized form. It's up to you to ensure that the decoder receive the dictionary used for encoding.

```js
var data = { hello: "world" };
var dict = ["hello", "world"];

var serialized = Pack.encode(data, dict);
// <Buffer 07 01 80 81> (only 4 bytes)

Pack.decode(serialized, dict);
// { hello: "world" }
```

Values in the dictionary are tested with the identity operator (`===`). While it is not impossible for objects or arrays to be contained inside the dictionnary, it is mostly useful with scalar data like expected object keys.

## Format

### Endianness

Multi-byte numbers are always big-endian.

### Serialized value

A serialized value is:

```
<TAG> <DATA>?
```

The tag describes the type of the value. Some tags are followed by additional data.

### Tags

A tag is a 8-bits unsigned integer with the following structure:

```
 MSB               LSB
+---+-------+---------+
| 0 | 0 0 0 | 0 0 0 0 |
+---+-------+---------+
  |     |        |
  |     |        +-- BaseType   Tag & 0x0F
  |     +-- Qualifier           Tag & 0x70 >> 4
  +-- DictEntry                 Tag & 0x80 >> 7
```

If the `DictEntry` bit is `1`, this value is a dictionary reference and the 7 least significant bits are the dictionary index of this value. No optional data are present (it's a one byte value consisting only of its tag).

Else, the tag is interpreted as follows:

| BaseType | Name                  | Description                                |
|----------|-----------------------|--------------------------------------------|
| `1`      | Direct value          | Simple value derived from the qualifier    |
| `2`      | Integer               | 8/16/32-bits signed or unsigned integes    |
| `3`      | Float                 | IEEE float or double number                |
| `4`      | String                | UTF-8 string                               |
| `5`      | Buffer                | Raw binary buffers                         |
| `6`      | List                  | List of values                             |
| `7`      | Structure             | Key/Value object structure                 |
| `8`      | String back reference | References to already serialized string    |
| `9`      | List back reference   | References to already serialized list      |
| `10`     | Struct back reference | References to already serialized structure |

### Direct value

A direct value is derived from its qualifier and require no additional data.

| Qualifier | Value   |
|-----------|---------|
| `0`       | `null`  |
| `1`       | `false` |
| `2`       | `true`  |

### Integer

The 3-bits qualifier for integers is composed of 1 sign bit and 2 width bits.

The integer is stored in the additional data for this value.

| Qualifier | Sign     | Width   |
|-----------|----------|---------|
| `0`       | Unsigned | 8 bits  |
| `1`       | Unsigned | 16 bits |
| `2`       | Unsigned | 32 bits |
| `3`       | Unsigned | 64 bits |
| `4`       | Signed   | 8 bits  |
| `5`       | Signed   | 16 bits |
| `6`       | Signed   | 32 bits |
| `7`       | Signed   | 64 bits |

*Note: 64 bits integers are not available in this implementation*

### Float / double

The number is stored in the additional data for this value.

| Qualifier | Type                |
|-----------|---------------------|
| `0`       | IEEE 32-bits float  |
| `1`       | IEEE 64-bits double |

*Note: this implementation always writes doubles*

### Lengthy types

Strings, Buffers, Arrays and Objects are called lengthy types because they are associated with a `length` property and use a similar qualifier structure.

The qualifier indicate the width of the `length` property (an unsigned integer).

| Qualifier | Width   |
|-----------|---------|
| `0`       | 8 bits  |
| `1`       | 16 bits |
| `2`       | 32 bits |
| `3`       | 64 bits |

Additional data for the value are prepended by this `length` integer in the form `<TAG> <LENGTH> <DATA>`.

Back references are not stricly a lengthy type but use the same qualifier strucure, use the `length` as the back reference index and has no additional data after the `length` integer.

*Note: 64 bits lengths are not available in this implementation*

### String

Strings are UTF-8 encoded. The `length` property is the byte-length of the string. Following data are the raw string bytes.

### Buffer

Buffers are raw binary data. The `length` property is the byte-length of the buffer. Following data are the raw buffer bytes.

### List

Arrays are ordered lists of elements. The `length` property is the number of elements in the array.

Following data are concatenated serialized elements representation.

### Structure

Structures is a key/value container of elements. Keys are strings, values can be of any type. The `length` property is the number of elements in the structure.

Following data are concatenated serialized key representation and serialized value reprensentation, for every elements in sequence.

### String/List/Structure back reference

The `length` property is the back reference index. No additional data are required for back references.

When the encoder process a string, an array or an object value, it stores it in a back references list. When the same value is processed again, a back reference to the previously encoded value is written. Since values are decoded in the same order, the back reference index is referencing the same previous value.

This handle both string deduplication and circular references.

## License

MIT