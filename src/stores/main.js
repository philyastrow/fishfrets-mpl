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
import Vue                   from 'vue'
import Vuex                  from 'vuex'
import { make }              from 'vuex-pathify'
import { getVuexState }      from './vuex-plugin-save-state'
import { saveStatePlugin }   from './vuex-plugin-save-state'

import pathify               from '@/modules/pathify'
import { makeTogglers }      from '@/modules/pathify'
import { mapObjectToObject } from '@/modules/object'

import { layout }            from '@/modules/layout'
import sequences             from '@/stores/sequences'
import fretboard             from '@/stores/fretboard'
import { incrementPosition, decrementPosition, isValidPosition } from '@/modules/position'
import { NB_FRETS } from '@/modules/constants'
import { tuningNotes }       from '@/modules/tuning'
import { findBackground }    from '@/modules/background'

export const mediaQueries = {
	isMobileDevice:     window.matchMedia(`(max-width:            ${layout.mqBreakpointDesktop?.em})`),
	isTallScreen:       window.matchMedia(`(min-height: 500px)`),
	isWideScreen:       window.matchMedia(`(min-width:            ${layout.mqBreakpointWide?.em})`),
	isLayoutLandscape:  window.matchMedia('(orientation:          landscape)'),
	isSystemDarkModeOn: window.matchMedia('(prefers-color-scheme: dark)'),
}

/**
 * State
 */
const model = {
	darkModeSetting: {
		default: 'dark',
		validator: v => ['light', 'dark', 'system'].includes(v),
	},
	darkModeSystem: {
		saved: false,
		default: mediaQueries.isSystemDarkModeOn.matches,
	},
	...mapObjectToObject(mediaQueries, mq => ({
		saved: false,
		default: mediaQueries[mq].matches,
	})),
	backgroundSize: {
		saved: false,
		default: {width:0,height:0},
	},
	coordHelperActive: {
		saved: false,
		default: false,
	}
};
const state = getVuexState(model);

/**
 * Getters
 */
const getters = {
	isDarkModeOn: state => (state.darkModeSetting == 'system' && state.darkModeSystem) || state.darkModeSetting == 'dark',
};

function displayedSequencesForState(state) {
	state = state.sequences;
	return [].concat(state.sequences.find(seq => seq.isFocused) || state.sequences.filter(seq => seq.isVisible))
}

/**
 * Mutations
 */
const mutations = {
	...make.mutations(state),
	...makeTogglers(state),

	incrementPosition(state, payload) {
		const includeWeird   = payload?.includeWeird ?? false;
		// Position stepping stays deliberately capo-blind below this point --
		// Phil: "let's just leave it as is" rather than make it aware of
		// which strings are released. With multiple capos (bug 20260914-4
		// follow-up), the relevant floor is the HIGHEST fret among them, same
		// "nothing steppable below here" rule as a single capo.
		const capo           = state.fretboard.capos.length ? Math.max(...state.fretboard.capos.map(c => c.fret)) : 0;
		const tuning         = tuningNotes(state.fretboard);
		const enabledStrings = state.fretboard.enabledStrings;
		const ovalFretWidth  = state.fretboard.ovalFretWidth;
		const background     = findBackground(state.fretboard.instrument);
		const fretSemitones  = background.fretSemitones;
		// isValidPosition always works in canonical (unflipped, low-to-high)
		// tuning order -- a short/drone string (e.g. banjo-5's g) is listed
		// first there, not last like in the display-flipped order the
		// renderer uses (bug 20260824-3).
		const shortStringIndex = background.shortStringFret != null ? 0 : -1;
		const numFrets = background.numFrets ?? NB_FRETS;
		displayedSequencesForState(state).forEach(seq => {
			if (seq.position === 0) {
				Vue.set(seq, 'position', capo > 0 ? capo : -2);
				return;
			}
			let candidate = seq.position === -2 ? Math.max(1, capo) : Math.max(capo, incrementPosition(seq, tuning));
			// Bug 20260907-14: search bound must be this instrument's own
			// numFrets, not the global NB_FRETS -- otherwise a shorter-necked
			// instrument (bass-6 stops at 18, banjo-5 at 22, etc.) could keep
			// advancing past its last real fret looking for a "valid" position.
			while (candidate <= numFrets && !isValidPosition(seq, candidate, tuning, enabledStrings, ovalFretWidth, fretSemitones, includeWeird, shortStringIndex, numFrets, state.fretboard.jamModeActive)) {
				candidate++;
			}
			if (candidate <= numFrets) Vue.set(seq, 'position', candidate);
		});
	},
	decrementPosition(state, payload) {
		const includeWeird   = payload?.includeWeird ?? false;
		// See incrementPosition's comment above -- same capo-blind stepping,
		// generalized to "the highest fret among however many capos there are."
		const capo           = state.fretboard.capos.length ? Math.max(...state.fretboard.capos.map(c => c.fret)) : 0;
		const tuning         = tuningNotes(state.fretboard);
		const enabledStrings = state.fretboard.enabledStrings;
		const ovalFretWidth  = state.fretboard.ovalFretWidth;
		const background     = findBackground(state.fretboard.instrument);
		const fretSemitones  = background.fretSemitones;
		const shortStringIndex = background.shortStringFret != null ? 0 : -1;
		const numFrets = background.numFrets ?? NB_FRETS;
		displayedSequencesForState(state).forEach(seq => {
			if (seq.position === 0) return;
			if (capo > 0 && seq.position === -2) return;
			if (seq.position === -2) {
				Vue.set(seq, 'position', 0);
				return;
			}
			let candidate = decrementPosition(seq, tuning);
			// With a capo, open strings aren't reachable -- below the capo (or -2)
			// skips straight to Whole. Without a capo, -2 legitimately means Open.
			if (capo > 0 && (candidate === -2 || candidate < capo)) {
				Vue.set(seq, 'position', 0);
				return;
			}
			if (candidate === -2) {
				Vue.set(seq, 'position', -2);
				return;
			}
			while (candidate >= 1 && !isValidPosition(seq, candidate, tuning, enabledStrings, ovalFretWidth, fretSemitones, includeWeird, shortStringIndex, numFrets, state.fretboard.jamModeActive)) {
				candidate--;
			}
			if (candidate >= 1) Vue.set(seq, 'position', Math.max(capo, candidate));
			else Vue.set(seq, 'position', -2);
		});
	}
};

/**
 * Instantiate the store
 */
Vue.use(Vuex);
export default new Vuex.Store(
{
	strict: process.env.NODE_ENV === 'development',

	plugins: [
		pathify.plugin,
		saveStatePlugin({
			...model,
			sequences: sequences.model,
			fretboard: fretboard.model,
		}, {
			namespace:           'fretboarder@3.1',
			savedByDefault:      true,
			clearStorageOnError: process.env.NODE_ENV === 'production',
		}),
	],

	modules: {
		sequences,
		fretboard,
	},

	state, getters, mutations,
});
