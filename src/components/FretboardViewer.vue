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

div.FretboardViewer(
	v-mods="{ isShowingFretNbs }"
	:style="{ '--note-size-scale': effectiveNoteSize, '--fret-nb-size-scale': effectiveFretNbSize }"
	)

	//- Frets
	FretboardViewerFret(
		v-for="(fret, index) of displayedFrets"
		:key="`fret--${fret.number}--${fret.string + 1}`"

		v-bind="fret"
		:displayed-infos="displayedInfos"

		:fret-min="fretMin"
		:is-on-last-string="fret.string + 1 == nbStrings"
		:is-showing-inlay="inlays.includes(`${fret.number}-${fret.string + 1}`)"
		:is-wide-inlay="wideInlays.includes(`${fret.number}-${fret.string + 1}`)"

		:is-fretboard-vertical="isVertical"
		:is-fretboard-flipped-hor="isFlippedHor"
		:is-fretboard-flipped-vert="isFlippedVert"

		:style="(isFlippedHor && !isVertical) ? { gridArea: `${fret.string + 1} / -${fret.number + 2 - fretMin} / span 1 / span 1` } : null"
		)

	//- Strings
	div.string(
		v-for="(string, index) of strings"
		:key="`string--${index + 1}`"

		:style="string"
		)

	//- Fret numbers
	div.fret-number(
		v-for="(style, index) of fretNumbers"
		v-if="shouldDisplayFretNumber(index)"
		:key="`fret-number--${index+1}`"

		v-show="isShowingFretNbs"
		v-mods="{ isVertical }"
		:style="style"
	)
		p.fret-number__text.hand-drawn(v-html="fretNumberLabel(index)")

	PositionBracket(
		v-for="(positionBracket,index) of positionBrackets"
		:key="positionBracket.fretNumber"
		:fretNumber="positionBracket.fretNumber"
		:color="positionBracket.color"
		:endFret="positionBracket.endFret"
		:flipY="index%2===1"
	)

	//- One bar + one master lever per capo (bug 20260914-4 follow-up,
	//- Bradley: "could we add two capos at the same time?") -- each capo is
	//- fully independent, so this is just the single-capo markup, repeated.
	img.capo(
		v-for="(capo, index) of capos"
		:key="`capo-bar--${index}`"
		src="capo.webp"
		:style="capoStyles[index]"
	)

	//- Partial-capo master lever (bug 20260914-4 UI follow-up, Phil: "one red
	//- button at the top of the capo... all the other buttons are hidden.
	//- When the red button is pressed, it turns to green and red levers are
	//- displayed"). Red/collapsed by default -- the ordinary single-capo
	//- look, no per-string levers shown. Green/expanded reveals them (see
	//- FretboardViewerFret.vue's own capo-lever, gated on this same flag).
	span.capo-master-lever(
		v-for="(capo, index) of capos"
		:key="`capo-master--${index}`"
		v-mods="{ isExpanded: capo.leversExpanded }"
		:style="capoMasterLeverStyles[index]"
		:title="capo.leversExpanded ? 'Partial capo — click to fully re-clamp' : 'Click to release individual strings'"
		@click="$store.commit('fretboard/updateCapo', {index, prop: 'leversExpanded', value: !capo.leversExpanded})"
	)

</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get }                  from 'vuex-pathify'

import { layout }               from '@/modules/layout'
import { instruments }          from '@/modules/music'
import { getFrets, scalePositionWindow, isFretHidden } from '@/modules/fretboard2'
import { ovalState }            from '@/modules/ovalState'
import { stackAware }           from '@/modules/stackContext'
import { noteMidi }             from '@/modules/audioPreview'
import { tuningNotes }          from '@/modules/tuning'
import { findBackground, positionForFretNumber, styleForCapo }       from '@/modules/background'


import FretboardViewerFret      from '@/components/FretboardViewerFret'
import PositionBracket from '@/components/PositionBracket'

export default {
	name: 'FretboardViewer',

	// Can be drawn again for the next-chord neck (stackContext.js).
	mixins: [stackAware],

	components: {
		FretboardViewerFret,
		PositionBracket
	},

	props: {
		isVertical: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/** One bar-position style per capo (bug 20260914-4 follow-up,
		 *  Bradley: "could we add two capos at the same time?") -- each capo
		 *  is otherwise fully independent, so styleForCapo (which only ever
		 *  knew about a single fret) just gets called once per capo.
		 */
		capoStyles() {
			const {backgroundSize,instrument,isLayoutLandscape,isFlippedHor,isFlippedVert} = this;
			return this.capos.map(capo => styleForCapo({backgroundSize,capo: capo.fret,instrument,isLayoutLandscape,isFlippedHor,isFlippedVert}));
		},
		/** Anchors each master lever to the same top-of-the-bar point its own
		 *  capo image is positioned from -- good enough for a first pass in
		 *  every orientation; exact spacing is the kind of thing to tune live
		 *  once Phil/Bradley have eyes on it (same as the accidental-spacing
		 *  and oval-width tuning elsewhere in this file's history).
		 */
		capoMasterLeverStyles() {
			return this.capoStyles.map(({left, top}) => ({left, top}));
		},
		grid() {
			// Banjo needs a wider open-string column so string name bubbles don't crowd fret 1
			const openStringWidth = this.instrument === 'banjo-5' ? '70px' : layout.openStringFretLength.px;
			let template = [...(this.fretMin == 0 ? [openStringWidth] : []), ...this.layout.map(track => `${track}fr`)];

			/**
			 * Invert the grid layout:
			 *  - when the fretboard is vertical (portait mode, e.g. on mobile) and "mirrored"
			 *  - when the fretboard is horizontal (desktop or mobile in landscape mode) and the fretting hand is flipped
			 */
			if (this.isVertical ? this.isFlippedVert : this.isFlippedHor) template.reverse();

			return {
				'grid-auto-flow': this.isVertical ? 'column' : 'row',
				[`grid-template-${this.isVertical ? 'rows'   : 'columns'}`]: template.join(' '),
			};
		},
		maxWidth() {
			// Limit the width of the fretboard in vertical mode
			return this.isVertical ? { width: `${(this.nbStrings - 1)*layout.fretWidth.int + this.fretNumbersPadding.int}px` } : {};
		},
		minLength() {
			/**
			 * The length of the fretboard must be so that the length
			 * of the smallest fret is equal or greater than a fixed minimum length
			 */
			const length = layout.minFretLength.int*(this.nbFrets / this.layout.slice(-1)[0]) + (this.fretMin == 0 ? layout.openStringFretLength.int : 0);

			return { [`min-${this.isVertical ? 'height': 'width'}`]: `${Math.ceil(length)}px` };
		},
		layout() {
			/**
			 * Compute the size of each fret so that:
			 *     - size(1) = 3/2
			 *     - size(n) = 1/2 (n = total number of frets)
			 *
			 * Which gives the following function:
			 *     f(x) = (3n - 1)/(2n - 2) - x/(n - 1)
			 */
			const n = this.nbFrets;
			const c = (3*n - 1)/(2*n - 2);

			// Don't include the open string fret in the flexible layout
			return [...Array(this.fretMin == 0 ? (this.nbFrets - 1) : this.nbFrets).keys()].map(i => c - i/(n - 1));
		},
		strings() {
			return [...Array(this.nbStrings).keys()].map(index => ({
				// Start & end
				[this.isVertical ? (this.isFlippedVert ? 'bottom' : 'top'   ) : (this.isFlippedHor ? 'right' : 'left' )]: this.fretMin == 0 ? layout.openStringFretLength.px : '0',
				[this.isVertical ? (this.isFlippedVert ? 'top'    : 'bottom') : (this.isFlippedHor ? 'left'  : 'right')]: 0,

				// Position
				[this.isVertical ? 'left': 'top']: `calc(calc(100% - ${this.fretNumbersPadding.px})*${index / (this.nbStrings - 1)})`,
				transform: this.isVertical ? `translateX(calc(${this.fretNumbersPadding.px} - 50%))` : 'translateY(-50%)',

				// Width
				[this.isVertical ? 'width' : 'height']: layout.stringThickness.px,
			}));
		},
		inlays() {
			// The guitar's master photo now has fish fret markers baked in
			// directly (Phil painted them into master_guitar.png) -- the
			// runtime-rendered fish would just double up on top of those.
			if (this.instrument === 'guitar') return [];

			// List the frets which can have an inlay (only the 12th is omitted)
			let frets = ['3', '5', '7', '9', '15', '17', '19', '21'];

			// The banjo's master photo already has real inlay dots baked in at
			// every fret below 17 -- our own fish markers there just doubled up
			// on top of them. Keep fish only at 17/19/21, where the photo
			// doesn't already have one (Bradley/Phil, reviewing the algorithm
			// changes together).
			if (this.instrument === 'banjo-5') {
				return ['17', '19', '21'].map(f => `${f}-2`);
			}

			switch (this.nbStrings) {
				/**
				 * Bass, ukulele, guitar
				 * Single inlay in the middle + double inlay at the 12th fret
				 */
				case 4:  return ['12-1', '12-3', ...frets.map(f => `${f}-2`)];
				case 6:  return ['12-2', '12-4', ...frets.map(f => `${f}-3`)];

				/**
				 * Five-string banjo/bass: single WIDE inlay for the regular frets
				 * (see wideInlays below -- Bradley: two small fish stacked on the
				 * middle strings looked cramped, one big one reads better and
				 * covers the real inlay dot baked into the master photo), still
				 * spread double at the 12th.
				 */
				case 5:  return ['12-1', '12-4', ...frets.map(f => `${f}-2`)];

				/**
				 * Seven-string guitar, mandolin, nine-, eleven- string guitar
				 * Double inlay (close for odd frets, spreaded for the 12th)
				 */
				case 7:  return ['12-2', '12-5', ...frets.map(f => `${f}-3`), ...frets.map(f => `${f}-4`)];
				case 8:  return ['12-2', '12-6', ...frets.map(f => `${f}-3`), ...frets.map(f => `${f}-5`)];
				case 9:  return ['12-2', '12-7', ...frets.map(f => `${f}-3`), ...frets.map(f => `${f}-6`)];
				case 11: return ['12-3', '12-8', ...frets.map(f => `${f}-4`), ...frets.map(f => `${f}-7`)];

				/**
				 * Ten-string guitar
				 * Double inlay for odd frets, triple for the 12th
				 */
				case 10: return ['12-2', '12-8', ...frets.map(f => `${f}-4`), ...frets.map(f => `${f}-6`), ['12-5']];
			}

			return [];
		},
		/** Which inlay entries (from `inlays` above) should render as one big
		 *  vertical fish spanning two string-gaps instead of the normal small
		 *  single-gap fish. Currently just the 5-string regular-fret markers
		 *  (3,5,7,9) -- fret 12's wider-spread pair stays as two small fish.
		 */
		wideInlays() {
			if (this.nbStrings !== 5) return [];
			return ['3', '5', '7', '9'].map(f => `${f}-2`);
		},
		displayedInfos() {
			return this.noteInfos;
		},
		displayedFrets() {
			return this.frets.filter(fret => this.fretMin <= fret.number && fret.number <= this.fretMax);
		},
		/** Index of the instrument's known short/drone string (banjo-5's g) in
		 *  `this.tuningNotes`'s current order -- that array reverses with
		 *  `this.flipped`, so this always matches whichever end it lands on.
		 */
		shortStringIndex() {
			return this.instrument === 'banjo-5' ? this.tuningNotes.length - 1 : -1;
		},
		frets() {
			const fretSemitones = findBackground(this.instrument).fretSemitones;
			const nbStrings = this.tuningNotes.length;
			const frets = getFrets(this.displayedSequences, this.tuningNotes, this.caposInOrder, this.flipped, this.shortStringIndex, 0, fretSemitones)
				// Notes hidden by hand (bug 20261012-2) leave the fret's sequences
				// but stay listed in hiddenSequences, so the fret can show faintly
				// on hover and be clicked back on.
				.map(fret => {
					const physicalString = this.flipped ? nbStrings - 1 - fret.string : fret.string;
					const isHidden = s => isFretHidden(s.sequence, physicalString, fret.number);
					if (!fret.sequences.some(isHidden)) return fret;
					return {
						...fret,
						sequences:       fret.sequences.filter(s => !isHidden(s)),
						hiddenSequences: fret.sequences.filter(isHidden),
					};
				});

			if (this.isFlippedVert)
				frets.reverse();

			return frets;
		},
		// Returns information about how to display fret numbers.
		fretNumbers() {
			const background = findBackground(this.instrument);
			return (background.fretNumbers??[]).map(
				(_,idx) => positionForFretNumber(idx, this.instrument, this.backgroundSize, this.isFlippedHor, this.isFlippedVert)
			);
		},
		fretNumbersPadding() {
			return this.isShowingFretNbs ? layout.fretNumberWrapperSize : { int: 0, px: '0px' };
		},
		/** Should the order of the strings be inverted? */
		flipped() {
			/**
			 * Invert the order of the strings (the topmost becomes the bottommost, etc.) when:
			 *   - the fretboard is vertical + mirrored and the fretting hand is NOT flipped
			 *   - the fretboard is horizontal and is not "mirrored" (i.e. flipped vertically)
			 */
			return !(
				(this.isVertical && this.isFlippedVert && !this.isFlippedHor)
				|| this.isFlippedVert
			);
		},
		tuningNotes() {
			const {instrument,tuning,customTuning} = this;
			const notes = tuningNotes({instrument,tuning,customTuning});
			
			if (this.flipped) notes.reverse();
			return notes;
		},
		/** Each capo's releasedStrings is always physical order (index 0 = low
		 *  E), same as enabledStrings -- reorder it exactly like tuningNotes
		 *  above so it lines up with getFrets' own string-index order, and
		 *  bundle it back up with that capo's own fret for getFrets/effectiveCapo.
		 */
		caposInOrder() {
			return this.capos.map(capo => ({
				fret: capo.fret,
				releasedStrings: this.flipped ? [...capo.releasedStrings].reverse() : capo.releasedStrings,
			}));
		},
		nbStrings() {
			return instruments[this.instrument].nbStrings;
		},
		nbFrets() {
			return this.fretMax - this.fretMin + 1;
		},
		fretMin() {
			return this.fretRange[0];
		},
		fretMax() {
			return this.fretRange[1];
		},
		positionBrackets() {
			// -1 is "custom" and 0 is "whole" -- neither gets a bracket.
			// -2 ("open") does get a bracket, same as numbered positions.
			const positionedSequences = this.displayedSequences.filter(
				sequence => sequence.position > 0 || sequence.position === -2
			);
			const uniquePositionedSequences = [...new Map(
				positionedSequences.map(sequence => [sequence.position,sequence])
			).values()];

			uniquePositionedSequences.sort(
				(a,b) => a.position - b.position
			);

			const fretSemitones = findBackground(this.instrument).fretSemitones;
			const brackets = uniquePositionedSequences.map(
				sequence => {
					const window = scalePositionWindow(sequence, this.tuningNotes, this.flipped, fretSemitones, this.shortStringIndex);
					return {
						fretNumber: sequence.position,
						color: sequence.color,
						endFret: window ? window.extendedUpper : null,
					};
				}
			);
			return brackets;
		},

		...get('fretboard', [
			'instrument',
			'tuning',
			'customTuning',
			'capos',
			'fretRange',

			'noteInfos',

			'isFlippedHor',
			'isFlippedVert',
			'isShowingFretNbs',
			'isShowingNoteNames',
			'noteSize',
		]),

		...get(['backgroundSize', 'isMobileDevice', 'isLayoutLandscape']),
		...get('fretboard', ['fretNbSize']),
		windowScale() {
			const w = this.backgroundSize.width;
			if (!w) return 1.0;
			// Scale proportionally with the rendered fretboard width.
			// At >= REFERENCE_WIDTH user size settings are honored unchanged.
			// Below that, everything shrinks so notes never crowd the frets.
			const REFERENCE_WIDTH = 1600;
			return Math.min(1.0, w / REFERENCE_WIDTH);
		},
		effectiveNoteSize() {
			return this.noteSize * this.windowScale;
		},
		effectiveFretNbSize() {
			return this.fretNbSize * this.windowScale;
		},
	},

	created() {
		if (!this.fishStack) ovalState.shownMidiNotes = () => this.shownMidiNotes();
	},

	beforeDestroy() {
		if (!this.fishStack) ovalState.shownMidiNotes = null;
	},

	methods: {
		/** MIDI notes of every note the fretboard is showing right now (in
		 *  an oval, or plain when there's no oval), on strings that can sound.
		 *  Jam mode's "A" setting plays these at each chord change, so what
		 *  you hear is exactly what you see. Asks each fret, so it follows the
		 *  same rules that decide what's drawn. */
		shownMidiNotes() {
			return this.$children
				.filter(c => c.$options.name === 'FretboardViewerFret'
					&& c.isActive && !c.isOvalHidden && !c.isHiddenByHand && c.isPlayableFret)
				.map(c => noteMidi({ instrument: this.instrument, physicalString: c.physicalString, note: c.note, fretNumber: c.number }));
		},
		shouldDisplayFretNumber(index) {
			// Custom label sets (e.g. a diatonic instrument's own fret numbering,
			// which doesn't match "index+1") define exactly which frets exist --
			// nothing extra to hide. The [19,21,23,25] hide-list below is a
			// chromatic-instrument declutter rule keyed on the raw fret number,
			// meaningless for an instrument with its own numbering scheme.
			const customLabels = findBackground(this.instrument).fretNumberLabels;
			if (customLabels) return true;

			// Banjo-5 only goes to fret 22, and its fish markers now sit
			// specifically at 17/19/21 (real inlays already cover everything
			// below that in the photo) -- hiding 19/21 here would leave two of
			// those three markers with no number underneath them. The
			// declutter rule below exists for longer, denser necks.
			if (this.instrument === 'banjo-5') return true;

			const nutOnRight = this.isFlippedHor !== this.isFlippedVert;
    		const displayNumber = nutOnRight ? (this.fretNumbers.length - index) : (index + 1);
    		return ![19, 21, 23, 25].includes(displayNumber);
		},
		/** The fret number label to display at this position, as HTML (so an
		 *  instrument can style part of its own label, e.g. a smaller "1/2" on
		 *  a traditional dulcimer's half-fret). Falls back to the plain
		 *  sequential numbering every other instrument uses.
		 */
		fretNumberLabel(index) {
			const nutOnRight = this.isFlippedHor !== this.isFlippedVert;
			const customLabels = findBackground(this.instrument).fretNumberLabels;
			if (customLabels) {
				const labelIndex = nutOnRight ? (customLabels.length - 1 - index) : index;
				return customLabels[labelIndex] ?? '';
			}
			return String(nutOnRight ? (this.fretNumbers.length - index) : (index + 1));
		}
	}
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.FretboardViewer {
	display: grid;
	/*position: relative;*/
}

.string {
	position: absolute;

	background-color: var(--color--string);
}

.fret-number {
	display: flex;
	position: absolute;
	top: 0;
	left: 0;
	font-size: calc(1em * var(--fret-nb-size-scale, 1.0));

	&.is-vertical {
		align-items: center;
		justify-content: flex-start;

		//width: layout.$fret-number-wrapper-size;
	}

	&:not(.is-vertical) {
		align-items: flex-end;
		justify-content: center;

		//height: layout.$fret-number-wrapper-size;
	}
}

.fret-number__text {
	z-index: 1; // Ensure that fret number is displayed over top of capo.
	//color: var(--color--text--secondary);
	font-weight: 700;
	color: white;
	@include center-position;
	@include outline-text(1px);

	// A traditional dulcimer's half-frets (6 1/2, 13 1/2) render the "1/2"
	// smaller than the whole-number part, like a real fraction.
	.fret-number__half {
		font-size: 0.55em;
	}
}

@include mq($until: desktop) {
	@media (orientation: portrait) {
		.FretboardViewer {
			margin: auto;

			&.is-large-instrument {
				margin-bottom: 20px;
			}

			&:not(.is-large-instrument).is-showing-fret-nbs {
				// Shift the fretboard to keep it horizontally centered when fret numbers are displayed
				//transform: translateX(layout.$fret-number-wrapper-size / -2);
			}
		}
	}

	// Add a margin on the right side
	@media (orientation: landscape) {
		.FretboardViewer { padding-right: 20px; }
		.string          { margin-right:  20px; }
	}
}

// Disable string, fret visibility because 
// background image includes these things.
.string {
	visibility: hidden;
}
.fret {
	border-right-width: 0;
}

.capo {
	position: absolute;
	top: 0;
	left: 0;
	width: 3em;
	transform: translate(-50%,-50px);
	z-index: 1;
}

// Partial-capo master lever (bug 20260914-4 UI follow-up) -- anchored to the
// same point as the capo bar's own top edge (capoMasterLeverStyle), nudged
// further up and out of the way of the bar/topmost string via the transform
// below rather than via the anchor point itself.
.capo-master-lever {
	position: absolute;
	// Phil, 2026-09-17: nudged down one button-diameter (22px) from its
	// first-pass spot.
	transform: translate(-50%, -100%) translateY(12px);
	z-index: 13;

	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 2px solid var(--color--border);
	background-color: #c0392b;

	cursor: pointer;

	transition: background-color 150ms;

	&:hover {
		filter: brightness(1.15);
	}

	&.is-expanded {
		background-color: #2ecc71;
	}
}

</style>
<!--}}}-->
