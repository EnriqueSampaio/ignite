/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientSocket = void 0;
const net = require("net");
const tls = require("tls");
const Long = require("long");
const Util = require("util");
const internal_1 = require("../internal");
const HANDSHAKE_SUCCESS_STATUS_CODE = 1;
const REQUEST_SUCCESS_STATUS_CODE = 0;
const PORT_DEFAULT = 10800;
class ProtocolVersion {
    constructor(major = null, minor = null, patch = null) {
        this._major = major;
        this._minor = minor;
        this._patch = patch;
    }
    compareTo(other) {
        let diff = this._major - other._major;
        if (diff !== 0) {
            return diff;
        }
        diff = this._minor - other._minor;
        if (diff !== 0) {
            return diff;
        }
        return this._patch - other._patch;
    }
    equals(other) {
        return this.compareTo(other) === 0;
    }
    toString() {
        return Util.format('%d.%d.%d', this._major, this._minor, this._patch);
    }
    read(buffer) {
        this._major = buffer.readShort();
        this._minor = buffer.readShort();
        this._patch = buffer.readShort();
    }
    write(buffer) {
        buffer.writeShort(this._major);
        buffer.writeShort(this._minor);
        buffer.writeShort(this._patch);
    }
}
const PROTOCOL_VERSION_1_0_0 = new ProtocolVersion(1, 0, 0);
const PROTOCOL_VERSION_1_1_0 = new ProtocolVersion(1, 1, 0);
const PROTOCOL_VERSION_1_2_0 = new ProtocolVersion(1, 2, 0);
const SUPPORTED_VERSIONS = [
    // PROTOCOL_VERSION_1_0_0, // Support for QueryField precision/scale fields breaks 1.0.0 compatibility
    PROTOCOL_VERSION_1_1_0,
    PROTOCOL_VERSION_1_2_0
];
const CURRENT_VERSION = PROTOCOL_VERSION_1_2_0;
const STATE = Object.freeze({
    INITIAL: 0,
    HANDSHAKE: 1,
    CONNECTED: 2,
    DISCONNECTED: 3
});
class ClientSocket {
    constructor(endpoint, config, onSocketDisconnect) {
        internal_1.ArgumentChecker.notEmpty(endpoint, 'endpoints');
        this._endpoint = endpoint;
        this._parseEndpoint(endpoint);
        this._config = config;
        this._state = STATE.INITIAL;
        this._socket = null;
        this._requestId = Long.ZERO;
        this._handshakeRequestId = null;
        this._protocolVersion = null;
        this._requests = new Map();
        this._onSocketDisconnect = onSocketDisconnect;
        this._error = null;
        this._wasConnected = false;
        this._buffer = null;
        this._offset = 0;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this._connectSocket(this._getHandshake(CURRENT_VERSION, resolve, reject));
            });
        });
    }
    disconnect() {
        this._disconnect(true, false);
    }
    get requestId() {
        const id = this._requestId;
        this._requestId = this._requestId.add(1);
        return id;
    }
    sendRequest(opCode, payloadWriter, payloadReader = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._state === STATE.CONNECTED) {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const request = new Request(this.requestId, opCode, payloadWriter, payloadReader, resolve, reject);
                    this._addRequest(request);
                    yield this._sendRequest(request);
                }));
            }
            else {
                throw new internal_1.Errors.IllegalStateError();
            }
        });
    }
    _connectSocket(handshakeRequest) {
        const onConnected = () => __awaiter(this, void 0, void 0, function* () {
            this._state = STATE.HANDSHAKE;
            // send handshake
            yield this._sendRequest(handshakeRequest);
        });
        const options = Object.assign({}, this._config._options, { host: this._host, port: this._port, version: this._version });
        if (this._config._useTLS) {
            this._socket = tls.connect(options, onConnected);
        }
        else {
            this._socket = net.createConnection(options, onConnected);
        }
        this._socket.on('data', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._processResponse(data);
            }
            catch (err) {
                this._error = err.message;
                this._disconnect();
            }
        }));
        this._socket.on('close', () => {
            this._disconnect(false);
        });
        this._socket.on('error', (error) => {
            this._error = this._state === STATE.INITIAL ?
                'Connection failed: ' + error : error;
            this._disconnect();
        });
    }
    _addRequest(request) {
        this._requests.set(request.id.toString(), request);
    }
    _sendRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield request.getMessage();
                this._logMessage(request.id.toString(), true, message);
                this._socket.write(message);
            }
            catch (err) {
                this._requests.delete(request.id);
                request.reject(err);
            }
        });
    }
    _processResponse(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._state === STATE.DISCONNECTED) {
                return;
            }
            if (this._buffer) {
                this._buffer.concat(message);
                this._buffer.position = this._offset;
            }
            else {
                this._buffer = internal_1.MessageBuffer.from(message, 0);
            }
            while (this._buffer && this._offset < this._buffer.length) {
                if (this._buffer.length < this._offset + internal_1.BinaryUtils.getSize(internal_1.BinaryUtils.TYPE_CODE.INTEGER)) {
                    break;
                }
                // Response length
                const length = this._buffer.readInteger() + internal_1.BinaryUtils.getSize(internal_1.BinaryUtils.TYPE_CODE.INTEGER);
                if (this._buffer.length < this._offset + length) {
                    break;
                }
                this._offset += length;
                let requestId, isSuccess;
                const isHandshake = this._state === STATE.HANDSHAKE;
                if (isHandshake) {
                    // Handshake status
                    isSuccess = (this._buffer.readByte() === HANDSHAKE_SUCCESS_STATUS_CODE);
                    requestId = this._handshakeRequestId.toString();
                }
                else {
                    // Request id
                    requestId = this._buffer.readLong().toString();
                    // Status code
                    isSuccess = (this._buffer.readInteger() === REQUEST_SUCCESS_STATUS_CODE);
                }
                this._logMessage(requestId, false, this._buffer.data);
                const buffer = this._buffer.copy();
                if (this._offset === this._buffer.length) {
                    this._buffer = null;
                    this._offset = 0;
                }
                if (this._requests.has(requestId)) {
                    const request = this._requests.get(requestId);
                    this._requests.delete(requestId);
                    if (isHandshake) {
                        yield this._finalizeHandshake(buffer, request, isSuccess);
                    }
                    else {
                        yield this._finalizeResponse(buffer, request, isSuccess);
                        if (this._buffer) {
                            this._buffer.position = this._offset;
                        }
                    }
                }
                else {
                    throw internal_1.Errors.IgniteClientError.internalError('Invalid response id: ' + requestId);
                }
            }
        });
    }
    _finalizeHandshake(buffer, request, isSuccess) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isSuccess) {
                // Server protocol version
                const serverVersion = new ProtocolVersion();
                serverVersion.read(buffer);
                // Error message
                const errMessage = internal_1.BinaryCommunicator.readString(buffer);
                if (!this._protocolVersion.equals(serverVersion)) {
                    if (!this._isSupportedVersion(serverVersion) ||
                        serverVersion.compareTo(PROTOCOL_VERSION_1_1_0) < 0 && this._config._userName) {
                        request.reject(new internal_1.Errors.OperationError(Util.format('Protocol version mismatch: client %s / server %s. Server details: %s', this._protocolVersion.toString(), serverVersion.toString(), errMessage)));
                        this._disconnect();
                    }
                    else {
                        // retry handshake with server version
                        const handshakeRequest = this._getHandshake(serverVersion, request.resolve, request.reject);
                        yield this._sendRequest(handshakeRequest);
                    }
                }
                else {
                    request.reject(new internal_1.Errors.OperationError(errMessage));
                    this._disconnect();
                }
            }
            else {
                this._state = STATE.CONNECTED;
                this._wasConnected = true;
                request.resolve();
            }
        });
    }
    _finalizeResponse(buffer, request, isSuccess) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isSuccess) {
                // Error message
                const errMessage = internal_1.BinaryCommunicator.readString(buffer);
                request.reject(new internal_1.Errors.OperationError(errMessage));
            }
            else {
                try {
                    if (request.payloadReader) {
                        yield request.payloadReader(buffer);
                    }
                    request.resolve();
                }
                catch (err) {
                    request.reject(err);
                }
            }
        });
    }
    _handshakePayloadWriter(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Handshake code
            payload.writeByte(1);
            // Protocol version
            this._protocolVersion.write(payload);
            // Client code
            payload.writeByte(2);
            if (this._config._userName) {
                internal_1.BinaryCommunicator.writeString(payload, this._config._userName);
                internal_1.BinaryCommunicator.writeString(payload, this._config._password);
            }
        });
    }
    _getHandshake(version, resolve, reject) {
        this._protocolVersion = version;
        const handshakeRequest = new Request(this.requestId, null, this._handshakePayloadWriter.bind(this), null, resolve, reject);
        this._addRequest(handshakeRequest);
        this._handshakeRequestId = handshakeRequest.id;
        return handshakeRequest;
    }
    _isSupportedVersion(protocolVersion) {
        for (let version of SUPPORTED_VERSIONS) {
            if (version.equals(protocolVersion)) {
                return true;
            }
        }
        return false;
    }
    _disconnect(close = true, callOnDisconnect = true) {
        this._state = STATE.DISCONNECTED;
        this._requests.forEach((request, id) => {
            request.reject(new internal_1.Errors.LostConnectionError(this._error));
            this._requests.delete(id);
        });
        if (this._wasConnected && callOnDisconnect && this._onSocketDisconnect) {
            this._onSocketDisconnect(this._error);
        }
        if (close) {
            this._onSocketDisconnect = null;
            this._socket.end();
        }
    }
    _parseEndpoint(endpoint) {
        endpoint = endpoint.trim();
        this._host = endpoint;
        this._port = null;
        const colonCnt = endpoint.split(':').length - 1;
        if (colonCnt > 1) {
            // IPv6 address
            this._version = 6;
            const index = endpoint.lastIndexOf(']:');
            if (index >= 0) {
                this._host = endpoint.substring(0, index + 1);
                this._port = endpoint.substring(index + 2);
            }
            if (this._host.startsWith('[') || this._host.endsWith(']')) {
                if (this._host.startsWith('[') && this._host.endsWith(']')) {
                    this._host = this._host.substring(1, this._host.length - 1);
                }
                else {
                    throw internal_1.Errors.IgniteClientError.illegalArgumentError('Incorrect endpoint format: ' + endpoint);
                }
            }
        }
        else {
            // IPv4 address
            this._version = 4;
            const index = endpoint.lastIndexOf(':');
            if (index >= 0) {
                this._host = endpoint.substring(0, index);
                this._port = endpoint.substring(index + 1);
            }
        }
        if (!this._port) {
            this._port = PORT_DEFAULT;
        }
        else {
            this._port = parseInt(this._port);
            if (isNaN(this._port)) {
                throw internal_1.Errors.IgniteClientError.illegalArgumentError('Incorrect endpoint format: ' + endpoint);
            }
        }
    }
    _logMessage(requestId, isRequest, message) {
        if (internal_1.Logger.debug) {
            internal_1.Logger.logDebug((isRequest ? 'Request: ' : 'Response: ') + requestId);
            internal_1.Logger.logDebug('[' + [...message] + ']');
        }
    }
}
exports.ClientSocket = ClientSocket;
class Request {
    constructor(id, opCode, payloadWriter, payloadReader, resolve, reject) {
        this._id = id;
        this._opCode = opCode;
        this._payloadWriter = payloadWriter;
        this._payloadReader = payloadReader;
        this._resolve = resolve;
        this._reject = reject;
    }
    get id() {
        return this._id;
    }
    get payloadReader() {
        return this._payloadReader;
    }
    get resolve() {
        return this._resolve;
    }
    get reject() {
        return this._reject;
    }
    getMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            const message = new internal_1.MessageBuffer();
            // Skip message length
            const messageStartPos = internal_1.BinaryUtils.getSize(internal_1.BinaryUtils.TYPE_CODE.INTEGER);
            message.position = messageStartPos;
            if (this._opCode !== null) {
                // Op code
                message.writeShort(this._opCode);
                // Request id
                message.writeLong(this._id);
            }
            if (this._payloadWriter) {
                // Payload
                yield this._payloadWriter(message);
            }
            // Message length
            message.position = 0;
            message.writeInteger(message.length - messageStartPos);
            return message.data;
        });
    }
}
//# sourceMappingURL=ClientSocket.js.map