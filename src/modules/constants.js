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
export const NB_FRETS         = 24;
export const MIN_NB_FRETS     = 5;
export const MAX_NB_FRETS     = 25;
export const MAX_NB_SEQUENCES = 5;
// Bug 20260914-4 follow-up (Bradley: "Do you think we could add two capos
// at the same time?") -- generalized to N capos rather than hardcoding 2,
// same cap as MAX_NB_SEQUENCES for consistency (and because a real guitar
// neck runs out of room for capos well before this).
export const MAX_NB_CAPOS     = 5;

export const SEQ_COLORS = [
	'#e20b1c', // Red
	'#0000fe', // Blue
	'#ff9000', // Orange
	'#06c400', // Green
	'#9613c7', // Purple
];

// Bidirectional maps for URL serialization of scale colors
export const SEQ_COLOR_NAMES = {
	'#e20b1c': 'red',
	'#0000fe': 'blue',
	'#ff9000': 'orange',
	'#06c400': 'green',
	'#9613c7': 'purple',
};
export const SEQ_COLOR_VALUES = Object.fromEntries(
	Object.entries(SEQ_COLOR_NAMES).map(([hex, name]) => [name, hex])
);
