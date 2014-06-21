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

function BufferReader(buffer) {
	this.buffer = buffer;
	this.offset = 0;
}

/*
 * 8 bits
 */

BufferReader.prototype.nextInt8 = function() {
	return this.buffer.readInt8(this.offset++);
};

BufferReader.prototype.nextUInt8 = function() {
	return this.buffer[this.offset++];
};

/*
 * 16 bits
 */

BufferReader.prototype.nextInt16 = function() {
	var i = this.buffer.readInt16BE(this.offset);
	this.offset += 2;
	return i;
};

BufferReader.prototype.nextUInt16 = function() {
	var i = this.buffer.readUInt16BE(this.offset);
	this.offset += 2;
	return i;
};

/*
 * 32 bits
 */

BufferReader.prototype.nextInt32 = function() {
	var i = this.buffer.readInt32BE(this.offset);
	this.offset += 4;
	return i;
};

BufferReader.prototype.nextUInt32 = function() {
	var i = this.buffer.readUInt32BE(this.offset);
	this.offset += 4;
	return i;
};

/*
 * Float & Double
 */

BufferReader.prototype.nextFloat = function() {
	var i = this.buffer.readFloatBE(this.offset);
	this.offset += 4;
	return i;
};

BufferReader.prototype.nextDouble = function() {
	var i = this.buffer.readDoubleBE(this.offset);
	this.offset += 8;
	return i;
};

/*
 * Buffer
 */

BufferReader.prototype.nextBuffer = function(length, shadow) {
	var b = new Buffer(length);
	this.buffer.copy(b, 0, this.offset, this.offset + length);
	this.offset += length;
	return b;
};

BufferReader.prototype.nextShadowBuffer = function() {
	var b = this.buffer.slice(this.offset, this.offset + length);
	this.offset += length;
	return b;
};

/*
 * String
 */

BufferReader.prototype.nextString = function(length) {
	var s = this.buffer.toString("utf-8", this.offset, this.offset + length);
	this.offset += length;
	return s;
};

module.exports = BufferReader;
