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
const colors = {
	sun:                        '#ffb610',
	cinnabar:                   '#e54124',
	crimson:                    '#e1112c',
	malachite:                  '#1bb934',
	azure:                      '#0093ee',
	portage:                    '#ab7ef6',

	athensGray:                 '#fafbfc',
	snow:                       '#f0f0f0',
	regentStBlue:               '#a9c7df',
	nepal:                      '#8eacc5',

	slateGray:                  '#50596c',
	oxfordBlue2:                '#39475b',
	oxfordBlue:                 '#323e4f',
	ebonyClay2:                 '#283243',
	ebonyClay:                  '#232d3d',
	mirage2:                    '#1c2532',
	mirage:                     '#171e29',
	black:                      '#222222',
};

const colorscheme = {
	'--color--bg':              ['white',              colors.mirage],
	'--color--bg--accent':      [colors.athensGray,    '#eeeeee'],
	'--color--bg--highlight':   [colors.snow,          colors.ebonyClay],
	'--color--bg--tooltip':     ['#171e29',     '#171e29'],

	'--color--border':          ['lightgray',          colors.oxfordBlue],
	'--color--drop-shadow':     ['#00000088',          '#000000EE'],

	'--color--text':            [colors.black,         'white'],
	'--color--text--secondary': ['gray',               colors.oxfordBlue2],
	'--color--text--inverted':  ['white',              'black'],

	'--color--hover':           [colors.azure,         colors.azure],
	'--color--highlight':       [colors.sun,           colors.sun],

	'--color--string':          [colors.black,         colors.oxfordBlue],
	'--color--fret':            ['darkgray',           colors.ebonyClay],

	'--color--red':             [colors.crimson,       colors.crimson],
	'--color--orange':          [colors.cinnabar,      colors.cinnabar],
};

module.exports = {
	colors,
	colorscheme,
}
