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

div.FretboardViewerFret

	//- Tooltip to show the intervals of the hovered fret
	VPopup.tooltip(
		:target="$refs.note || false"
		:boundary="isMobileDevice ? 'app' : 'fretboard-wrapper'"
		:is-open="showTooltip"
		)
		div.intervals
			div.intervals__item(
				v-for="interval of popupInfos"
				:key="`interval--${number}--${string + 1}--${interval.value}`"
				)
				div.intervals__item__dot(
					v-for="seq of interval.sequences"
					:key="`dot--${seq.index}`"

					:style="{ backgroundColor: seq.color }"
					)
				p.intervals__item__text {{ interval.name }}

	div.fret(
		v-mods=`{ 
			isOpenString, isStartingFret, isFirstFret, isOnLastString, 
			isFretboardVertical, isFretboardFlippedHor, isFretboardFlippedVert, 
		}`
		@click="toggleStringVisibleIfOpen"
	)

		svg.fret__inlay(v-if="isShowingInlay" v-mods="{isWideInlay}" viewBox="0 0 24 16" :style="inlayPosition")
			path.fret__inlay__fin(:d="inlayFish.dorsal")
			path.fret__inlay__tail(:d="inlayFish.tail")
			path.fret__inlay__body(:d="inlayFish.body")
			circle.fret__inlay__eye(:cx="inlayFish.eye.cx" :cy="inlayFish.eye.cy" :r="inlayFish.eye.r")

		span.fret__note(
			ref="note"

			v-mods=`{
				isActive, isHighlighted, isShowingNoteInfos,
				isOpenString, isCapoString, isNutString, isShortStringNut,
				isFretboardVertical, isFretboardFlippedHor, isFretboardFlippedVert,
				useNoteImage, isOvalHidden, isHiddenByHand,
				//- isRoygbivLit,
				//- isRoygbivChromatic
			}`
			:style="position"

			@click="onNoteClick"
			@mouseenter="showTooltip = isActive"
			@mouseleave="showTooltip = false"
		)
			//- Partial-capo toggle (bug 20260914-4 UI follow-up -- Phil: the old
			//- per-string dots crowded the fret notes next to the capo. Now a
			//- rectangle rendered BEHIND the note bubble instead of a separate
			//- badge beside it, and clicking the note itself (not a separate
			//- control) toggles it -- see onNoteClick. Hidden until this capo's
			//- own master lever (FretboardViewer.vue) is armed. Usually one capo
			//- per fret, but bug 20260914-4 follow-up ("could we add two capos
			//- at the same time?") means two can share a fret; a single click
			//- toggles all of them together for this string. Placed BEFORE
			//- fret__note__bg below (not just before the text) so a note that's
			//- also in the scale still shows its own colored circle on top of
			//- this rectangle, per Phil -- ".fret__note" itself carries only
			//- position now (see `position` above replacing the old `noteStyle`,
			//- which used to bundle noteBg's color into the SAME element this
			//- rectangle is a child of, meaning that color always painted
			//- underneath every child regardless of z-index/DOM order).
			span.capo-toggle-bg(
				v-if="isCapoString && expandedCapoIndexesAtThisFret.length"
				v-mods="{ isReleased: isCapoToggleReleased }"
			)

			span.fret__note__bg(:style="noteBg")

			//- ROYGBIV halo ring — rendered behind note content
			//- span.roygbiv-halo(
			//- 	v-if="isRoygbivLit"
			//- 	:style="roygbivHaloStyle"
			//- )
			//- Chromatic X overlay — note is outside the scale
			//- span.roygbiv-chromatic-x(v-if="isRoygbivChromatic") ✕

			img.note-img(src="note.webp", v-if="useNoteImage")
			span.in_fret_note(v-else)
				p.hand-drawn(v-html="infosHtml")

			//- Mute X overlay (bug 20260923-2 follow-up, Phil: "move the X
			//- higher on the stack, above the note name") -- a dedicated
			//- element placed AFTER the text so it paints on top of the
			//- letter, not behind it. Separate from fret__note__bg (which
			//- still supplies the plain background color regardless of
			//- crossed state) so the two don't fight over the same element's
			//- background property.
			span.fret__note__cross(v-if="isCrossed")

</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get }                                 from 'vuex-pathify'

import { notesNames, degrees, models }                 from '@/modules/music'
import { ovalState }                               from '@/modules/ovalState'
import { intervalsNames, intervalsShorthands } from '@/modules/music'
import { notes }                               from '@/modules/music'
import { resolveNoteName }                     from '@/modules/notenames'
import { hiddenFretKey }                       from '@/modules/fretboard2'
import { positionForFret }                     from '@/modules/background'
import { effectiveCapo }                        from '@/modules/fretboard'
import { intervalsForSequence }                from '@/modules/intervals'
import { noteMidi, playTone, playChord }       from '@/modules/audioPreview'
import { fishForFret, rotationForFret }         from '@/modules/fishInlays'
// import { CHROMATIC_COLOR }                     from '@/modules/roygbiv'


export default {
	name: 'FretboardViewerFret',

	props: {
		string: {
			type: Number,
			required: true,
		},
		number: {
			type: Number,
			required: true,
		},
		note: {
			type: String,
			required: true,
		},
		sequences: {
			type: Array,
			required: true,
		},
		// Sequences whose note here was hidden by hand (bug 20261012-2).
		hiddenSequences: {
			type: Array,
			default: () => [],
		},
		displayedInfos: {
			type: String,
			required: true,
			validator: v => ['none', 'name', 'degree', 'interval'].includes(v)
		},
		isHighlighted: {
			type: Boolean,
			default: false,
		},
		isOnLastString: {
			type: Boolean,
			default: false,
		},
		isShowingInlay: {
			type: Boolean,
			default: false,
		},
		isWideInlay: {
			type: Boolean,
			default: false,
		},
		isFretboardVertical: {
			type: Boolean,
			default: false,
		},
		isFretboardFlippedHor: {
			type: Boolean,
			default: false,
		},
		isFretboardFlippedVert: {
			type: Boolean,
			default: false,
		},
		fretMin: {
			type: Number,
			required: true,
		},
	},

	data() {
		return {
			showTooltip: false,
		}
	},

	computed: {
		useNoteImage() {
			return false;
		},
		inlayFish() {
			return fishForFret(this.number);
		},
		popupInfos() {
			if (this.displayedInfos === 'interval') {
				const intervals = this.intervals;
				return intervals.map( interval => ({...interval, name: this.note}));
			}
			else {
				return this.intervals;
			}
		},
		intervals() {
			const intervals = Object.values(this.sequences.reduce((list, seq) => {
				if (seq.interval in list) {
					list[seq.interval].sequences.push(seq.index);
				} else {
					list[seq.interval] = {
						name:      intervalsNames[seq.interval],
						value:     seq.interval,
						sequences: [{index:seq.index, color: seq.sequence.color}],
					};
				}
				return list;
			}, {}));

			intervals.sort((a, b) => a.value - b.value);
			intervals.forEach(interval => interval.sequences.sort());

			return intervals;
		},

		

		noteBg() {
			if (this.useNoteImage) return {};

			// A Jam chart's root (modules/jam.js ROOT_COLOR): one chord in one
			// color, so the root gets a color of its own.
			const shown     = this.displayedSequences;
			const rootColor = this.isHighlighted && shown.length === 1 && shown[0].rootColor;

			// For open strings, capo strings, and banjo short-string nut, use scale membership for coloring
			if ((this.isOpenString || this.isCapoString || this.isShortStringNut) && this.isNoteInScale && this.enabledStrings[this.physicalString]) {
				const seqs = this.openStringScaleSequences;
				if (rootColor) return { 'background-color': rootColor };
				if (seqs.length > 0) {
					const stripeWidth = Math.ceil(100 / seqs.length);
					const gradient = [...seqs].reverse().map(
						(seq, index) => `${seq.color} ${index*stripeWidth}% ${(index + 1)*stripeWidth}%`
					);
					return { background: `linear-gradient(-45deg, ${gradient})` };
				}
			}

			if (!this.isActive) return { 'background-color': 'var(--color--bg)' };
			if (rootColor) return { 'background-color': rootColor };
			
			// ── ROYGBIV mode: gray until a note lights up (fill handled in noteStyle) ──
			// if (this.roygbivActive) return { 'background-color': '#808080' };

			const stripeWidth = Math.ceil(100 / this.sequences.length);
			const gradient    = [...this.sequences].reverse().map(
				(seq, index) => `${seq.sequence.color} ${index*stripeWidth}% ${(index + 1)*stripeWidth}%`
			);
			return { background: `linear-gradient(-45deg, ${gradient})` };
		},
		/**
		 * Check if this note is in any of the displayed sequences,
		 * regardless of position. Used for open string label coloring.
		 */
		isNoteInScale() {
			if (!this.isOpenString && !this.isCapoString && !this.isShortStringNut) return false;
			// For open strings, color only in open/whole-scale view AND without a capo.
			// With a capo active the physical open note is no longer the effective open pitch.
			if (this.isOpenString && (this.capos.length > 0 || this.displayedSequences.some(seq => seq.position !== 0))) return false;
			// For capo strings, only color when viewing at exactly this fret's
			// position (mirrors open string logic) -- using this.number rather
			// than a single global capo fret is what makes this correct once
			// there can be more than one capo (bug 20260914-4 follow-up), each
			// with its own fret.
			if (this.isCapoString && this.displayedSequences.some(seq => seq.position !== this.number)) return false;
			// For banjo-5 short-string nut (G at fret 5), color when any position window includes fret 5
			// Position N covers frets N–N+4, so positions 1–5 all include fret 5.
			if (this.isShortStringNut && !this.displayedSequences.some(seq =>
				seq.position === 0 || seq.position === -2 || (seq.position >= 1 && seq.position <= 5)
			)) return false;
			return this.displayedSequences.some(seq => {
				const rootIndex = notes.indexOf(seq.tonality);
				const noteIndex = notes.indexOf(this.note);
				const interval  = (noteIndex - rootIndex + 12) % 12;
				const seqIntervals = [0, ...intervalsForSequence(seq)];
				return seqIntervals.includes(interval);
			});
		},
		/**
		 * The sequences that contain this open string note (scale-level, not position).
		 */
		openStringScaleSequences() {
			return this.displayedSequences
				.filter(seq => {
					const rootIndex = notes.indexOf(seq.tonality);
					const noteIndex = notes.indexOf(this.note);
					const interval  = (noteIndex - rootIndex + 12) % 12;
					const seqIntervals = [0, ...intervalsForSequence(seq)];
					return seqIntervals.includes(interval);
				})
				.map(seq => ({ color: seq.color }));
		},
		effectiveFlipHor() {
			return this.isFlippedHor !== this.isFlippedVert;
		},
		position() {
			this.isLayoutLandscape;
			const {string,number,backgroundSize} = this;
			return positionForFret({string,number}, this.instrument, backgroundSize, this.effectiveFlipHor, this.isFretboardFlippedVert);
		},
		/** Fret markers traditionally sit in the wood BETWEEN two strings, not
		 *  on one -- unlike a note, which belongs to a specific string. Every
		 *  inlay in FretboardViewer.vue's `inlays` list is deliberately never
		 *  on the last string, so string+1 is always a real string to split
		 *  the difference with. Bradley: markers should land between D/G
		 *  (single) and between G/B and A/D (the two at fret 12) -- i.e.
		 *  halfway to the next (higher-numbered/lower-pitched) string.
		 *
		 *  A "wide" inlay (5-string regular frets) is just a bigger fish, not
		 *  a differently-positioned one -- same split with string+1 as every
		 *  other marker (Bradley: same spot as the fret-15 marker, just
		 *  bigger, after the string+2/rotated version looked like it was
		 *  floating above the strings).
		 */
		inlayPosition() {
			const {string,number,backgroundSize} = this;
			const here = positionForFret({string,   number}, this.instrument, backgroundSize, this.effectiveFlipHor, this.isFretboardFlippedVert);
			const next = positionForFret({string: string+1, number}, this.instrument, backgroundSize, this.effectiveFlipHor, this.isFretboardFlippedVert);
			return {
				...here,
				top: `${Math.round((parseFloat(here.top) + parseFloat(next.top)) / 2)}px`,
				'--inlay-rotation': `${rotationForFret(number)}deg`,
			};
		},
		// ── ROYGBIV — commented out ───────────────────────────────────────────
		// noteIndex() {
		// 	const ffIdx = notes.indexOf(this.note);
		// 	if (ffIdx < 0) return -1;
		// 	return (ffIdx - 3 + 12) % 12;
		// },
		// isRoygbivLit() {
		// 	if (!this.roygbivActive) return false;
		// 	if (this.noteIndex < 0)  return false;
		// 	if (!this.isActive)      return false;
		// 	return this.noteIndex in this.roygbivLitNotes;
		// },
		// isRoygbivChromatic() {
		// 	return this.isRoygbivLit && this.roygbivLitNotes[this.noteIndex] === 'chromatic';
		// },
		// roygbivHaloStyle() {
		// 	if (!this.isRoygbivLit) return {};
		// 	const c = this.isRoygbivChromatic
		// 		? CHROMATIC_COLOR.hex
		// 		: (this.roygbivScaleMap[this.noteIndex]?.color?.hex ?? CHROMATIC_COLOR.hex);
		// 	return { '--halo-color': c };
		// },
		// ─────────────────────────────────────────────────────────────────────
		colors() {
			return this.displayedSequences.map(seq => seq.color);
		},
		infos() {
			// A fret outside every sequence still shows a label on hover. It
			// follows the display mode (bug 20261012-4, Phil: "in degree display
			// mode, hovering over a fret should state the degree not the note"):
			// degree/interval are measured from the first displayed sequence's
			// root, same as the cases below. Name and none modes keep the plain
			// note name. Open strings, capos and nuts are left alone -- they're
			// always visible and double as the string's tuning label.
			const isOffScale = !this.isActive && !((this.isOpenString || this.isCapoString || this.isShortStringNut) && this.isNoteInScale);
			const isAtNut    = this.isOpenString || this.isCapoString || this.isNutString || this.isShortStringNut;
			// A note hidden by hand (bug 20261012-2) is still a scale note, so on
			// hover it's spelled like its visible neighbors (F♯, not G♭).
			const spellLikeScale = this.isHiddenByHand && this.displayedInfos !== 'none';
			if (isOffScale && !spellLikeScale && (isAtNut || !(['degree', 'interval'].includes(this.displayedInfos) && this.displayedSequences.length))) return notesNames[this.note];

			switch (this.displayedInfos) {
				case 'name':     return resolveNoteName(
						this.note,
						this.sequences[0]?.sequence?.tonality ?? this.displayedSequences[0]?.tonality,
						modeForSequence(this.sequences[0]?.sequence ?? this.displayedSequences[0]),
						this.sequences[0]?.sequence?.model ?? this.displayedSequences[0]?.model
					);
				case 'degree': {
					const seq = this.sequences[0]?.sequence ?? this.displayedSequences[0];
					const rootIndex = notes.indexOf(seq.tonality);
					const noteIndex = notes.indexOf(this.note);
					const interval  = (noteIndex - rootIndex + 12) % 12;
					return degrees[interval];
				}
				case 'interval': {
					const seq = this.sequences[0]?.sequence ?? this.displayedSequences[0];
					const rootIndex = notes.indexOf(seq.tonality);
					const noteIndex = notes.indexOf(this.note);
					const interval  = (noteIndex - rootIndex + 12) % 12;
					return intervalsShorthands[interval];
				}
				default: return '';
			}
		},
		infosHtml() {
			// Bug 20260914-1 (Phil: "Make note names less wide when there is a
			// flat or sharp"). Sharps were never wrapped at all here -- only
			// flats got a (too-weak) shrink-and-pull-in treatment -- so an F♯
			// rendered at full letter size, just as wide as the old, too-wide
			// flat bubbles.
			return (this.infos ?? '')
				.replace('♭', '<span class="note-flat">♭</span>')
				.replace('♯', '<span class="note-sharp">♯</span>');
		},
		/**
		 * Translate visual string index to physical string index.
		 * enabledStrings in the store is always physical order: index 0 = low E.
		 * In player view (isFlippedVert=false), tuning is reversed so string 0 = high E — mirror needed.
		 * In audience view (isFlippedVert=true), tuning keeps physical order so string 0 = low E — direct.
		 */
		physicalString() {
			const nbStrings = this.enabledStrings.length;
			return this.isFretboardFlippedVert ? this.string : nbStrings - 1 - this.string;
		},
		isActive() {
			return (
				this.sequences.length > 0
				&& this.enabledStrings[this.physicalString]
			);
		},
		/** Audio mode plays any fret that physically exists and can sound:
		 *  the string isn't muted, the fret isn't behind that string's capo,
		 *  and (banjo-5) it isn't one of the frets below the short 5th
		 *  string's own nut at 5. Scale membership doesn't matter.
		 */
		isPlayableFret() {
			if (this.enabledStrings[this.physicalString] === false) return false;
			if (this.number < effectiveCapo(this.capos, this.physicalString)) return false;
			if (this.instrument === 'banjo-5' && this.string === this.enabledStrings.length - 1 && this.number < 5) return false;
			return true;
		},
		/** Every sequence's note here was hidden by hand (bug 20261012-2). */
		isHiddenByHand() {
			return !this.isActive && this.hiddenSequences.length > 0;
		},
		isOvalHidden() {
			// Nut/open-string labels are always shown and stay clickable for mute/unmute,
			// regardless of oval mode — ovals only describe fretted voicings.
			if (this.isOpenString || this.isCapoString || this.isShortStringNut) return false;
			if (!this.sequences.length) return false;
			const ovalSeqs = this.sequences.filter(s => s.sequence.showOval);
			if (!ovalSeqs.length) return false;
			// If any non-oval sequence also shows this note, keep it visible
			if (this.sequences.some(s => !s.sequence.showOval)) return false;
			// All sequences are oval — hide any note not inside a found voicing.
			// No fallback: if no voicing was found at all, everything stays hidden.
			// Except in a Jam chart (ovalFallback, see modules/jam.js): a chord
			// whose position has no complete fretted voicing (none at all, or
			// only open strings, which live on the nut labels) shows its plain
			// notes rather than a blank-looking fretboard mid-song.
			const key = `${this.string}:${this.number}`;
			return !ovalSeqs.some(s => {
				const keys = ovalState.voicingKeys[s.sequence.id];
				if (s.sequence.ovalFallback && ![...(keys || [])].some(k => !k.endsWith(':0'))) return true;
				return keys && keys.has(key);
			});
		},
		isOpenString() {
			// Always show open string labels at the nut regardless of capo.
            return this.number == 0;
        },
		isCapoString() {
           return this.capoIndexesAtThisFret.length > 0;
        },
		/** Indexes into this.capos of every capo that clamps at THIS fret --
		 *  usually 0 or 1, but bug 20260914-4 follow-up (Bradley: "could we
		 *  add two capos at the same time?") means two capos can share a
		 *  fret, in which case this string gets one lever per capo.
		 */
		capoIndexesAtThisFret() {
			return this.capos
				.map((capo, index) => (capo.fret === this.number ? index : null))
				.filter(index => index !== null);
		},
		/** Same as capoIndexesAtThisFret, but only the ones whose OWN master
		 *  lever is armed -- the rectangle-behind-the-note toggle (and the
		 *  click that drives it) only exists once a capo is in "edit mode".
		 */
		expandedCapoIndexesAtThisFret() {
			return this.capoIndexesAtThisFret.filter(i => this.capos[i].leversExpanded);
		},
		/** Display color for the rectangle: green only once every capo
		 *  sharing this fret has this string released -- clicking toggles
		 *  them all together (see toggleCapoTogglesAtThisFret).
		 */
		isCapoToggleReleased() {
			const indexes = this.expandedCapoIndexesAtThisFret;
			return indexes.length > 0 && indexes.every(i => this.capos[i].releasedStrings[this.physicalString]);
		},
		isNutString() {
			return false; // isOpenString now covers fret 0 in all cases
		},
		isShortStringNut() {
			// Banjo 5th string has its own nut at fret 5.
			// The last string (highest visual index) at fret 5 on banjo-5.
			return this.instrument === 'banjo-5'
				&& this.number === 5
				&& Array.isArray(this.enabledStrings)
				&& this.string === (this.enabledStrings.length - 1);
		},
		isStartingFret() {
			return this.number == this.fretMin && this.number > 0;
		},
		isFirstFret() {
			return this.number == 1;
		},
		isShowingNoteInfos() {
			return this.displayedInfos != 'none';
		},

		isCrossed() {
          return (this.isOpenString || this.isCapoString || this.isShortStringNut) && !this.enabledStrings[this.physicalString];
        },

		...get([
			'isMobileDevice',
			'isLayoutLandscape',
			'backgroundSize',
			'sequences/displayedSequences',
			'fretboard/enabledStrings',
			'fretboard/instrument',
			'fretboard/isFlippedHor',
			'fretboard/isFlippedVert',
			'fretboard/capos',
			'fretboard/audioPreviewActive',
			'fretboard/instrumentVoices',
			'fretboard/midiAttack',
			'fretboard/midiDecay',
			'fretboard/midiSustain',
			'fretboard/midiRelease',
			'fretboard/midiDuration',
			'fretboard/midiVolume',
			// ROYGBIV — commented out
			// 'fretboard/roygbivActive',
			// 'fretboard/roygbivLitNotes',
			// 'fretboard/roygbivScaleMap',
		]),
	},

	methods: {

		onNoteClick(e) {
			// Partial-capo toggle (bug 20260914-4 UI follow-up): while this
			// fret is an armed capo position, clicking the note itself toggles
			// that capo's release for this string, taking priority over the
			// usual audio-preview/mute-toggle click behavior below -- Phil:
			// the separate per-string dots were crowding the note names, so
			// the note itself is the control now.
			if (this.expandedCapoIndexesAtThisFret.length) {
				e.stopPropagation();
				this.toggleCapoTogglesAtThisFret();
				return;
			}

			// Audio off: clicking a fretted note hides it, and clicking a hidden
			// one brings it back (bug 20261012-2, Phil: "clicking a note when
			// audio is off should be ok"). Open strings, nuts and everything else
			// still bubble up to the mute/unmute handler on the parent .fret.
			if (!this.audioPreviewActive) {
				const isAtNut = this.isOpenString || this.isCapoString || this.isNutString || this.isShortStringNut;
				if (isAtNut || !(this.isActive || this.isHiddenByHand)) return;
				e.stopPropagation();
				const hide = this.isActive;
				const key  = hiddenFretKey(this.physicalString, this.number);
				(hide ? this.sequences : this.hiddenSequences).forEach(s =>
					this.$store.commit('sequences/setFretHidden', { id: s.sequence.id, key, hidden: hide }));
				return;
			}

			// Audio mode plays every fret that exists -- in the scale or not
			// (Bradley: "You could have a certain scale or chord pulled up, but
			// then play a different note and be like here's the sharp nine"). A
			// muted string never sounds, nor does a fret behind a capo.
			if (!this.isPlayableFret) return;

			e.stopPropagation();

			// Same visual-string -> physical-string translation this component
			// uses for itself (see `physicalString` above) -- a voicing's plain
			// fret objects (straight from getFrets()) don't carry it themselves.
			const nbStrings = this.enabledStrings.length;
			const toPhysicalString = visualString =>
				this.isFretboardFlippedVert ? visualString : nbStrings - 1 - visualString;

			const thisNote = { string: this.string, number: this.number, note: this.note };
			// The tail of a harmony arrow plays together with the note at its point
			// (Phil + Bradley, 2026-11-01): hear the 3rd, 6th... you're looking at.
			const harmony = ovalState.harmonyTargets?.(this.string, this.number) || [];
			// A voicing note plays its whole chord shape (bug 20260810-2). A note
			// that sits inside an oval but isn't one of its notes plays that chord
			// PLUS itself (Phil: "play the chord plus that note").
			const voicing = ovalState.voicingNotes[`${this.string}:${this.number}`];
			const around  = voicing ? null : ovalState.voicingAround?.(this.string, this.number);
			// Outside every oval: add this note to ALL the drawn ovals and play the
			// lot together (Phil: "crazy in whole position").
			const everyOval = voicing || around ? null : ovalState.allOvalNotes?.();
			const notesToPlay = harmony.length ? [thisNote, ...harmony] : voicing ?? (around ? [...around, thisNote] : (everyOval ? [...everyOval, thisNote] : [thisNote]));

			const midiNotes = notesToPlay.map(f => noteMidi({
				instrument:     this.instrument,
				physicalString: toPhysicalString(f.string),
				note:           f.note,
				fretNumber:     f.number,
			}));

			const voice    = this.instrumentVoices[this.instrument];
			const envelope = {
				attack:   this.midiAttack,
				decay:    this.midiDecay,
				sustain:  this.midiSustain,
				release:  this.midiRelease,
				duration: this.midiDuration,
				volume:   this.midiVolume,
			};
			if (midiNotes.length > 1) playChord(midiNotes, { instrument: this.instrument, voice, ...envelope });
			else playTone(midiNotes[0], { instrument: this.instrument, voice, ...envelope });
		},

		toggleStringVisibleIfOpen() {
			// Audio mode and string muting are mutually exclusive (Phil + Bradley's
			// audio protocol): with Audio on, nut clicks make sound instead.
			if (this.audioPreviewActive) return;

            // Bug 20260923-5 (Phil: "Clicking a red (dot) capo - even way up
            // on a high fret - mutes that string where you clicked on it -
            // I'd disable that - make them click on the open string to mute
            // only"). isCapoString deliberately dropped from this list --
            // muting is now only reachable from the actual nut, not from
            // wherever the capo happens to be sitting. The capo-position
            // note still SHOWS the mute-X when the string is muted (that's
            // isCrossed, unchanged, still keyed off isCapoString for
            // display) -- it just isn't a click target for toggling it
            // anymore, since that's also where the capo-release click lives
            // (onNoteClick) and a stray click there shouldn't silently mute
            // a string with no visual warning.
            if (this.isOpenString || this.isNutString || this.isShortStringNut) {
              const newEnabledStrings = this.enabledStrings.slice();
              newEnabledStrings[this.physicalString] = !newEnabledStrings[this.physicalString];
              this.$store.commit('fretboard/enabledStrings', newEnabledStrings);
            }
        },

		/** Toggle every armed capo sharing this fret together, for this one
		 *  string -- almost always just one capo, but bug 20260914-4 follow-up
		 *  means two can land on the same fret. Sets them all to the opposite
		 *  of "currently all released" so one click gives one clear result
		 *  rather than each capo needing its own click.
		 */
		toggleCapoTogglesAtThisFret() {
			const newValue = !this.isCapoToggleReleased;
			this.expandedCapoIndexesAtThisFret.forEach(index => {
				const capo = this.capos[index];
				const newReleased = capo.releasedStrings.slice();
				newReleased[this.physicalString] = newValue;
				this.$store.commit('fretboard/updateCapo', {index, prop: 'releasedStrings', value: newReleased});
			});
		}
	}
}

function modeForSequence(sequence) {
	if (!sequence) return 0;
	return models[sequence.model]?.mode ?? 0;
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.fret.is-open-string .fret__note {
	cursor: pointer;
}

.fret {
	pointer-events: none;
	position: absolute;
	top: 0;
	left: 0;

	height: 100%;
	width: 100%;

	border-width: 0;
	border-style: solid;
	border-color: var(--color--border);

	&.is-fretboard-vertical {
		&.is-fretboard-flipped-vert {
			&:not(.is-open-string) { border-top-width:    layout.$fretbar-thickness; }
			&.is-starting-fret     { border-bottom-width: layout.$fretbar-thickness; }
			&.is-first-fret        { border-bottom-width: layout.$nut-thickness;     }
		}

		&:not(.is-fretboard-flipped-vert) {
			&:not(.is-open-string) { border-bottom-width: layout.$fretbar-thickness; }
			&.is-starting-fret     { border-top-width:    layout.$fretbar-thickness; }
			&.is-first-fret        { border-top-width:    layout.$nut-thickness;     }
		}
	}

	&:not(.is-fretboard-vertical):not(.is-on-last-string) {
		height: layout.$fret-width;
	}
}

.fret__note {
	pointer-events: all;
	position: absolute;
	z-index: 10;
	@include center-content;

	@include circle(calc(layout.$note-size * var(--note-size-scale, 1.0)));

	// 3.0em good for desktop, 1.75em good for mobile
	font-size: calc(3.0em * var(--font-size-scale, 1.0));
	@media (max-width: 932px) and (orientation: landscape) {
		font-size: calc(1.75em * var(--font-size-scale, 1.0));
	}
	@media (max-width: 800px) and (orientation: portrait) {
		font-size: calc(1.75em * var(--font-size-scale, 1.0));
	}
	font-weight: bold;

	color: transparent;

	opacity: 0;

	transition: opacity 200ms, filter 200ms, box-shadow 200ms;

	&.is-active {
		opacity: 1;

		&:hover {
			filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.4));
		}

		// Highlighted interval (the 1/3/5 pills): stays a round bubble with a
		// white-and-dark ring, instead of the old square (Phil: "I hate how it
		// highlights with a square instead of a round note bubble").
		&.is-highlighted {
			z-index: 11;
			box-shadow: 0 0 0 1.5px white, 0 0 0 2.5px rgba(0, 0, 0, 0.7);
		}
		&.is-showing-note-infos { color: var(--color--text--inverted); }
		&.is-oval-hidden        { opacity: 0; pointer-events: none; }
	}

	&:not(.is-active) {
		border: 2px dashed var(--color--border);

		// Hidden by hand (bug 20261012-2): faint on hover, so it can be found
		// and clicked back on.
		&.is-hidden-by-hand:hover {
			opacity: 0.45;
			cursor: pointer;
		}

		&:hover,
		&.is-open-string,
		&.is-capo-string,
		&.is-nut-string,
		&.is-short-string-nut {
			color: var(--color--text);
			opacity: 1;
		}
	}

	// ROYGBIV lit — always visible, entire bubble flooded with color
	&.is-roygbiv-lit {
		opacity: 1;

		&.is-active.is-showing-note-infos {
			color: transparent;
		}
	}

	&.is-fretboard-vertical {
		&.is-fretboard-flipped-vert {
			right: 0;

			&.is-open-string {
				bottom: 0;
				transform: translateX(50%);
			}

			&:not(.is-open-string) {
				top: 50%;
				transform: translate(50%, -50%);
			}
		}

		&:not(.is-fretboard-flipped-vert) {
			left: 0;

			&.is-open-string {
				top: 0;
				transform: translateX(-50%);
			}

			&:not(.is-open-string) {
				top: 50%;
				transform: translate(-50%, -50%);
			}
		}
	}

	/* stylelint-disable-next-line no-descending-specificity */
	&:not(.is-fretboard-vertical) {
		&.is-open-string,
		&.is-short-string-nut {
			left: 75%;
			transform: translate(-50%, -50%);
		}

		&:not(.is-open-string) {
			transform: translate(-50%, -50%);

			&.is-fretboard-vertical          { top:  50%; }
			&:not(.is-fretboard-vertical)    { left: 50%; }
		}
	}
}

.fret.use-note-image {
	background-color: transparent;
}

.fret__inlay {
	// Positioned via :style="inlayPosition" (same positionForFret pixel
	// coords the note bubble uses, split with the next string down) --
	// .fret itself is a full-width horizontal band in this layout, not a
	// per-cell box, so centering within it (the old, commented-out version
	// of this rule) doesn't work. translate(-50%,-50%) centers the shape
	// on that point, same as .fret__note does; rotate() after it turns the
	// fish in place around that same centered point instead of shifting it
	// (--inlay-rotation set per-fret in inlayPosition -- Bradley, after
	// seeing PRS's own bird inlays: wanted the same varied swimming-angle
	// feel instead of every fish facing the same way).
	position: absolute;
	transform: translate(-50%, -50%) rotate(var(--inlay-rotation, 0deg));

	width:  24px;
	height: 16px;
	overflow: visible;
	pointer-events: none;
	z-index: 1; // sit above the fretboard photo, below note bubbles

	// Wide (5-string regular-fret) markers: one bigger fish instead of two
	// small ones -- big enough to cover the real inlay dot on the middle
	// string it spans. Stays horizontal, same orientation as every other
	// marker (Bradley: the rotated version looked like it was floating
	// above the strings) -- just bigger.
	&.is-wide-inlay {
		width:  34px;
		height: 23px;
	}

	// Mother-of-pearl-ish: pale fill, dark outline drawn behind the fill
	// (paint-order) so it reads clearly against wood of any color, the same
	// way note bubbles and fret numbers stay legible on any instrument.
	.fret__inlay__body,
	.fret__inlay__tail,
	.fret__inlay__fin {
		fill: #f2ecd8;
		stroke: #2a2015;
		stroke-width: 1;
		paint-order: stroke fill;
	}

	.fret__inlay__eye {
		fill: #2a2015;
	}
}

.tooltip {
	padding: 8px;

	color: var(--color--bg--tooltip);
	background-color: var(--color--bg--tooltip);
}

.intervals {
	display: flex;
	@include space-children-h(10px);
}

.intervals__item {
	display: flex;
	align-items: center;
	@include space-children-h(5px);
}

.intervals__item__dot {
	@include circle(10px);
	flex: 0 0 auto;
}

.intervals__item__text {
	color: white;
}

.in_fret_note {
	position: relative;
	color: white;
	@include outline-text(2px);
	-webkit-text-stroke: 1px;
}

// Bug 20260914-1: these two rules were never actually taking effect at
// all -- infosHtml() injects the accidental's <span> via v-html, and Vue's
// scoped-CSS attribute (data-v-xxxxx) is only stamped onto elements the
// template compiler sees; it never reaches HTML injected as a raw string
// at runtime. So the plain `.note-flat { ... }` selector compiled down to
// `.note-flat[data-v-xxxxx]`, which the actual (attribute-less) v-html
// span could never match -- confirmed live (computed style showed the
// unscoped browser default, margin 0 / full font-size, not this rule's
// values, even though the rule itself was present in the stylesheet).
// ::v-deep drops that requirement onto the ANCESTOR (.hand-drawn, which
// the template does render normally and does carry the attribute)
// instead of the target element itself, which is what actually lets these
// rules reach the v-html content.
//
// Re-tuned the values themselves live against the rendered fretboard --
// ♭ and ♯ needed different amounts since they're differently-shaped
// glyphs in this font, not the same value copy-pasted. First pass pulled
// them in as far as text-width-vs-bubble measurements suggested (-0.7em/
// -0.4em), which turned out to overshoot once seen live at real size --
// Phil: "the sharp is a little too much the flat is way too much" --
// backed off to these, chosen by eye against the actual rendered glyphs
// rather than by width numbers alone.
::v-deep(.note-flat) {
	font-size: 0.45em;
	vertical-align: 0.28em;
	margin-left: -0.25em;
}

::v-deep(.note-sharp) {
	font-size: 0.45em;
	vertical-align: 0.28em;
	margin-left: -0.25em;
}

.string-visible-icon {
	position: absolute;
	top: -20px;
	left: 0;

	background-color: var(--color-bg);
}

// Partial-capo toggle (bug 20260914-4 UI follow-up) -- Phil: the earlier
// per-string dots beside each note crowded the fret names next to the capo.
// Now a rounded rectangle sitting BEHIND the note bubble (a child of
// .fret__note, so it inherits that element's already-correct centering/
// orientation transform for free instead of needing its own copy of it) --
// it peeks out past the circular note on every side, and the note itself is
// the click target (see onNoteClick), not a separate control. Red/clamped by
// default (matches the capo bar itself); green once every capo sharing this
// fret has this string released. Only rendered once at least one of those
// capos' own master lever (FretboardViewer.vue) is armed.
//
// Deliberately no z-index here (stays auto) -- .fret__note__bg (the note's
// own scale-membership color, if any) and the note text both need to paint
// ON TOP of this rectangle, per Phil: "if the note is in the scale, still
// leave it circled in whatever color that scale is... have it [the
// rectangle] behind the note name and bubble." All three are position:
// absolute/relative with z-index left auto, so plain DOM order decides
// paint order (this one first == furthest back) -- an explicit z-index
// here would pull it into its own stacking level instead.
.capo-toggle-bg {
	position: absolute;
	// Shorter than wide on purpose (Phil: "I don't want the red and green
	// bars touching... sort of a thick stripe across the capo") -- a uniform
	// -10px inset made each rectangle taller than the gap between strings,
	// so neighboring strings' rectangles overlapped into one solid column.
	inset: -2px -10px;

	border-radius: 6px;
	background-color: #c0392b;

	pointer-events: none;
	transition: background-color 150ms;

	&.is-released {
		background-color: #2ecc71;
	}
}

// The note's own scale-membership color used to live directly on
// .fret__note itself (via the noteStyle style binding) -- moved to this
// child instead (fret__note now only carries position) so that color can
// paint ON TOP of .capo-toggle-bg above rather than always underneath every
// child regardless of order, which is what a parent's own background does.
.fret__note__bg {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	pointer-events: none;
}

// Mute X overlay (bug 20260923-2, Phil: "All instruments lost their muted
// Red X on open muted strings"; follow-up: "move the X higher on the stack,
// above the note name"). Used to live as a background on .fret__note itself,
// which put it BEHIND the note letter (a background layer, with the text
// painting over it) -- and once fret__note__bg existed as a child carrying
// an opaque color, it also completely covered this gradient, since a
// parent's own background always paints beneath every child regardless of
// z-index or DOM order. Now its own dedicated element, placed after the
// text in the template, so plain DOM order puts it on top of the letter
// instead of underneath it.
.fret__note__cross {
	position: absolute;
	inset: 0;
	pointer-events: none;

     background:
         linear-gradient(to top left,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 1.5px),
             red 50%,
             rgba(0,0,0,0) calc(50% + 1.5px),
             rgba(0,0,0,0) 100%),
         linear-gradient(to top right,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 1.5px),
             red 50%,
             rgba(0,0,0,0) calc(50% + 1.5px),
             rgba(0,0,0,0) 100%);
}

.note-img {
	width: 2em;
}

// ── ROYGBIV halo ────────────────────────────────────────────────────────────

.roygbiv-halo {
	position: absolute;
	inset: -4px;
	border-radius: 50%;
	border: 3px solid var(--halo-color, #fff);
	box-shadow:
		0 0 8px  var(--halo-color, #fff),
		0 0 20px var(--halo-color, #fff),
		inset 0 0 6px var(--halo-color, #fff);
	pointer-events: none;
	z-index: 0;
	animation: roygbiv-pulse 1.2s ease-in-out infinite;
}

@keyframes roygbiv-pulse {
	0%   { opacity: 1;    box-shadow: 0 0 8px  var(--halo-color, #fff), 0 0 20px var(--halo-color, #fff), inset 0 0 6px var(--halo-color, #fff); }
	50%  { opacity: 0.7;  box-shadow: 0 0 14px var(--halo-color, #fff), 0 0 35px var(--halo-color, #fff), inset 0 0 10px var(--halo-color, #fff); }
	100% { opacity: 1;    box-shadow: 0 0 8px  var(--halo-color, #fff), 0 0 20px var(--halo-color, #fff), inset 0 0 6px var(--halo-color, #fff); }
}

// Chromatic X — outside-scale note indicator
.roygbiv-chromatic-x {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	z-index: 2;
	font-size: 0.9em;
	font-weight: bold;
	color: #fff;
	text-shadow: 0 0 4px #000, 0 0 8px #000;
	line-height: 1;
}

</style>
<!--}}}-->
