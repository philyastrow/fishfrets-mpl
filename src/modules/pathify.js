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
import pathify from 'vuex-pathify'

// Configure `vuex-pathify`
pathify.options.deep    = false;
pathify.options.mapping = 'simple';
export default pathify;

// Helper to generate "toggle mutations" for every boolean property
export function makeTogglers(stateModel) {
	const togglePropRegex = /^is[A-Z]/;

	return Object.fromEntries(Object.keys(stateModel)
		.filter(prop => togglePropRegex.test(prop))
		.map(prop => [`toggle.${prop}`, state => state[prop] = !state[prop]])
	);
}
