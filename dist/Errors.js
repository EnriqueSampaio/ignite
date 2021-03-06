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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostConnectionError = exports.IllegalStateError = exports.OperationError = exports.IgniteClientError = void 0;
const Util = require("util");
const internal_1 = require("./internal");
/**
 * Base Ignite client error class.
 */
class IgniteClientError extends Error {
    constructor(message) {
        super(message);
    }
    /**
     * Ignite client does not support one of the specified or received data types.
     * @ignore
     */
    static unsupportedTypeError(type) {
        return new IgniteClientError(Util.format('Type %s is not supported', internal_1.BinaryUtils.getTypeName(type)));
    }
    /**
     * The real type of data is not equal to the specified one.
     * @ignore
     */
    static typeCastError(fromType, toType) {
        return new IgniteClientError(Util.format('Type "%s" can not be cast to %s', internal_1.BinaryUtils.getTypeName(fromType), internal_1.BinaryUtils.getTypeName(toType)));
    }
    /**
     * The real value can not be cast to the specified type.
     * @ignore
     */
    static valueCastError(value, toType) {
        return new IgniteClientError(Util.format('Value "%s" can not be cast to %s', value, internal_1.BinaryUtils.getTypeName(toType)));
    }
    /**
     * An illegal or inappropriate argument has been passed to the API method.
     * @ignore
     */
    static illegalArgumentError(message) {
        return new IgniteClientError(message);
    }
    /**
     * Ignite client internal error.
     * @ignore
     */
    static internalError(message = null) {
        return new IgniteClientError(message || 'Internal library error');
    }
    /**
     * Serialization/deserialization errors.
     * @ignore
     */
    static serializationError(serialize, message = null) {
        let msg = serialize ? 'Complex object can not be serialized' : 'Complex object can not be deserialized';
        if (message) {
            msg = msg + ': ' + message;
        }
        return new IgniteClientError(msg);
    }
    /**
     * EnumItem serialization/deserialization errors.
     * @ignore
     */
    static enumSerializationError(serialize, message = null) {
        let msg = serialize ? 'Enum item can not be serialized' : 'Enum item can not be deserialized';
        if (message) {
            msg = msg + ': ' + message;
        }
        return new IgniteClientError(msg);
    }
}
exports.IgniteClientError = IgniteClientError;
/**
 * Ignite server returns error for the requested operation.
 * @extends IgniteClientError
 */
class OperationError extends IgniteClientError {
    constructor(message) {
        super(message);
    }
}
exports.OperationError = OperationError;
/**
 * Ignite client is not in an appropriate state for the requested operation.
 * @extends IgniteClientError
 */
class IllegalStateError extends IgniteClientError {
    constructor(message = null) {
        super(message || 'Ignite client is not in an appropriate state for the requested operation');
    }
}
exports.IllegalStateError = IllegalStateError;
/**
 * The requested operation is not completed due to the connection lost.
 * @extends IgniteClientError
 */
class LostConnectionError extends IgniteClientError {
    constructor(message = null) {
        super(message || 'Request is not completed due to the connection lost');
    }
}
exports.LostConnectionError = LostConnectionError;
//# sourceMappingURL=Errors.js.map