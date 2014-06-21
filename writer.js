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

var DEFAULT_SIZE = 1024;
var EXPAND_FACTOR = 2;

function BufferWriter(size, noAssert) {
	this.size = size || DEFAULT_SIZE;
	this.buffer = new Buffer(this.size);
	this.length = 0;
}

BufferWriter.prototype.offset = function(need) {
	var old_length = this.length;
	this.length += need;

	if (this.length > this.size) {
		var old = this.buffer;

		this.size = this.length * EXPAND_FACTOR;
		this.buffer = new Buffer(this.size);

		old.copy(this.buffer);
	}

	return old_length;
};

BufferWriter.prototype.getBuffer = function() {
	return this.buffer.slice(0, this.length);
}

/*
 * 8 bits
 */

BufferWriter.prototype.writeInt8 = function(i) {
	var o = this.offset(1);
	this.buffer.writeInt8(i, o);
};

BufferWriter.prototype.writeUInt8 = function(i) {
	var o = this.offset(1);
	this.buffer[o] = i;
};

/*
 * 16 bits
 */

BufferWriter.prototype.writeInt16 = function(i) {
	var o = this.offset(2);
	this.buffer.writeInt16BE(i, o);
};

BufferWriter.prototype.writeUInt16 = function(i) {
	var o = this.offset(2);
	this.buffer.writeUInt16BE(i, o);
};

/*
 * 32 bits
 */

BufferWriter.prototype.writeInt32 = function(i) {
	var o = this.offset(4);
	this.buffer.writeInt32BE(i, o);
};

BufferWriter.prototype.writeUInt32 = function(i) {
	var o = this.offset(4);
	this.buffer.writeUInt32BE(i, o);
};

/*
 * Float & Double
 */

BufferWriter.prototype.writeFloat = function(r) {
	var o = this.offset(4);
	this.buffer.writeFloatBE(r, o);
};

BufferWriter.prototype.writeDouble = function(r) {
	var o = this.offset(8);
	this.buffer.writeDoubleBE(r, o);
};

/*
 * Buffer
 */

BufferWriter.prototype.writeBuffer = function(buffer) {
	var o = this.offset(buffer.length);
	buffer.copy(this.buffer, o);
};

/*
 * String
 */

BufferWriter.prototype.writeString = function(string) {
	var byte_length = Buffer.byteLength(string, "utf8");
	var o = this.offset(byte_length);
	this.buffer.write(string, o, byte_length, "utf8");
};

module.exports = BufferWriter;
