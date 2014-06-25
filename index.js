/*
	Copyright (c) 2014 Bastien Clément

	Permission is hereby granted, free of charge, to any person obtaining a
	copy of this software and associated documentation files (the
	"Software"), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:

	The above copyright notice and this permission notice shall be included
	in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
	CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
	TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var SequentialBuffer = require("sequential-buffer");

/*
 * Encode
 */

function lengthy_type(writer, type, length) {
	var bit_len, qualifier;

	if (length < 0x100) {
		writer.writeUInt8(type);
		writer.writeUInt8(length);
	} else if (length < 0x10000) {
		writer.writeUInt8(type | 0x10);
		writer.writeUInt16BE(length);
	} else if (length < 0x100000000) {
		writer.writeUInt8(type | 0x20);
		writer.writeUInt32BE(length);
	} else {
		throw new Error("Unable to encode length: " + length);
	}
}

function PackEncode(value, dictionary, backrefs, writer) {
	if (!backrefs) backrefs = { strings: [], lists: [], structs: [] };

	if (!writer) {
		writer = new SequentialBuffer();
		PackEncode(value, dictionary, backrefs, writer);
		return writer.getBuffer();
	}

	var type = typeof value;

	if (type === "object") {
		if (!value) {
			type = "null";
		} else if (Array.isArray(value)) {
			type = "array";
		} else if (Buffer.isBuffer(value)) {
			type = "buffer";
		}
	} else if (dictionary) {
		var idx = dictionary.indexOf(value);
		if (idx > -1 && idx < 128) {
			writer.writeUInt8(idx + 128);
			return;
		}
	}

	if (type === "string" || type === "object" || type === "array") {
		var backrefs_set, backref_type;
		switch (type) {
			case "string": backrefs_set = backrefs.strings; backref_type = 0x08; break;
			case "array":  backrefs_set = backrefs.lists;   backref_type = 0x09; break;
			case "object": backrefs_set = backrefs.structs; backref_type = 0x0A; break;
		}

		var backref = backrefs_set.indexOf(value);
		if (backref > -1) {
			lengthy_type(writer, backref_type, backref);
			return;
		}
	}

	switch (type) {
		case "undefined":
		case "null":
			writer.writeUInt8(0x01);
			return;

		case "boolean":
			writer.writeUInt8(value ? 0x21 : 0x11);
			return;

		case "number":
			// Integer (in 32 bits range)
			if ((value % 1) === 0 && value >= -2147483648 && value <= 4294967295) {
				if (value < 0) {
					// Signed
					if (value >= -128) {
						writer.writeUInt8(0x42);
						writer.writeInt8(value);
					} else if (value >= -32768) {
						writer.writeUInt8(0x52);
						writer.writeInt16BE(value);
					} else {
						writer.writeUInt8(0x62);
						writer.writeInt32BE(value);
					}
				} else {
					// Unsigned
					if (value < 256) {
						writer.writeUInt8(0x02);
						writer.writeUInt8(value);
					} else if (value < 65536) {
						writer.writeUInt8(0x12);
						writer.writeUInt16BE(value);
					} else {
						writer.writeUInt8(0x22);
						writer.writeUInt32BE(value);
					}
				}

				return;
			}

			// Double
			writer.writeUInt8(0x13);
			writer.writeDoubleBE(value);
			return;

		case "string":
			backrefs.strings.push(value);
			lengthy_type(writer, 0x04, Buffer.byteLength(value, "utf8"));
			writer.writeString(value);
			return;

		case "buffer":
			lengthy_type(writer, 0x05, value.length);
			writer.writeBuffer(value);
			return;

		case "array":
			backrefs.lists.push(value);

			var length = value.length;
			lengthy_type(writer, 0x06, length);

			for(var i = 0; i < length; ++i) {
				PackEncode(value[i], dictionary, backrefs, writer);
			}

			return;

		case "object":
			backrefs.structs.push(value);

			var keys = Object.keys(value);
			var length = keys.length;
			lengthy_type(writer, 0x07, length);

			for(var i = 0; i < length; ++i) {
				var key = keys[i];
				PackEncode("" + key, dictionary, backrefs, writer)
				PackEncode(value[key], dictionary, backrefs, writer);
			}

			return;

		default:
			throw new Error("Unable to encode type: " + type);
	}
}

/*
 * Decode
 */

function PackDecode(buffer, dictionary, backrefs) {
	if (!(buffer instanceof SequentialBuffer)) buffer = new SequentialBuffer(buffer);
	if (!backrefs) backrefs = { strings: [], lists: [], structs: [] };

	var type = buffer.nextUInt8();

	// Dictionary value
	if (type & 0x80) {
		var idx = type & 0x7F;
		if (dictionary && idx < dictionary.length) {
			return dictionary[idx];
		}

		throw new Error("Undefined dictionary value: " + idx);
	}

	var base_type = type & 0x0F;
	var qualifiers = (type & 0x70) >> 4;

	switch (base_type) {
		case 1: // Simple
			switch (qualifiers) {
				case 0: return null;
				case 1: return false;
				case 2: return true;
				default:
					throw new Error("Unknown simple qualifier: " + qualifiers);
			}

		case 2: // Integer
			switch (qualifiers) {
				case 0: return buffer.nextUInt8();
				case 1: return buffer.nextUInt16BE();
				case 2: return buffer.nextUInt32BE();
				case 4: return buffer.nextInt8();
				case 5: return buffer.nextInt16BE();
				case 6: return buffer.nextInt32BE();
				default:
					console.log(buffer.offset);
					throw new Error("Unknown integer qualifiers: " + qualifiers);
			}

		case 3: // Float
			switch (qualifiers) {
				case 0: return buffer.nextFloatBE();
				case 1: return buffer.nextDoubleBE();
				default:
					throw new Error("Unknown float qualifier: " + qualifiers);
			}

		case 4: // String
		case 5: // Buffer
		case 6: // List
		case 7: // Struct
		case 8: // String backref
		case 9: // List backref
		case 10: // Struct backref
			var length;
			switch (qualifiers) {
				case 0: length = buffer.nextUInt8(); break;
				case 1: length = buffer.nextUInt16BE(); break;
				case 2: length = buffer.nextUInt32BE(); break;
				default:
					throw new Error("Unknown length qualifier: " + qualifiers);
			}

			switch (base_type) {
				case 4: // String
					var string = buffer.nextString(length);
					backrefs.strings.push(string);
					return string;

				case 5: // Buffer
					return buffer.nextBuffer(length);

				case 6: // List
					var list = [];
					backrefs.lists.push(list);
					for (var i = 0; i < length; ++i) {
						list.push(PackDecode(buffer, dictionary, backrefs));
					}
					return list;

				case 7: // Struct
					var struct = {};
					backrefs.structs.push(struct);
					for (var i = 0; i < length; ++i) {
						var key = PackDecode(buffer, dictionary, backrefs);
						if (typeof key !== "string") {
							throw new Error("Invalid struct key: " + key);
						}
						struct[key] = PackDecode(buffer, dictionary, backrefs);
					}
					return struct;

				case 8: // String backref
					if (length < backrefs.strings.length) return backrefs.strings[length];
					throw new Error("Undefined string back reference: " + length);

				case 9: // List backref
					if (length < backrefs.lists.length) return backrefs.lists[length];
					throw new Error("Undefined list back reference: " + length);

				case 10: // Struct backref
					if (length < backrefs.structs.length) return backrefs.structs[length];
					throw new Error("Undefined structure back reference: " + length);
			}

		default:
			throw new Error("Unknown base type: " + base_type);
	}
}

module.exports = {
	encode: PackEncode,
	decode: PackDecode
};
