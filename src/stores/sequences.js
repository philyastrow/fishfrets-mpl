/*
 * This file is part of FishFrets and is derived from Fretboarder
 * (https://github.com/cheap-glitch/fretboarder).
 *
 * Original work Copyright (c) 2019-2021, cheap glitch
 * Modifications Copyright (c) 2022-2026, Phil Yastrow and Bradley Fish
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import Vue                  from 'vue'

import { getVuexState }     from './vuex-plugin-save-state'

import { MAX_NB_SEQUENCES } from '@/modules/constants'
import { SEQ_COLORS }       from '@/modules/constants'
import { isObject, mapObjectToObject }         from '@/modules/object'
import { notesNames } from '@/modules/music'

/**
 * State
 */
const model = {
	sequences: {
		default: [],
		validator: v => Array.isArray(v) && v.every(item => isObject(item)),
	},
};
const state = getVuexState(model);
// Bug 20260908-2 (Bradley: "Perhaps Cntrl-Z Undo should be an option? So if
// you accidentally delete a scale, etc you can go back"). Narrow scope, per
// Phil: only the single most recently removed sequence is remembered, not a
// full undo history -- deliberately not part of `model` above, so it's
// plain in-memory state that doesn't persist across a reload (undoing a
// removal from a previous session wouldn't make sense).
state.lastRemoved = null;

/**
 * Getters
 */
const getters = {
	// Focus only scopes which sequence the position arrows move (see
	// displayedSequencesForState in stores/main.js) -- it must not hide other
	// visible sequences from the fretboard itself (bug 20260729-3).
	displayedSequences: state => state.sequences.filter(seq => seq.isVisible),
};

/**
 * Mutations
 */
const mutations = {
	add(state) {
		addSequence(state);
	},
	duplicate(state, index) {
		addSequence(state, state.sequences[index]);
		// Assign a new ID to the duplicated sequence.
		state.sequences[state.sequences.length-1].id = Math.random();
	},
	update(state, params) {
		const seq = state.sequences[params.index];
		// Hand-hidden notes (bug 20261012-2) belong to one scale in one key --
		// choosing a new scale or key brings every note back.
		if (['model', 'tonality'].includes(params.prop) && seq[params.prop] !== params.value)
			Vue.set(seq, 'hiddenFrets', []);
		Vue.set(seq, params.prop, params.value);
	},
	/** Hide or un-hide one note ("physicalString:fret" key) in the sequence
	 *  with this id (bug 20261012-2). */
	setFretHidden(state, { id, key, hidden }) {
		const seq = state.sequences.find(s => s.id === id);
		if (!seq) return;
		const rest = (seq.hiddenFrets ?? []).filter(k => k !== key);
		Vue.set(seq, 'hiddenFrets', hidden ? [...rest, key] : rest);
	},
	showAllNotes(state, index) {
		Vue.set(state.sequences[index], 'hiddenFrets', []);
	},
	toggleFocus(state, index) {
		state.sequences.forEach((seq, i) => Vue.set(seq, 'isFocused', i == index && !seq.isFocused));
	},
	hideAll(state) {
		state.sequences.forEach(seq => Vue.set(seq, 'isVisible', false));
	},
	remove(state, index) {
		// Snapshot for Ctrl-Z (bug 20260908-2) -- cloned, not the live
		// reactive object, purely as defensive hygiene (nothing in this
		// module currently mutates a sequence's nested fields in place, but
		// a shallow spread here costs nothing and rules it out for good).
		state.lastRemoved = {
			index,
			sequence: {
				...state.sequences[index],
				customSequence:   { ...state.sequences[index].customSequence },
				customFretBounds: [...state.sequences[index].customFretBounds],
			},
		};

		state.sequences.splice(index, 1);

		// Disable showing intersections if there is only one sequence left
		if (state.sequences.length == 1)
			Vue.set(state.sequences[0], 'isIntersected', false);
	},
	removeAll(state) {
		state.sequences = [];
	},
	undoRemove(state) {
		if (!state.lastRemoved) return;
		// Respect the same cap addSequence() enforces -- a direct splice
		// bypasses that helper (it needs to land back at its original
		// index, not the end of the list), so the cap isn't inherited for
		// free the way add/duplicate get it.
		if (state.sequences.length >= MAX_NB_SEQUENCES) return;

		const { index, sequence } = state.lastRemoved;
		state.sequences.splice(index, 0, sequence);
		state.lastRemoved = null;
	},
};

/**
 * Helpers
 */
function addSequence(state, params = {}) {
	// Limit the total number of sequences
	if (state.sequences.length >= MAX_NB_SEQUENCES) return;

	state.sequences.push({
		// Give the sequence a "unique" ID
		id:                  Math.random(),

		// Merge the provided parameters with the defaults
		model:               'min5',
		tonality:            'A',
		position:            0,

		// Map each note name to a boolean representing whether
		// the note is in our custom sequence.
		customSequence: mapObjectToObject(
			notesNames,
			// Default to a scale which contains no notes.
			() => false
		),

		// If position===-1, then use customPosition as the start/end
		// fret bounds.
		customFretBounds: [0,4], // Default to an open position.

		// Defaults for a plain "Add new scale/arpeggio" (no params). Sit
		// BEFORE the ...params spread below so Duplicate -- which passes the
		// whole source sequence as params -- carries these over instead of
		// always starting from scratch (Phil: "when you duplicate a
		// scale/arpeggio, the Ovals and Harmony aren't retained"). Building a
		// stack of arpeggios by duplicating one with oval mode already on,
		// tweaking key/position each time, is exactly the point of Duplicate.
		showOval:            false,
		harmonyInterval:     0,    // 0=none, 2=2nds, 3=3rds, 4=4ths, 5=5ths, 6=6ths, 7=7ths, 8=8ths
		harmonySkipString:   false, // true=only show pairs 2+ strings apart
		hiddenFrets:         [],    // notes hidden by hand, "physicalString:fret" (bug 20261012-2)

		...params, // Everything after here is forcefully reset for the clone.

		// Always reset the display parameters -- these are genuinely
		// per-instance, not something you'd want a duplicate to inherit.
		isVisible:           true,
		isFocused:           false,
		isIntersected:       false,
		highlightedInterval: 0,

		// Find the first color available
		color:               SEQ_COLORS.find(
			color => state.sequences.every(seq => seq.color != color)
		),
	});
}

export default { namespaced: true, model, state, getters, mutations }
