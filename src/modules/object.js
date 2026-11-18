/*
 * This file is part of FishFrets and is derived from Fretboarder
 * (https://github.com/cheap-glitch/fretboarder).
 *
 * Original work Copyright (c) 2019-2021, cheap glitch
 * Modifications Copyright (c) 2022-2026, Bradley Fish and Phil Yastrow
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Create a new object with the same keys and the result of a callback as values
 */
export function mapObjectToObject(object, callback) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, callback(key, value)]));
}

/**
 * Check that a value is an actual object
 */
export function isObject(value) {
	return !!value && Object.prototype.toString.call(value) == '[object Object]';
}
