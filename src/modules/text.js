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
/**
 * Add the proper counter to a fret number
 */
export function formatFretNb(number) {
	if (number == 0)
		return 'Open strings';

	if (11 <= number && number <= 13)
		return `${number}th fret`;

	switch (`${number}`.slice(-1)) {
		case '1': return `${number}st fret`;
		case '2': return `${number}nd fret`;
		case '3': return `${number}rd fret`;
		default:  return `${number}th fret`;
	}
}

/**
 * Wrap the ordinal suffix of a number in a string inside a <sup> tag
 */
export function formatOrdinalSuffix(str) {
	return str.replace(/(\d)(st|nd|rd|th)/, '$1<sup>$2</sup>');
}

export function capitalizeWords(text) {
	return text.split(' ').map(capitalizeWord).join(' ');
}

function capitalizeWord(text) {
	if (text.length === 0) {
		return '';
	}
	else {
		return `${text[0].toUpperCase()}${text.slice(1)}`;
	}
}