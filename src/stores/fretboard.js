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
import Vue                           from 'vue'
import { make }                      from 'vuex-pathify'
import { getVuexState }              from './vuex-plugin-save-state'

import { instruments, tuningsNames, tunings } from '@/modules/music'
import { makeTogglers }              from '@/modules/pathify'
import { MAX_NB_CAPOS }              from '@/modules/constants'

/**
 * State
 */
const model = {
	instrument: {
		default: 'guitar',
		validator: v => (v in instruments),
		saved: false,
	},
	tuning: {
		default: 'standard',
		validator: v => (v in tuningsNames),
		saved: false,
	},
	customTuning: {
		default: ['E','A','D','G','B','E'],
		validator: v => Array.isArray(v),
		saved: false,
	},
	/** Which strings are we displaying notes on? */
	enabledStrings: {
		default: [true,true,true,true,true,true],
		validator: v => Array.isArray(v),
		saved: false,
	},
	/** Bug 20260914-4 (Bradley: "Do you think we could add two capos at the
	 *  same time?"). One entry per physical capo on the neck, each
	 *  independent: `{ fret, releasedStrings, leversExpanded }`.
	 *  - `fret`: the fret this capo clamps at.
	 *  - `releasedStrings`: per string (physical order, index 0 = low E,
	 *    resized on instrument change same as enabledStrings), true means
	 *    that string's lever on THIS capo is popped -- it ignores this one
	 *    capo and falls back to whatever (if anything) else is still
	 *    clamping it.
	 *  - `leversExpanded`: this capo's own master switch -- red/false shows
	 *    the plain clamped look with no per-string levers on this bar;
	 *    green/true reveals them. Flipping back to red force-clamps every
	 *    string on this capo (releasedStrings all false) -- "fully clamped"
	 *    must never secretly mean a string is still released behind a
	 *    hidden lever.
	 *  A string's real effective capo fret is the HIGHEST fret among every
	 *  capo still clamping it (see effectiveCapo() in fretboard2.js) -- two
	 *  capos on the same string is physically just "the top one wins."
	 */
	capos: {
		default: [],
		validator: v => Array.isArray(v),
		saved: false,
	},
	fretRange: {
		default: [0, 24],
		validator: v => Array.isArray(v) && v.length == 2,
		saved: false,
	},
	noteInfos: {
		default: 'name',
		validator: v => typeof v == 'string' && ['none', 'name', 'degree', 'interval'].includes(v),
		saved: false,
	},
	isShowingFretNbs: {
		default: true,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	isShowingNoteNames: {
		default: true,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	isFlippedHor: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	isFlippedVert: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	noteSize: {
		default: 0.64,
		validator: v => typeof v == 'number' && v >= 0.5 && v <= 1.5,
		saved: false,
	},
	fretNbSize: {
		default: 1.7,
		validator: v => typeof v == 'number' && v >= 0.3 && v <= 3.0,
		saved: false,
	},
	/** 0 = Auto (see ovalWidthFor() in fretboard2.js), else a fixed 1-6. */
	ovalFretWidth: {
		default: 0,
		validator: v => typeof v == 'number' && v >= 0 && v <= 6,
		saved: false,
	},

	// ── Tuner ────────────────────────────────────────────────────────────────
	/** Is Tuner mode active? */
	tunerActive: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},

	// ── Song mode ────────────────────────────────────────────────────────────
	/** Is Jam mode's chord box open (Ctrl-J)? */
	jamModeActive: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	/** Text the Jam box opens with -- set by a ?chart=... link. */
	jamText: {
		default: '',
		validator: v => typeof v == 'string',
		saved: false,
	},
	/** Jam chart volumes (0-3, 1 = normal), set by the sliders in the Jam box
	 *  so the strums and click can be heard over a recording (Phil, 2026-10-27:
	 *  "It is hard to hear them over chordify"). Chords also follow the MIDI
	 *  Settings volume. */
	jamChordVolume: {
		default: 1,
		validator: v => typeof v == 'number' && v >= 0 && v <= 3,
	},
	jamClickVolume: {
		default: 1,
		validator: v => typeof v == 'number' && v >= 0 && v <= 3,
	},
	/** Is the Song panel (chord list -> fretboard setups) open? */
	songModeActive: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},

	// ── Audio preview ────────────────────────────────────────────────────────
	/**
	 * Audio mode: clicking the nut/notes plays sound, and string muting is
	 * off (Phil + Bradley's audio protocol -- one mode or the other). Off by
	 * default. Toggled by the Audio switch under the Instrument button, or
	 * Ctrl-A.
	 */
	audioPreviewActive: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	/**
	 * User's chosen MIDI voice per instrument (e.g. 'guitar' -> 'distortion_
	 * guitar'), set via the "MIDI Settings" picker in FretboardSettings.vue.
	 * An instrument not present here just uses audioPreview.js's own default
	 * (GM_INSTRUMENT_FOR) -- this only holds explicit overrides.
	 */
	instrumentVoices: {
		default: () => ({}),
		validator: v => typeof v == 'object',
		saved: false,
	},

	/**
	 * Amplitude envelope for Audio Preview's sampled voice, global across
	 * every instrument (Phil: "one global set applies to whatever
	 * instrument is fine"), set via the "MIDI Settings" panel. Defaults
	 * match sample-player's own built-in defaults exactly, so leaving these
	 * untouched sounds identical to before this panel existed.
	 */
	midiAttack: {
		default: 0.01, // seconds to fade in to full volume
		validator: v => typeof v == 'number',
		saved: false,
	},
	midiDecay: {
		default: 0.1, // seconds to drop from that peak to the sustain level
		validator: v => typeof v == 'number',
		saved: false,
	},
	midiSustain: {
		default: 0.9, // volume (0-1) held at while the note keeps ringing
		validator: v => typeof v == 'number',
		saved: false,
	},
	midiRelease: {
		default: 0.3, // seconds to fade to silence once the note ends
		validator: v => typeof v == 'number',
		saved: false,
	},
	midiDuration: {
		default: 0.7, // seconds before the note is cut off and starts its release
		validator: v => typeof v == 'number',
		saved: false,
	},
	/**
	 * Live drive/distortion amount (0-1), a genuine downstream signal effect
	 * applied to whichever sampled voice is playing -- not another discrete
	 * voice choice. 0 is true bypass; see audioPreview.js's setDriveAmount.
	 */
	midiDrive: {
		default: 0,
		validator: v => typeof v == 'number',
		saved: false,
	},
	/**
	 * Master volume multiplier for Audio Preview (1 = the original loudness,
	 * 0 = silent), set via the Sound section of the MIDI Settings panel.
	 */
	midiVolume: {
		default: 1,
		validator: v => typeof v == 'number',
		saved: false,
	},

	// ── ROYGBIV ──────────────────────────────────────────────────────────────
	/** Is ROYGBIV mode active? */
	roygbivActive: {
		default: false,
		validator: v => typeof v == 'boolean',
		saved: false,
	},
	/**
	 * Set of noteIndex values (0–11) currently sounding.
	 * Written by RoygbivPanel every animation frame.
	 * Not persisted — always starts empty.
	 */
	roygbivLitNotes: {
		default: () => ({}),
		validator: v => typeof v == 'object',
		saved: false,
	},
	/**
	 * Scale map: noteIndex → { degIdx, color: { name, hex }, label }
	 * Written by RoygbivPanel when root or scale changes.
	 */
	roygbivScaleMap: {
		default: () => ({}),
		validator: v => typeof v == 'object',
		saved: false,
	},
};

const state = getVuexState(model);

/**
 * Mutations
 */
const mutations = {
	...make.mutations(state),
	...makeTogglers(state),

	// Reset the tuning to the default when switching between different instruments
	instrument(state, value) {
		state.tuning       = 'standard';
		state.instrument   = value;
		state.customTuning = tunings[state.instrument]['standard'].slice();
		state.enabledStrings = new Array(instruments[state.instrument].nbStrings).fill(true);
		// Keep each capo's own fret, but resize/reset its per-string state --
		// the old strings' released/expanded state doesn't carry meaning on a
		// different-stringed instrument.
		const nbStrings = instruments[state.instrument].nbStrings;
		state.capos = state.capos.map(capo => ({
			fret:             capo.fret,
			releasedStrings:  new Array(nbStrings).fill(false),
			leversExpanded:   false,
		}));
	},

	addCapo(state) {
		if (state.capos.length >= MAX_NB_CAPOS) return;
		const nbStrings = instruments[state.instrument].nbStrings;
		// Bug 20260923-3 follow-up -- default to the lowest fret not already
		// taken by an existing capo (1-12, matching FretboardSettings.vue's
		// capoFrets range), rather than always fret 1, which would collide
		// with an existing capo there and hand back a dropdown whose bound
		// value isn't even among its own (collision-filtered) options.
		const usedFrets = new Set(state.capos.map(c => c.fret));
		let fret = 1;
		while (usedFrets.has(fret) && fret < 12) fret++;
		state.capos.push({
			fret,
			releasedStrings: new Array(nbStrings).fill(false),
			leversExpanded:  false,
		});
	},
	removeCapo(state, index) {
		state.capos.splice(index, 1);
	},
	// Generic per-capo field setter, same shape as sequences/update.
	// Collapsing a capo's own master lever back to red/clamped
	// force-clamps every string on THAT capo too -- "fully clamped" must
	// never secretly mean a string is still released behind a hidden lever.
	updateCapo(state, {index, prop, value}) {
		Vue.set(state.capos[index], prop, value);
		if (prop === 'leversExpanded' && !value) {
			Vue.set(state.capos[index], 'releasedStrings', state.capos[index].releasedStrings.map(() => false));
		}
	},

	setInstrumentVoice(state, {instrument, voice}) {
		Vue.set(state.instrumentVoices, instrument, voice);
	},

	// ROYGBIV helpers
	roygbivLitNotes(state, noteSet) {
		state.roygbivLitNotes = noteSet;
	},
	roygbivScaleMap(state, map) {
		state.roygbivScaleMap = map;
	},
	roygbivActive(state, val) {
		state.roygbivActive = val;
		if (!val) state.roygbivLitNotes = {};
	},
};

export default { namespaced: true, model, state, mutations }