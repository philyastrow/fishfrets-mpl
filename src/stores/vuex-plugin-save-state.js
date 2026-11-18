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
 * vuex-plugin-save-state
 */

 const defaultOptions = {
	namespace:      'vuex',
	savedByDefault: false,
};

/**
 * A `default` of `() => ({})` (a factory, used so every store instance gets
 * its own fresh object/array instead of one shared reference) has to be
 * CALLED here -- returning the bare function instead silently breaks Vue's
 * reactivity for that field: a function is a valid value, so reads/Vue.set
 * on it never error, but Vue only ever observes plain objects and arrays,
 * so nothing on it is ever tracked as reactive.
 */
function resolveDefault(defaultValue)
{
	return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
}

/**
 * Return a function to instantiate the Vuex plugin
 */
export function saveStatePlugin(stateModel, options = {})
{
	options = { ...defaultOptions, ...(options || {})};

	return function(store)
	{
		// Declare a function to check that a prop has been stored and that the stored value passes validation
		const checkProp = (prop, storedValue) => storedValue && (prop.saved === undefined ? options.savedByDefault : prop.saved) && (!prop.validator || prop.validator(storedValue));

		// Get the stored state
		let storedState = {};
		try {
			storedState = JSON.parse(localStorage.getItem(options.namespace) || '{}');
		}
		catch (err) {
			storedState = {};
		}

		// Filter it and deep merge it with the default state
		store.replaceState(Object.keys(stateModel).reduce(function(newState, key)
		{
			const prop = stateModel[key];

			if (!prop || Object.prototype.toString.call(prop) !== '[object Object]')
				return newState;

			// Property
			if (Object.keys(prop).every(k => ['saved', 'default', 'validator'].includes(k)))
				newState[key] = checkProp(prop, storedState[key]) ? storedState[key] : resolveDefault(prop.default);

			// Module
			else newState[key] = Object.keys(prop).reduce((newModule, subkey) => {
				newModule[subkey] = checkProp(prop[subkey], (storedState[key] || {})[subkey]) ? storedState[key][subkey] : resolveDefault(prop[subkey].default);
				return newModule;
			}, {});

			return newState;
		}, {}));

		// Subscribe to the store and save the state upon every mutation
		store.subscribe((_, state) => localStorage.setItem(options.namespace, JSON.stringify(state)));
	};
}

/**
 * Take an object of the form [key]: {options}
 * and returns an object of the form [key]: <defaultValue>
 */
export function getVuexState(state)
{
	return Object.keys(state).reduce((result, key) => { result[key] = resolveDefault(state[key].default) || null; return result; }, {});
}