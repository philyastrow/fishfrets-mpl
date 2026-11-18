<!--
  This file is part of FishFrets and is derived from Fretboarder
  (https://github.com/cheap-glitch/fretboarder).

  Original work Copyright (c) 2019-2021, cheap glitch
  Modifications Copyright (c) 2022-2026, Bradley Fish and Phil Yastrow

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--{{{ Pug -->
<template lang="pug">

mixin extra-tools
	//- Focus
	VButton(
		text="Focus"
		icon="bullseye"

		v-show="nbSequences > 1"
		:is-active="isFocused"

		@click="$store.commit('sequences/toggleFocus', index)"
		)
	//- Show intersections only
	VButton(
		text="Intersect"
		:icon="['fas', 'cross']"

		v-show="nbSequences > 1"
		:is-active="isIntersected"

		@click="update('isIntersected', !isIntersected)"
		)
	//- Oval (only for chord-type scales per Bradley Fish)
	VButton(
		text="Oval"
		icon="circle"
		v-show="ovalAvailable"
		:is-active="showOval"
		@click="update('showOval', !showOval)"
		)
	//- Duplicate
	VButton(
		text="Duplicate"
		icon="copy"

		:is-disabled="nbSequences == MAX_NB_SEQUENCES"

		@click="$store.commit('sequences/duplicate', index)"
		)

div.FretboardSequencesItem
	//- Infos bar (mobile only)
	div.mobile-info-bar(
		v-if="isMobileDevice"

		:style="{ backgroundColor: color }"
		@click.left="isOpen = !isOpen"
		)
		p {{ infos }}
		font-awesome-icon.mobile-info-bar__chevron(:icon="['fas', isOpen ? 'chevron-up' : 'chevron-down']")

	//- Settings & tools
	transition(name="fade"): div.settings(v-show="isOpen || !isMobileDevice")

		//----------------------------------------------------------------------
		//- Color picker (its own grid column -- see .settings -- so the
		//- dropdowns/pills/tools rows below all share one left edge instead
		//- of the pills+tools rows wrapping flush to the far left, under the
		//- dot, while the dropdown row alone sits indented past it)
		//----------------------------------------------------------------------
		div.color-picker(v-if="!isMobileDevice")
			div.dot(:style="{ backgroundColor: color }")
			VPopupMenu(icon="paint-roller")
				div.dot.click(
					v-for="color of SEQ_COLORS"
					:style="{ backgroundColor: color, margin: '0.5em'  }"
					@click="() => changeColor(color)"
					)

		//----------------------------------------------------------------------
		//- Properties
		//----------------------------------------------------------------------
		div.properties
			//- Tonality
			VSelect(
				:value="tonality"
				:options="tonalities"
				:is-contained="isMobileDevice"

				@change="v => update('tonality', v)"
				)
			//- Model -- bug 20260923-6 (Bradley: "search bar for scale/arpeggio
			//- name"). VScaleSearch instead of VSelect specifically for this
			//- one picker; every other dropdown here is unchanged.
			VScaleSearch(
				:value="model"
				:options="modelOptions"
				:is-contained="isMobileDevice"

				@change="v => update('model', v)"
				)
			//- Position
			VSelect(
				:value="position"
				:options="positions"
				:is-contained="isMobileDevice"
				:resort-options="true"

				@change="v => update('position', parseInt(v, 10))"
				)
			//- Harmony interval
			VSelect(
				:value="harmonyInterval"
				:options="harmonyOptions"
				:is-contained="isMobileDevice"

				@change="v => update('harmonyInterval', parseInt(v, 10))"
				)
			//- Skip string toggle
			label.skip-string-label(v-if="harmonyInterval > 0")
				input(
					type="checkbox"
					:checked="harmonySkipString"
					@change="e => update('harmonySkipString', e.target.checked)"
				)
				|  Skip String

			//----------------------------------------------------------------------
			//- Intervals -- a flex item WITHIN .properties (not a sibling grid
			//- row) so the pills continue right after the dropdowns whenever
			//- there's room, and only wrap onto their own line when there isn't
			//- -- and when they do wrap, the new line starts at .properties'
			//- own left edge (already aligned via .settings' grid column), not
			//- flush with the color picker (Phil: forcing pills onto their own
			//- row unconditionally wasted a full row's width of empty space
			//- whenever the window was wide enough to fit them next to "No
			//- harmony" anyway).
			//----------------------------------------------------------------------
			div.intervals
				FretboardSequencesItemInterval(
					v-for="interval of intervals"
					:key="`sequence--${index}--interval--${interval.value}`"

					v-bind="interval"
					:is-selected="highlightedInterval == interval.value"

					@update-interval="v => update('highlightedInterval', v)"
					)

			//----------------------------------------------------------------------
			//- Tools -- also a flex item inside .properties now, same reason as
			//- Intervals above: Hide/Duplicate/Remove should continue right
			//- after the pills whenever there's room instead of being forced
			//- onto their own row unconditionally (Phil: "it wraps to the Hide
			//- button after it shows the scale degrees" -- there was plainly
			//- room left on that line, .tools just wasn't allowed to use it).
			//----------------------------------------------------------------------
			div.tools(v-mods="{isMobileDevice}")
				//- Show/Hide
				VButton(
					:text="isVisible ? 'Hide' : 'Show'"
					:icon="isVisible ? 'eye' : 'eye-slash'"
					is-flipped

					@click="update('isVisible', !isVisible)"
					)

				//- Show all notes -- only while some were hidden by hand by
				//- clicking them with Audio off (bug 20261012-2)
				VButton(
					v-if="nbHiddenNotes"
					:text="`Show all notes (${nbHiddenNotes} hidden)`"
					icon="eye"

					@click="$store.commit('sequences/showAllNotes', index)"
					)

				//- Extra tools
				template(v-if="isMobileDevice || isWideScreen"): +extra-tools
				template(v-else): VPopupMenu(icon="ellipsis"): div.tools__extra: +extra-tools

				//- Remove
				VButton(
					text="Remove"
					icon="circle-xmark"

					@click="$store.commit('sequences/remove', index)"
					)

	CustomScaleNotes(:index="index")

	CustomFretRange(:index="index")


</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get }                        from 'vuex-pathify'

import { MAX_NB_SEQUENCES, NB_FRETS, SEQ_COLORS } from '@/modules/constants'
import { models, notes, notesNames }  from '@/modules/music'
import { modelOptions } from '@/modules/models'
import { 
	intervalsForSequence, formatPositionNumber
}                                     from '@/modules/intervals'
import { resolveNoteName }            from '@/modules/notenames'


import FretboardSequencesItemInterval from '@/components/FretboardSequencesItemInterval'
import CustomScaleNotes               from '@/components/CustomScaleNotes'
import CustomFretRange                from '@/components/CustomFretRange'

export default {
	name: 'FretboardSequencesItem',

	components: {
    FretboardSequencesItemInterval,
    CustomScaleNotes,
	CustomFretRange
},

	props: {
		index: {
			type: Number,
			required: true,
		},
		tonality: {
			type: String,
			required: true,
		},
		model: {
			type: String,
			required: true,
		},
		position: {
			type: Number,
			required: true,
		},
		color: {
			type: String,
			required: true,
		},
		highlightedInterval: {
			type: Number,
			default: null,
		},
		isVisible: {
			type: Boolean,
			default: true,
		},
		isFocused: {
			type: Boolean,
			default: false,
		},
		isIntersected: {
			type: Boolean,
			default: false,
		},
		showOval: {
			type: Boolean,
			default: false,
		},
		harmonyInterval: {
			type: Number,
			default: 0,
		},
		harmonySkipString: {
			type: Boolean,
			default: false,
		},
		nbSequences: {
			type: Number,
			required: true,
		},
	},

	data() {
		return {
			isOpen: false,
		}
	},

	computed: {
		infos() {
			return `${notesNames[this.tonality]} ${models[this.model].name} ${this.isArpeggio(this.model) ? 'arpeggio' : 'scale'}`;
		},
		sequence() {
			return this.sequences[this.index];
		},
		nbHiddenNotes() {
			return (this.sequence.hiddenFrets ?? []).length;
		},
		intervals() {
			const intervals = intervalsForSequence(this.sequence);
			return [0, ...intervals].map(interval => ({
				note:  resolveNoteName(
					notesNames[notes[(notes.indexOf(this.tonality) + interval) % notes.length]],
					this.sequence.tonality,
					models[this.sequence.model].mode,
					this.sequence.model
				),
				value: interval,
			}))
		},
		/** Does the selected model (scale/arpeggio interval pattern)
		 *  have (finger) positions provided?
		 */
		hasPositions() {
			return ('positions' in models[this.model]);
		},
		ovalAvailable() {
			return this.model.startsWith('arp-');
		},
		SEQ_COLORS() {
			return SEQ_COLORS;
		},
		/** Which text options are we displaying for positions? */
		harmonyOptions() {
			return {
				0: 'No harmony',
				2: '2nds',
				3: '3rds',
				4: '4ths',
				5: '5ths',
				6: '6ths',
				7: '7ths',
				8: '8ths',
			};
		},
		positions() {
			const positions = {};
			positions[0] = 'whole';
			positions[-2] = 'open';
			for (let i=1; i<=NB_FRETS; ++i) {
				positions[i] = formatPositionNumber(i);
			}
			positions[-1] = 'custom';
			return positions;
		},
		tonalities() {
			return {
				'A': 'A',
				'Bb': 'A♯/B♭',
				'B': 'B',
				'C': 'C',
				'Db': 'C♯/D♭',
				'D': 'D',
				'Eb': 'D♯/E♭',
				'E': 'E',
				'F': 'F',
				'Gb': 'F♯/G♭',
				'G': 'G',
				'Ab': 'G♯/A♭'
			}
		},

		...get([
			'isMobileDevice',
			'isWideScreen',
		]),
		...get('fretboard', ['customTuning','tuning', 'instrument']),
		...get('sequences', ['sequences'])
	},

	created() {
		this.modelOptions     = modelOptions;
		this.MAX_NB_SEQUENCES = MAX_NB_SEQUENCES;
	},

	methods: {
		update(prop, value) {
			this.$store.commit('sequences/update', { index: this.index, prop, value });
			if (prop === 'model' && !value.startsWith('arp-') && this.showOval) {
				this.$store.commit('sequences/update', { index: this.index, prop: 'showOval', value: false });
			}
		},
		isArpeggio(model) {
			return model.startsWith('arp-');
		},
		changeColor(color) {
			this.update('color', color);	
		}
	}
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.dot {
	@include circle(20px);
	flex: 0 0 auto;

	&.dot.dot { margin-right: 20px; }
}

.mobile-info-bar {
	display: flex;
	justify-content: space-between;
	font-size: initial;

	padding: 16px 16px 16px 14px;

	color: var(--color--text);
}

.mobile-info-bar__chevron {
	font-size: 1.4rem;
}

.settings {
	@include mq($from: desktop) {
		// A plain flex-wrap row put the color dot+paint-roller in-line with
		// the dropdowns (row 1 only), so when the pills/tools rows wrapped
		// onto their own lines they started flush with the dot at the far
		// left instead of lining up under the dropdowns -- a wrapped flex
		// line always starts at the container's own edge, it has no way to
		// "remember" an earlier line's indent. A 2-column grid gives the
		// dot+paint-roller its own column once, so every row after it
		// (dropdowns, pills, tools) shares column 2's left edge for free
		// (Phil, follow-up to the pill-wrap fix: "still not good").
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 20px;
		row-gap: 10px;
		align-items: start;

		border-radius: 10px;
	}
}

.color-picker {
	@include mq($from: desktop) {
		display: flex;
		align-items: center;
		grid-column: 1;
		grid-row: 1;
	}
}

.properties {
	@include mq($from: desktop) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		// Was flex-end, back when .properties filled exactly its own content
		// width as a flex item -- now it's a full 1fr grid column, and
		// flex-end would float the dropdowns to the far right of that
		// column instead of starting right after the color picker, which
		// is exactly the misalignment this whole change is fixing.
		justify-content: flex-start;
		@include space-children-h(10px);

		grid-column: 2;
		grid-row: 1;
	}
}

.intervals {
	display: grid;
	grid-auto-rows: auto;
	grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
	gap: 1px;

	@include mq($until: desktop) {
		// Fix for the box-shadow border hack
		margin-bottom: 1px;
	}

	@include mq($from: desktop) {
		// Fixed 60px grid columns left each pill sitting flush-left in a
		// slot wider than its own text ("A 1" vs "C ♭3" vs "F ♭6" are all
		// different widths), so the gap AFTER a short pill looked bigger
		// than the gap after a long one -- inconsistent, not actually
		// aligned to a grid at all visually (Phil, follow-up to the pill-
		// wrap fix: "needs a little better alignment"). Flexbox with wrap
		// gives every pill its own natural width and one true, uniform
		// gap on every side. This is now a flex ITEM inside .properties
		// (see the template) rather than its own grid row -- it sizes to
		// its own content and only drops to a new line within .properties
		// when there genuinely isn't room after the dropdowns.
		display: flex;
		flex-wrap: wrap;
		align-content: center;
		gap: 10px;
	}
}

.custom-scale-notes {
	font-size: 3rem;
}

.tools {

	@include mq($until: desktop) {
		display: grid;
		grid-auto-rows: auto;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 1px;

		// Fix for the box-shadow border hack
		//margin-bottom: 1px;
	}

	@include mq($from: desktop) {
		display: flex;
		flex-wrap: wrap;
		@include space-children-h(10px);

		margin-bottom: 8px;
	}

	--color--text: var(--color--text--inverted);
	--color--bg--highlight: white;
}

.tools.is-mobile-device {
	// FIXME hacky fix that assumes dark theme.
	--color--text: white;
}

.tools__extra {
	@include center-column;
	@include space-children-v(10px);
}

.click {
	cursor: pointer;
}

.skip-string-label {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.85em;
	cursor: pointer;
	padding: 2px 4px;
	color: var(--color--text);
}

</style>
<!--}}}-->
