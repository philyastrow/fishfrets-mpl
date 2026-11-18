<!--
  This file is part of FishFrets and is derived from Fretboarder
  (https://github.com/cheap-glitch/fretboarder).

  Original work Copyright (c) 2019-2021, cheap glitch
  Modifications Copyright (c) 2022-2026, Phil Yastrow and Bradley Fish

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--{{{ Pug -->
<template lang="pug">

div.FretboardSequencesItemInterval

	//- Button
	button.button(
		ref="button"
		v-mods="{ isSelected }"

		@click.left="$emit('update-interval', isSelected ? null : value)"

		@mouseenter="isTootlipOpen = true"
		@mouseleave="isTootlipOpen = false"
		)
		p.button__note {{ note }}
		p.button__interval(v-html="shortName")

	//- Tooltip
	VPopup.tooltip(
		v-if="!isMobileDevice"

		:target="$refs.button || false"
		:is-open="isTootlipOpen"
		)
		p.tooltip__text Highlight {{ name }} notes

</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get }                     from 'vuex-pathify'

import { intervalsNames, degrees, notesNames } from '@/modules/music'
import { resolveNoteName } from '../modules/notenames';

export default {
	name: 'FretboardSequencesItemInterval',

	props: {
		value: {
			type: Number,
			required: true,
		},
		note: {
			type: String,
			required: true,
		},
		isSelected: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			isTootlipOpen: false,
		}
	},

	computed: {
		name()      { return intervalsNames[this.value].toLowerCase(); },
		/** Note with sharps/flats corrected. */
		fixedNote() {
			// Find index of root note.
			const notes = Object.values(notesNames);

			let rootNoteIndex = notes.indexOf(this.note) - this.value;
			if (rootNoteIndex < 0) rootNoteIndex += notes.length;

			const rootNote = notes[rootNoteIndex];

			return resolveNoteName(this.note, rootNote);
		},
		shortName() { return degrees[this.value];                      },

		...get([
			'isMobileDevice',
		]),
	},
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.FretboardSequencesItemInterval {
	display: flex;

	@include mq($until: desktop) {
		// Simulate a border inside a grid
		box-shadow: 0 0 0 1px var(--color--border);
	}
}

.button {
	display: flex;
	align-items: center;
	justify-content: space-between;

	flex: 1 1 100%;

	padding: 14px;

	border: none;
	appearance: none;
	background-color: white;

	transition: color 200ms, border-color 200ms, background-color 200ms;

	cursor: pointer;

	&.is-selected {
		background-color: var(--color--bg--highlight);
	}

	&:focus {
		border-color: var(--color--hover);
	}

	@include mq($from: desktop) {
		@include pill;
		padding: 2px 8px;

		border: 1px solid var(--color--border);

		&:hover {
			background-color: var(--color--bg--highlight);
		}
	}
}

.button__note {
	//color: var(--color--text);
	cursor: pointer;
	margin-right: 8px;

	.button.is-selected             & { color: var(--color--highlight); }
	.button:not(.is-selected):hover & { color: var(--color--hover);     }
}

.button__interval {
	font-size: 1.35rem;

	color: var(--color--text--secondary);

	cursor: pointer;

	.button.is-selected             & { color: var(--color--text); }
	.button:not(.is-selected):hover & { color: var(--color--text); }
}

.tooltip {
	padding: 8px;

	color: var(--color--bg--tooltip);
	background-color: var(--color--bg--tooltip);
}

.tooltip__text {
	color: white;
}

</style>
<!--}}}-->
