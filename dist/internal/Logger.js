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
exports.Logger = void 0;
/** Utility class for logging errors and debug messages. */
let Logger = /** @class */ (() => {
    class Logger {
        static get debug() {
            return Logger._debug;
        }
        static set debug(value) {
            Logger._debug = value;
        }
        static logDebug(data, ...args) {
            if (Logger._debug) {
                console.log(data, ...args);
            }
        }
        static logError(data, ...args) {
            if (Logger._debug) {
                console.log('ERROR: ' + data, ...args);
            }
        }
    }
    Logger._debug = false;
    return Logger;
})();
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map