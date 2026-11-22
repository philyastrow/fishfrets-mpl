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

div.FretboardSettings

	//----------------------------------------------------------------------
	//- Instrument settings
	//----------------------------------------------------------------------
	div.instrument-slot
		component(
			:is="isMobileDevice ? 'div' : 'VPopupMenu'"

			icon="guitar"
			text="Instrument"
			)
			div.settings-menu

				//- Instrument
				VSelect(
					:options="instruments"
					icon="guitar"
					is-contained
					is-first-item

					v-model="instrument"
					)

				div.settings-menu__separator

				//- MIDI Settings (Audio Preview's sampled voice + envelope) --
				//- self-contained: reads/writes the store directly, opens its own
				//- nested panel on click.
				VMidiSettings

				div.settings-menu__separator

				//- Tuning
				VSelect(
					:options="tunings"
					icon="music"
					is-contained

					v-model="tuning"
					)

				div.settings-menu__separator

				//- Capo(s) -- bug 20260914-4 follow-up (Bradley: "could we add two
				//- capos at the same time?"). A list now, not a single dropdown:
				//- each row is one physical capo, removed with its own trash-can
				//- button rather than by setting it back to "No capo".
				div.capo-row(
					v-for="(capo, index) of capos"
					:key="`capo-row--${index}`"
					)
					VSelect.capo-row__select(
						:options="capoFretOptionsFor(index)"
						icon="circle-arrow-up"
						is-contained

						:value="capo.fret"
						@change="v => $store.commit('fretboard/updateCapo', {index, prop: 'fret', value: Number(v)})"
						)
					VButton.capo-row__remove(
						icon="trash-can"
						@click="$store.commit('fretboard/removeCapo', index)"
						)

				VButton(
					v-if="capos.length < MAX_NB_CAPOS"
					text="Add capo"
					icon="plus"
					is-last-item

					@click="$store.commit('fretboard/addCapo')"
					)

		VAudioSwitch.instrument-slot__audio(v-if="!isMobileDevice")

	//----------------------------------------------------------------------
	//- Display settings
	//----------------------------------------------------------------------
	component(
		:is="isMobileDevice ? 'div' : 'VPopupMenu'"

		icon="eye"
		text="Display"
		)
		div.settings-menu

			//- Theme
			VSelect(
				:options="{ light: 'Light mode', dark: 'Dark mode', system: `System colors (${isSystemDarkModeOn ? 'dark' : 'light'})` }"
				:icon="darkModeSetting == 'system' ? 'desktop-alt' : isDarkModeOn ? 'moon' : 'sun'"
				is-contained

				v-model="darkModeSetting"
				)

			div.settings-menu__separator

			//- Player Handedness: RH or LH
			VToggleButton(
				:text="isFlippedHor ? 'Left-handed' : 'Right-handed'"
				icon="hand"
				label-prefix="Player:"
				:is-active="isFlippedHor"

				@click.native="$store.commit('fretboard/toggle.isFlippedHor')"
				)

			//- View perspective: Player or Audience
			VToggleButton(
				:text="isFlippedVert ? 'Audience view' : 'Player view'"
				icon="eye"
				label-prefix="Perspective:"
				:is-active="isFlippedVert"

				@click.native="togglePerspective"
				)

			div.settings-menu__separator

			//- Fret numbers
			VToggleButton(
				text="Show fret numbers"
				icon="list-ol"
				:is-active="isShowingFretNbs"

				@click.native="$store.commit('fretboard/toggle.isShowingFretNbs')"
				)

			//- Infos displayed on the notes: nothing/names/degrees/intervals, for
			//- any number of entries -- each note's degree or interval is measured
			//- from its own entry's root (Phil, 2026-10-24: with 2+ entries this
			//- used to drop to a names-only toggle).
			VSelect(
				:options="{ none: 'nothing', name: 'names', degree: 'degrees', interval: 'intervals' }"
				icon="circle-info"
				label-prefix="Display on notes:"
				is-contained

				v-model="noteInfos"
				)

			div.settings-menu__separator

			//- Song mode is hidden for now (Phil, 2026-10-24); SongPanel and the
			//- songModeActive store field are kept, ready to bring back.
			//- VToggleButton(
			//- 	v-if="isMobileDevice"
			//- 	text="🎼 Song mode"
			//- 	icon="list-ol"
			//- 	:is-active="songModeActive"
			//- 	@click.native="$store.commit('fretboard/songModeActive', !songModeActive)"
			//- 	)

			VToggleButton(
				text="🎵 Tuner (Ctrl-T)"
				icon="music"
				:is-active="tunerActive"
				@click.native="$store.commit('fretboard/tunerActive', !tunerActive)"
				)

			//- Jam mode in the menu too (Phil + Bradley, 2026-11-19), not only
			//- the secret Ctrl-J; under Tuner (Phil, 2026-11-21).
			VToggleButton(
				text="🎸 Jam mode (Ctrl-J)"
				icon="guitar"
				:is-active="jamModeActive"
				@click.native="$store.commit('fretboard/jamModeActive', !jamModeActive)"
				)

			//- VToggleButton(
			//- 	text="🌈 ROYGBIV frequency visualizer"
			//- 	icon="music"
			//- 	:is-active="roygbivActive"
			//- 	@click.native="$store.commit('fretboard/roygbivActive', !roygbivActive)"
			//- 	)

			div.settings-menu__separator


			//- Reset all persistence
			div.reset-row
				span.hand-drawn Reset all settings
				button.reset-button(@click="resetAllSettings") Reset

			div.reset-row
				span.hand-drawn Advanced calibration
				button.reset-button(@click="openAdvanced()") {{ showAdvanced ? 'Hide' : 'Show' }}

			div.calib-panel(v-if="showAdvanced")
				div.calib-row
					span.calib-label Note bubble size
					span.calib-value {{ localNoteSize.toFixed(2) }}
				input.calib-slider(
					type="range"
					min="0.1"
					max="1.5"
					step="0.01"
					:value="localNoteSize"
					@input="localNoteSize = parseFloat($event.target.value); applyNoteSize()"
				)
				div.calib-row
					span.calib-label Font size
					span.calib-value {{ localFontSize.toFixed(2) }}
				input.calib-slider(
					type="range"
					min="0.1"
					max="2.0"
					step="0.01"
					:value="localFontSize"
					@input="localFontSize = parseFloat($event.target.value); applyFontSize()"
				)
				div.calib-row
					span.calib-label Fret number size
					span.calib-value {{ localFretNbSize.toFixed(2) }}
				input.calib-slider(
					type="range"
					min="0.3"
					max="3.0"
					step="0.05"
					:value="localFretNbSize"
					@input="localFretNbSize = parseFloat($event.target.value); applyFretNbSize()"
				)
				div.calib-row
					span.calib-label Oval fret width
					span.calib-value {{ localOvalFretWidth || 'Auto' }}
				input.calib-slider(
					type="range"
					min="0"
					max="6"
					step="1"
					:value="localOvalFretWidth"
					@input="localOvalFretWidth = parseInt($event.target.value); applyOvalFretWidth()"
				)
				div.calib-buttons
					button.reset-button(@click="saveCalibration") 💾 Save to this device
					button.reset-button(@click="resetCalibration") Reset

				div.calib-row(style="margin-top:8px")
					span.calib-label 📍 Coordinate helper
					button.reset-button(@click="toggleCoordHelper") {{ coordHelperActive ? 'ON' : 'OFF' }}

			//- Bradley's way back to the original pre-Phil app, v3.2.4, hosted as
			//- its own static Vercel project (~/Projects/fishfrets-classic). His Bluehost
			//- copy had this as a link on the main page; Phil wanted it here.
			div.reset-row
				span.hand-drawn Fishfrets Classic
				a.reset-button(href="https://fishfrets-classic.vercel.app/classic/" target="_blank" rel="noopener") Open

			div.settings-menu__separator

			//- Fret range
			div.fret-range(v-if="false")
				VMultiRange.fret-range__slider(
					:min="0"
					:max="MAX_NB_FRETS - 1"
					:min-gap="MIN_NB_FRETS"
					:is-flipped="isFlippedHor"

					:values="fretRangeDisplay"

					@input=" fretRangeDisplay = $event"
					@change="fretRange = fretRangeDisplay = $event"
					)
				p.fret-range__text
					span(v-html="lowestFret")
					span.fret-range__text__separator ⟷
					span(v-html="highestFret")

	//----------------------------------------------------------------------
	//- Export menu
	//----------------------------------------------------------------------
	VPopupMenu(
		v-if="!isMobileDevice"

		icon="file-arrow-down"
		text="Export"

		:force-closing="exportMenuClose"
		)
		div.export-menu
			div.export-menu__text
				p: strong Choose a format to export in
				p: em
					| If you want to print this  fretboard, choose PNG or JPG.
					| The SVG format is most useful for embedding in web pages as it will scale perfectly when resized.
			div.export-menu__buttons
				each format of ['png', 'jpg', 'svg']
					VButton(
						icon=(format == 'svg' ? 'file-image' : 'camera')
						:text=`exportFeedback === '${format}' ? '✓ Saved!' : '${format.toUpperCase()}'`

						@click=`exportFretboard('${format}')`
						)

			div.export-menu__separator

			div.export-menu__text
				p: strong Copy a link to this exact configuration:
			div.export-menu__buttons
				VButton(
					icon="link"
					:text="copyUrlFeedback ? '✓ Copied!' : 'Copy URL'"
					@click="copyShareUrl"
					)

	//- Song mode -- hidden for now (Phil, 2026-10-24), see the Display menu.
	//----------------------------------------------------------------------
	//- VButton(
	//- 	v-if="!isMobileDevice"
	//-
	//- 	icon="list-ol"
	//- 	text="Song"
	//- 	:is-active="songModeActive"
	//- 	@click="$store.commit('fretboard/songModeActive', !songModeActive)"
	//- 	)

	//- Help menu. On phones it's a section of the Settings page (the gear),
	//- like Instrument and Display, with the Jam Mode Cheat Sheet too
	//- (Phil, 2026-11-22).
	//----------------------------------------------------------------------
	component(
		:is="isMobileDevice ? 'div' : 'VPopupMenu'"

		icon="circle-question"
		text="Help"
		)
		h2.mobile-section-title(v-if="isMobileDevice") Help
		div.export-menu
			div.export-menu__buttons
				VButton(
					icon="book"
					text="Quick Start Guide"
					@click="openHelpPage('quick-start.html')"
					)
				VButton(
					icon="book"
					text="Jam Mode Cheat Sheet"
					@click="openHelpPage('jam-mode.html')"
					)
			div.export-menu__separator
			div.export-menu__text
				p: strong Training videos
			div.help-menu__videos
				VButton(
					v-for="video in trainingVideos"
					:key="video.beat"
					icon="circle-play"
					:text="`${video.beat}. ${video.title}`"
					:is-disabled="!video.url"
					:title="video.url ? '' : 'Coming soon'"
					@click="openVideo(video.url)"
					)

	//- About menu
	//----------------------------------------------------------------------
	component(
		:is="isMobileDevice ? 'div' : 'VPopupMenu'"

		icon="circle-info"
		text="About"
		)
		h2.mobile-section-title(v-if="isMobileDevice") About
		div.about-menu
			p.about-title 🎸 Fish Frets
			p.about-subtitle A Smilin' Phil Smilin' Frets Production
			p.about-copy © Bradley Fish & Phil Yastrow 2022–2026
			p.about-version Version {{ version }}



</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get, sync }                          from 'vuex-pathify'

const packageJson = require('@/../package.json');

import { MIN_NB_FRETS, MAX_NB_FRETS, MAX_NB_CAPOS } from '@/modules/constants'
import { buildShareUrl } from '@/modules/shareUrl'
import { mapObjectToObject }                  from '@/modules/object'
import { instruments, tunings, tuningsNames } from '@/modules/music'
import { formatOrdinalSuffix, formatFretNb }  from '@/modules/text'
import { TRAINING_VIDEOS }                    from '@/modules/trainingVideos'
import { resetAllSettings }                   from '@/modules/reset'

export default {
	name: 'FretboardSettings',

	data() {
		const saved = JSON.parse(localStorage.getItem('fishfrets@calibration') || 'null');
		return {
			exportMenuClose:  false,
			copyUrlFeedback:  false,
			exportFeedback:   null,
			fretRangeDisplay: this.$store.state.fretboard.fretRange,
			showAdvanced: false,
			localNoteSize:   saved?.noteSize   ?? (window.matchMedia('(max-width: 1024px)').matches ? 0.43 : 0.69),
			localFontSize:   saved?.fontSize   ?? (window.matchMedia('(max-width: 1024px)').matches ? 0.43 : 0.62),
			localFretNbSize:    saved?.fretNbSize ?? 1.7,
			localOvalFretWidth: saved?.ovalFretWidth ?? 0,
		}
	},

	computed: {
		trainingVideos() {
			return TRAINING_VIDEOS.filter(video => !video.secret);
		},
		version() {
			return `v${packageJson.version}`;
		},
		lowestFret() {
			return formatOrdinalSuffix(formatFretNb(this.fretRangeDisplay[this.isFlippedHor ? 1 : 0]));
		},
		highestFret() {
			return formatOrdinalSuffix(formatFretNb(this.fretRangeDisplay[this.isFlippedHor ? 0 : 1]));
		},
		tunings() {
			return mapObjectToObject(tunings[this.instrument], tuning => tuningsNames[tuning]);
		},
		...sync([
			'darkModeSetting',
		]),
		...sync('fretboard', [
			'instrument',
			'tuning',
			'capos',
			'fretRange',

			'noteInfos',

			'isShowingFretNbs',
			'isShowingNoteNames',
			'isFlippedHor',
			'isFlippedVert',
			'tunerActive',
			'jamModeActive',
			'songModeActive',
			// 'roygbivActive',
			'noteSize',
		]),
		...get([
			'sequences/displayedSequences',

			'isDarkModeOn',
			'isMobileDevice',
			'isSystemDarkModeOn',
			'coordHelperActive',
		]),
	},

	mounted() {
		// Apply saved calibration on startup
		const saved = JSON.parse(localStorage.getItem('fishfrets@calibration') || 'null');
		const noteSize      = saved?.noteSize      ?? (window.matchMedia('(max-width: 1024px)').matches ? 0.43 : 0.69);
		const fontSize      = saved?.fontSize      ?? (window.matchMedia('(max-width: 1024px)').matches ? 0.43 : 0.62);
		const fretNbSize    = saved?.fretNbSize    ?? 1.7;
		const ovalFretWidth = saved?.ovalFretWidth ?? 0;
		this.$store.commit('fretboard/noteSize', noteSize);
		this.$store.commit('fretboard/fretNbSize', fretNbSize);
		this.$store.commit('fretboard/ovalFretWidth', ovalFretWidth);
		document.documentElement.style.setProperty('--font-size-scale', fontSize);
	},

	created() {
		this.MIN_NB_FRETS = MIN_NB_FRETS;
		this.MAX_NB_FRETS = MAX_NB_FRETS;
		this.MAX_NB_CAPOS = MAX_NB_CAPOS;

		this.instruments  = Object.fromEntries(Object.entries(instruments).filter(([k]) => !['banjo-4', 'guitar-12'].includes(k)));
		// No "No capo" entry any more (bug 20260914-4 follow-up) -- each row
		// in the capo list IS a capo; removing it (the trash-can button) is
		// how you get rid of one, instead of setting it back to 0.
		// Bug 20260923-7 (Phil: "Make capo go to 12th fret") -- was Array(11),
		// an off-by-one that stopped one fret short of a full octave up.
		this.capoFrets    = Object.fromEntries([...Array(12).keys()].map(fret => [fret + 1, `Capo ${formatFretNb(fret + 1)}`]));
	},


	methods: {

		// Bug 20260923-3 (Phil: "I accidentally put 2 capos on the 4th fret
		// here and thought it was being buggy when it wouldn't show open
		// notes below -- but it was really my user error -- Fix: Don't allow
		// user to select more than 1 capo on any fret"). Excludes whatever
		// fret every OTHER capo is already sitting on from this row's own
		// options, so the dropdown itself makes a collision impossible
		// instead of silently allowing one and confusing the higher-wins
		// masking behavior for it.
		capoFretOptionsFor(index) {
			const ownFret = this.capos[index].fret;
			const takenByOthers = new Set(
				this.capos.filter((_, i) => i !== index).map(c => c.fret)
			);
			// Always keep this row's OWN current fret selectable, even if
			// some other capo already happens to sit there too (a
			// pre-existing collision, e.g. from a shared link) -- otherwise
			// neither row's dropdown can find its own bound value among its
			// options and both render blank. New collisions still can't be
			// created going forward, since choosing a different fret then
			// trying to come back to the shared one won't be offered.
			return Object.fromEntries(
				Object.entries(this.capoFrets).filter(([fret]) => Number(fret) === ownFret || !takenByOthers.has(Number(fret)))
			);
		},

		toggleCoordHelper() {
			this.$store.commit('coordHelperActive', !this.coordHelperActive);
		},

		openAdvanced() {
			this.showAdvanced = !this.showAdvanced;
		},
		closeAdvanced() {
			this.showAdvanced = false;
		},
		nudge(field, delta) {
			if (field === 'noteSize') {
				this.localNoteSize = Math.round(Math.min(1.5, Math.max(0.1, this.localNoteSize + delta)) * 100) / 100;
				this.applyNoteSize();
			} else {
				this.localFontSize = Math.round(Math.min(2.0, Math.max(0.1, this.localFontSize + delta)) * 100) / 100;
				this.applyFontSize();
			}
		},

		applyNoteSize() {
			this.$store.commit('fretboard/noteSize', this.localNoteSize);
		},
		applyFontSize() {
			document.documentElement.style.setProperty('--font-size-scale', this.localFontSize);
		},
		applyFretNbSize() {
			this.$store.commit('fretboard/fretNbSize', this.localFretNbSize);
		},
		applyOvalFretWidth() {
			this.$store.commit('fretboard/ovalFretWidth', this.localOvalFretWidth);
		},
		saveCalibration() {
			const cal = { noteSize: this.localNoteSize, fontSize: this.localFontSize, fretNbSize: this.localFretNbSize, ovalFretWidth: this.localOvalFretWidth };
			localStorage.setItem('fishfrets@calibration', JSON.stringify(cal));
			this.$store.commit('fretboard/noteSize', this.localNoteSize);
			document.documentElement.style.setProperty('--font-size-scale', this.localFontSize);
			this.applyFretNbSize();
			this.applyOvalFretWidth();
			this.showAdvanced = false;
			alert('Calibration saved for this device!');
		},
		resetCalibration() {
			localStorage.removeItem('fishfrets@calibration');
			const isMobile = window.matchMedia('(max-width: 1024px)').matches;
			this.localNoteSize   = isMobile ? 0.43 : 0.69;
			this.localFontSize   = isMobile ? 0.43 : 0.62;
			this.localFretNbSize = 1.7;
			this.localOvalFretWidth = 0;
			this.applyNoteSize();
			this.applyFontSize();
			this.applyFretNbSize();
			this.applyOvalFretWidth();
		},

		resetAllSettings() {
			resetAllSettings();
		},

		openHelpPage(page) {
			window.open(`${window.location.origin}/docs/${page}`, '_blank');
		},
		openVideo(url) {
			if (url) window.open(url, '_blank');
		},
		togglePerspective() {
			// Switching between Player/Audience view also swaps RH/LH
			// because what's RH from player perspective is LH from audience perspective
			this.$store.commit('fretboard/toggle.isFlippedVert');
			// this.$store.commit('fretboard/toggle.isFlippedHor');
		},
		copyShareUrl() {
			const url = buildShareUrl(this.$store.state);
			navigator.clipboard.writeText(url).then(() => {
				this.copyUrlFeedback = true;
				setTimeout(() => { this.copyUrlFeedback = false; }, 2000);
			});
		},

		async exportFretboard(format) {
			const { exportFretboard } = await import('../modules/export-img.js');
			// dom-to-image rejects with a bare image-load Event (not an Error)
			// when the page can't load its data: images -- e.g. the CSP in
			// vercel.json once lacked data: in img-src, and every export on the
			// deployed site failed with no sign at all (2026-10-08).
			try {
				await exportFretboard(format);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('Export failed', e);
				alert(`Sorry, the ${format.toUpperCase()} export failed. Please report it with the bug tracker.`);
				return;
			}

			this.exportFeedback = format;
			setTimeout(() => { this.exportFeedback = null; }, 2000);
		},
	}
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.instrument-slot {
	position: relative;
}

.instrument-slot__audio {
	position: absolute;
	top: calc(100% + 6px);
	left: 0;
	z-index: 1;

	white-space: nowrap;
}

.FretboardSettings {
	@include mq($until: desktop)
	{
		display: flex;
		align-items: stretch;
		flex-direction: column;
	}

	@include mq($from: desktop)
	{
		display: flex;
		@include space-children-h(10px);
	}
}

.mobile-section-title {
	margin: 2.4rem 0 0.8rem;
	padding: 1.6rem 1.6rem 0;
	border-top: 1px solid var(--color--border, rgba(255,255,255,.12));
	font-size: 1.8rem;
	font-weight: bold;
	color: var(--color--text);
}

.settings-menu {
	display: flex;
	flex-direction: column;
	justify-content: stretch;

	min-width: 250px;
}

// Bug 20260914-4 follow-up (Bradley: "could we add two capos at the same
// time?") -- one row per capo, a fret picker plus its own remove button.
.capo-row {
	display: flex;
	align-items: stretch;
}

.capo-row__select {
	flex: 1;
	min-width: 0;
}

/* Was .advanced-panel / .adv-* -- renamed because Safari ad blockers'
   cosmetic filters hide elements whose class starts with "adv", which
   stripped the slider labels on Bradley's iPhone (2026-10-05). */
.calib-panel {
	padding: 8px 16px;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.calib-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 6px;
}

.calib-label {
	font-size: 13px;
	color: var(--color--text);
	font-family: 'Segoe UI', sans-serif;
}

.calib-value {
	font-size: 13px;
	font-weight: bold;
	color: var(--color--text);
	font-family: 'Segoe UI', sans-serif;
	min-width: 36px;
	text-align: right;
}

.calib-slider {
	width: 100%;
	cursor: pointer;
}

.calib-buttons {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	justify-content: flex-end;
}

.note-size-row {
	display: flex;
	flex-direction: column;
	padding: 8px 16px;
	gap: 6px;

	span {
		font-size: 14px;
		color: var(--color--text);
	}

	.note-size-input {
		width: 100%;
		cursor: pointer;
	}
}

.diag-output {
	padding: 8px 16px;
	pre {
		font-family: monospace;
		font-size: 12px;
		color: #111111;
		background: var(--color--bg--accent);
		border: 1px solid var(--color--border);
		border-radius: 6px;
		padding: 10px 12px;
		user-select: all;
		cursor: text;
		white-space: pre-wrap;
	}
}

.reset-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px;

	span {
		font-size: 14px;
		color: var(--color--text);
	}

	.reset-button {
		background-color: var(--color--bg--highlight);
		color: var(--color--text);
		border: 1px solid var(--color--border);
		border-radius: 6px;
		padding: 4px 12px;
		cursor: pointer;
		font-size: 13px;
		text-decoration: none;

		&:hover {
			background-color: var(--color--bg--tooltip);
			color: white;
		}
	}
}

.settings-menu__separator {
	display: none;

	height: 1px;

	background-color: var(--color--bg--highlight);

	@include mq($from: desktop) {
		display: block;
	}
}

.fret-range {
	@include space-children-v(20px);

	padding: 28px 20px;

	@include mq($from: desktop) {
		@include space-children-v(8px);

		padding: 14px;
	}
}

.fret-range__slider {
	min-width: 250px;
}

.fret-range__text {
	display: flex;
	align-items: center;
	justify-content: center;
	@include space-children-h(6px);

	color: var(--color--text);
}

.fret-range__text__separator {
	color: var(--color--text--secondary);
}

.export-menu {
	@include space-children-v(20px);

	padding: 10px;
}

.help-menu__videos {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 6px;
}

.export-menu__text {
	@include space-children-v(10px);

	max-width: 300px;

	text-align: justify;
	font-size: 1.6rem;

	color: var(--color--text);
}

.export-menu__buttons {
	display: flex;
	justify-content: center;
	@include space-children-h(10px);
}

.export-menu__separator {
	border: none;
	border-top: 1px solid var(--color--bg--highlight);
	margin: 10px 0;
}


.mcp-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 14px;
}

.mcp-title {
	font-size: 15px;
	font-weight: 700;
	color: #fff;
}

.mcp-close {
	background: none;
	border: none;
	font-size: 18px;
	color: #aaa;
	cursor: pointer;
	padding: 2px 6px;
	line-height: 1;
}

.mcp-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
	gap: 8px;
}

.mcp-label {
	font-size: 14px;
	color: #ccc;
	flex: 1;
}

.mcp-controls {
	display: flex;
	align-items: center;
	gap: 6px;
}

.mcp-btn {
	width: 36px;
	height: 36px;
	border-radius: 8px;
	border: 1px solid #555;
	background: #2a2a3e;
	color: #fff;
	font-size: 20px;
	font-weight: 700;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	padding: 0;

	&:active { background: #444; }
}

.mcp-input {
	width: 64px;
	padding: 6px 4px;
	text-align: center;
	font-size: 16px;
	font-weight: 700;
	color: #fff;
	background: #0d0d1a;
	border: 1px solid #555;
	border-radius: 6px;
	-moz-appearance: textfield;

	&::-webkit-inner-spin-button,
	&::-webkit-outer-spin-button { -webkit-appearance: none; }
}

.mcp-footer {
	display: flex;
	gap: 10px;
	margin-top: 14px;
}

.mcp-btn-reset {
	flex: 1;
	padding: 10px;
	border-radius: 8px;
	border: 1px solid #555;
	background: #2a2a3e;
	color: #ccc;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
}

.mcp-btn-save {
	flex: 2;
	padding: 10px;
	border-radius: 8px;
	border: none;
	background: #c0392b;
	color: white;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
}

.about-menu {
	padding: 16px 20px;
	text-align: center;
	min-width: 260px;
	color: var(--color--text);

	p { margin: 4px 0; }
}

.about-title {
	font-size: 1.4em;
	font-weight: 700;
}

.about-subtitle {
	font-size: 0.95em;
	font-style: italic;
	color: #aaa;
}

.about-copy {
	margin-top: 10px !important;
	font-size: 0.9em;
}

.about-version {
	font-size: 0.8em;
	color: #888;
}

</style>
<!--}}}-->
