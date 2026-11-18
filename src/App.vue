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


div.root(v-mods="{isLayoutLandscape,isMobileDevice,isSubpageSettings}")

	transition(name="oval-width-flash")
		div.oval-width-flash(v-if="ovalWidthFlash !== null") Oval Fret Width: {{ ovalWidthFlash || 'Auto' }}

	transition(name="oval-width-flash")
		div.oval-width-flash(v-if="undoFlash !== null") {{ undoFlash }}

	transition(name="oval-width-flash")
		div.oval-width-flash(v-if="soundFlash !== null") {{ soundFlash }}

	div(:style="colorscheme")
		//----------------------------------------------------------------------	
		//- Header
		//----------------------------------------------------------------------
		header.header(v-mods="{isMobileDevice}")
			//- Logo
			div.header__logo(v-show="!isMobileDevice || subpage == 'fretboard'")
				font-awesome-icon.logo__icon(
					:icon="['fas', instrumentIcon]"
					v-mods="{ isUkulele: instrument == 'ukulele' }"
					)
				h1.logo__text Fish Frets
					span.logo__version  {{ version }}

			//- Audio switch (mobile -- on desktop it sits under the Instrument
			//- button, see FretboardSettings.vue)
			VAudioSwitch(
				v-if="isMobileDevice && subpage == 'fretboard'"
				reserve-caption
				)

			//- Settings (desktop)
			FretboardSettings(v-if="!isMobileDevice")

			//- Sub-pages links (mobile)
			nav.header__sublinks(v-if="isMobileDevice")
				div.sublinks__item(v-show="isMobileDevice && subpage == 'fretboard'" @click.left="scrollToSequences"): font-awesome-icon(:icon="['fas', 'list']")
				div.sublinks__item(v-show="isMobileDevice && subpage == 'fretboard'" @click.left="subpage =  'settings'"): font-awesome-icon(:icon="['fas', 'gear']")
				div.sublinks__item(v-show="isMobileDevice && subpage != 'fretboard'" @click.left="subpage = 'fretboard'"): font-awesome-icon(:icon="['fas', 'arrow-left']")

			//- Sub-pages headers
			h1.header__subpage-header(v-show="isMobileDevice && subpage ==  'settings'") Settings


	

	div.App#app(:style="colorscheme")

		div.instrument-background-scroll(
			v-show="!isMobileDevice || subpage == 'fretboard'"
			v-mods="{ isMobileDevice, isLayoutLandscape }"
		)
			div.bg-and-frets(
				v-mods="{isMobileDevice, isLayoutLandscape, isShortScreen, isFlippedVert}"
				:style="bgAndFretsStyle"
			)
				img.background-background(
					src="master_background.png"
				)
				img.text-overlay(
					src="master_fish_text.png"
				)
				img.logo-overlay(
					:src="logoImage"
					:style="logoOverlayStyle"
				)
				img.instrument-background(
					:src="backgroundImage"
					ref="backgroundImageRef"
					v-mods="{isLayoutLandscape, isFlippedVert}"
					:style="backgroundTransform ? { transform: backgroundTransform } : {}"
				)
				//- Coordinate helper overlay (dev tool — enabled in Advanced Calibration)
				CoordHelper(v-if="coordHelperActive")

				//- Fretboard
				div(
					v-mods="{ isLargeInstrument }"
				)
					FretboardViewer(
						:is-vertical="isMobileDevice && !isLayoutLandscape"
						v-mods="{ isLargeInstrument }"
						:style="isMobileDevice ? { '--note-size-scale': mobileNoteSize } : {}"
						)

					div.version-stamp(v-if="!isMobileDevice") 🎸 Fish Frets {{ version }}
				FretboardOvals
				PositionNudgers
				//- Bug button (Phil + Bradley, 2026-11-18): one tap opens Report
				//- Bug, for mid-lesson bugs on a tablet with no Ctrl-B. Sits below
				//- the lower-left tuning peg. Always on at localhost; elsewhere off
				//- unless this device was given ?bugbutton=on (remembered;
				//- ?bugbutton=off hides it).
				button.bug-fab(
					v-if="bugButtonOn && !bugTrackerActive"
					type="button"
					title="Report a bug (Ctrl-B)"
					aria-label="Report a bug"
					@click="openBugReport"
				)
					span.bug-fab__dot 🐞
				div.scale-titles.hand-drawn(v-if="!isMobileDevice || isLayoutLandscape" :class="{ 'two-scales': scaleTexts.length === 3 }")
					div.scale-texts
						div.scale-text(v-for="scaleText of scaleTexts") 
							div.dot(
								v-if="scaleText.color !== undefined"
								:style="{background: scaleText.color}"
							)
							span {{ scaleText.text }}
					div.strings-text {{ stringsText }}
			div.header-spacer(
			v-if="shouldDisplayHeaderSpacer"
			style="height:4rem"
		)
		
		

		//----------------------------------------------------------------------
		//- Body
		//----------------------------------------------------------------------
		//- Song mode: chord list -> one fretboard setup per chord
		SongPanel(v-if="songModeActive")

		//- Tuner Panel
		TunerPanel(v-if="tunerActive")

		//- Bug Tracker
		BugTracker(v-if="bugTrackerActive" :initialTab="bugTrackerTab" :initialBugId="bugTrackerFocusId" @close="bugTrackerActive = false")

		//- ROYGBIV Panel — normal document flow, below header-spacer
		//- RoygbivPanel(v-if="roygbivActive")

		div#canvas-wrapper(v-show="false")


		//- Settings (mobile)
		FretboardSettings(v-if="isMobileDevice && subpage == 'settings'")

		CustomTuning(v-if="!isMobileDevice")

		//- Scales & arpeggios -- same screen as the fretboard on mobile, reached
		//- by scrolling down (not a separate subpage -- Bradley Fish, via Phil:
		//- didn't want a whole other screen for this).
		//- Jam mode (secret: Ctrl-J): chord list -> every chord at once. In
		//- E: mode on a desktop the Jam box sits to the left of the Entries
		//- instead of above them (Phil, 2026-11-12: it "gets in the way of
		//- seeing the entries").
		div.jam-study(v-mods="{ isSide: isJamSide }")
			JamPanel(v-if="jamModeActive" :isSide="isJamSide" @entries-mode="jamEntriesMode = $event")
			div.jam-study__sequences: FretboardSequences(v-show="!isMobileDevice || subpage == 'fretboard'")

		//----------------------------------------------------------------------
		//- Footer
		//----------------------------------------------------------------------
		footer.footer(v-if="!isMobileDevice"): nav.nav

	//- Portrait mode overlay for mobile
	div.portrait-overlay(v-if="isMobileDevice && !isLayoutLandscape")
		div.portrait-message
			div.portrait-icon 🎸
			p.portrait-text Please rotate your phone

</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

import { get }               from 'vuex-pathify'

import { colorscheme }       from '@/modules/colorscheme'
import { mapObjectToObject } from '@/modules/object'
import { instruments, models, notesNames }       from '@/modules/music'
import { nameModel }         from '@/modules/name_scale'
import { enabledStringsText} from '@/modules/enabled_strings'
import { tuningNotes }       from '@/modules/tuning'
import { capitalizeWords }   from '@/modules/text'
import { resolveNoteName }           from '@/modules/notenames'
import { findBackground, findBackgroundImage, findBackgroundTransform } from '@/modules/background'

import { SEQ_COLOR_VALUES }  from '@/modules/constants'
import { mediaQueries }      from '@/stores/main'
import { preloadInstrumentFor, setDriveAmount } from '@/modules/audioPreview'

import FretboardSettings     from '@/components/FretboardSettings'
import FretboardViewer       from '@/components/FretboardViewer'
import FretboardSequences    from '@/components/FretboardSequences'
import CustomTuning          from '@/components/CustomTuning'
import PositionNudgers       from '@/components/PositionNudgers'
import FretboardOvals        from '@/components/FretboardOvals'
import CoordHelper           from '@/components/CoordHelper'
// import RoygbivPanel          from '@/components/RoygbivPanel'
import TunerPanel            from '@/components/TunerPanel'
import SongPanel             from '@/components/SongPanel'
import JamPanel              from '@/components/JamPanel'
import { applyChordList }    from '@/modules/jam'
import BugTracker            from '@/components/BugTracker'
import { resetAllSettings }  from '@/modules/reset'

const packageJson = require('@/../package.json');

// Ctrl+O cycles the oval fret width through these values, in this order,
// round-robin -- not a full 1-6 sweep of the store's valid range, just a
// quick way to A/B the handful of widths Bradley actually cares about
// without opening Advanced Calibration each time. 0 is Auto (3 for
// arpeggios, 4 for scales).
const OVAL_WIDTH_CYCLE = [0, 4, 2, 3];

const BUG_BUTTON_KEY = 'fishfrets@bugButton';
function readBugButtonSetting() {
	let saved = null;
	try { saved = localStorage.getItem(BUG_BUTTON_KEY); } catch (e) { /* private mode */ }
	if (saved) return saved === 'on';
	return window.location.hostname === 'localhost';   // always on for Phil's dev server
}

export default {
	name: 'App',

	components: {
		FretboardSettings,
		FretboardViewer,
		FretboardSequences,
		CustomTuning,
		PositionNudgers,
		FretboardOvals,
		CoordHelper,
		// RoygbivPanel,
		TunerPanel,
		SongPanel,
		JamPanel,
		BugTracker,
	},

	data() {
		return {
			mailto:         '',
			subpage:        'fretboard',
			bugTrackerActive: false,
			bugTrackerTab:    'report',
			bugTrackerFocusId: null,
			bugButtonOn:      readBugButtonSetting(),
			ovalWidthFlash:   null,
			undoFlash:        null,
			soundFlash:       null,
			jamEntriesMode:   false,
		}
	},

	computed: {
		/** E: mode on a desktop: Jam box left, Entries right. */
		isJamSide() {
			return this.jamModeActive && this.jamEntriesMode && !this.isMobileDevice;
		},
		
		scaleTexts(){
			if (this.displayedSequences.length > 2) return [];

			let texts = this.displayedSequences.map(
				sequence => ({ text: this.scaleText(sequence), color: sequence.color })
			)
			if (texts.length === 2) {
				texts = [ texts[0], {text:'&'}, texts[1]];
			}
			return texts;
		},
		shouldDisplayHeaderSpacer() {
			return this.isMobileDevice && this.subpage != 'fretboard'
		},
		isSubpageSettings() {
			return this.isMobileDevice && this.subpage == 'settings'
		},
		colorscheme() {
			// The colorscheme object contains 
			// [lightscheme,darkscheme] tuples,
			// where both are CSS colors.
			// Select the correct color for each property dynamically.
			return mapObjectToObject(colorscheme, (varName, values) => values[this.isDarkModeOn ? 1 : 0]);
		},
		instrumentIcon() {
			switch (this.instrument) {
				case 'bass':     return 'guitar-electric';
				case 'banjo-4':  return 'banjo';
				case 'banjo-5':  return 'banjo';
				// Mandolin icon is not part of the free set.
				case 'mandolin': return 'guitar';
				default:         return 'guitar';
			}
		},
		isLargeInstrument() {
			return instruments[this.instrument].nbStrings > 7;
		},
		version() {
			return `v${packageJson.version}`;
		},
		isShortScreen() {
			return !this.isTallScreen && !this.isMobileDevice;
		},
		mobileNoteSize() {
			return this.isMobileDevice ? this.noteSize * 1.05 : this.noteSize;
		},
		stringsText() {
			const notes = tuningNotes({
				instrument: this.instrument,
				tuning: this.tuning,
				customTuning: this.customTuning
			});
			// The thinnest/highest-pitched string -- last in tuningNotes'
			// low-to-high order -- is conventionally written lowercase in
			// tab notation (standard guitar: "E A D G B e") to tell it apart
			// from a same-named thicker string.
			const labeledNotes = notes.map(
				(note, i) => i === notes.length - 1 ? note.toLowerCase() : note
			);
			const visualNotes   = this.isFlippedVert ? labeledNotes : [...labeledNotes].reverse();
			const visualEnabled = this.isFlippedVert
				? [...this.enabledStrings]
				: [...this.enabledStrings].reverse();
			return enabledStringsText(visualEnabled, visualNotes);
		},

		backgroundImage() {
			return findBackgroundImage(this.instrument, this.isLayoutLandscape, this.isFlippedHor, this.isFlippedVert);
		},
		backgroundTransform() {
			return findBackgroundTransform(this.instrument, this.isFlippedHor, this.isFlippedVert);
		},
		bgAndFretsStyle() {
			const bg = findBackground(this.instrument);
			const nutOnRight = this.isFlippedHor !== this.isFlippedVert;
			const nudge = nutOnRight ? (bg.textNudgeRight ?? 0) : 0;
			return nudge ? { '--text-nudge': `${nudge}%` } : {};
		},
		logoImage() {
			const background = findBackground(this.instrument);
			return background.logoOverlay?.image ?? 'master_logo.png';
		},
		logoOverlayStyle() {
			const background = findBackground(this.instrument);
			const logo = background.logoOverlay;

			// Hide logo for instruments that haven't been configured yet.
			if (!logo) return { display: 'none' };

			// Convert pixel coords (in image space) to CSS percentages.
			const imageHeight = background.size[1];
			const topPct    = (logo.top    / imageHeight * 100).toFixed(2) + '%';
			const heightPct = (logo.height / imageHeight * 100).toFixed(2) + '%';

			// Headstock on LEFT for RHP/LHA, RIGHT for LHP/RHA.
			// x / xFlipped = pixel offset from the near edge of the image.
			const nutOnRight = this.isFlippedHor !== this.isFlippedVert;
			const imageWidth = background.size[0];
			const xRaw = nutOnRight ? (logo.xFlipped ?? logo.x ?? 0) : (logo.x ?? 0);
			const xPct = (xRaw / imageWidth * 100).toFixed(2) + '%';
			return {
				top:       topPct,
				height:    heightPct,
				transform: 'translateY(-50%)',
				...(nutOnRight
					? { right: xPct, left: 'auto' }
					: { left:  xPct, right: 'auto' }),
			};
		},

		...get('fretboard', [
			'instrument',
			'tuning',
			'customTuning',
			'enabledStrings',
			'isFlippedHor',
			'isFlippedVert',
			'noteSize',
			'tunerActive',
			'songModeActive',
			'jamModeActive',
			'audioPreviewActive',
			'instrumentVoices',
			'midiDrive',
			'ovalFretWidth',
			// 'roygbivActive',
		]),

		resolvedVoice() {
			return this.$store.state.fretboard.instrumentVoices[this.instrument];
		},


		...get('sequences', ['displayedSequences']),

		...get([
			'isDarkModeOn',
			'isMobileDevice',
			'isTallScreen',
			'isLayoutLandscape',
			'coordHelperActive',
		]),
	},

	// Audio Preview's sampled-instrument sound has to fetch its sample set
	// over the network before it can play -- start that fetch as soon as it's
	// relevant (on load, since Audio Preview defaults on, and again on any
	// instrument switch) so the first click-to-hear isn't stuck waiting on
	// it. preloadInstrumentFor() is cheap to call repeatedly: it's a no-op
	// once that instrument's samples are cached.
	watch: {
		instrument()              { if (this.audioPreviewActive) preloadInstrumentFor(this.instrument, this.resolvedVoice); },
		audioPreviewActive(v)     { if (v) preloadInstrumentFor(this.instrument, this.resolvedVoice); },
		resolvedVoice(v) { if (this.audioPreviewActive) preloadInstrumentFor(this.instrument, v); },
		midiDrive(v) { setDriveAmount(v); },
	},

	created() {
		this.feedbackMail = {
			subject: encodeURIComponent("Feedback on Fretboarder 🎸"),
			body:    encodeURIComponent("Thank you for providing feedback on Fretboarder!\nIf you wish to report a bug, please specify your OS and browser to help us resolve it faster.\n----------\n\n"),
		};

		// Add a sequence if there is none at startup -- A minor pentatonic in
		// the 5th position, the same as "Reset all settings" (Phil, 2026-10-24:
		// first-time visitors used to get the Whole position).
		if (this.$store.state.sequences.sequences.length == 0) {
			this.$store.commit('sequences/add');
			this.$store.commit('sequences/update', { index: 0, prop: 'position', value: 5 });
		}

		if (this.audioPreviewActive) preloadInstrumentFor(this.instrument, this.resolvedVoice);
		setDriveAmount(this.midiDrive);
	},

	mounted() {
		// Apply saved calibration (or mobile defaults) immediately on startup.
		// This MUST live here in App.vue — on mobile, FretboardSettings is not
		// mounted until the user opens the Display menu, so its mounted() hook
		// fires too late and the fretboard renders with the wrong noteSize.
		const saved    = JSON.parse(localStorage.getItem('fishfrets@calibration') || 'null');
		const isMobile = window.matchMedia('(max-width: 1024px)').matches;
		const noteSize = saved?.noteSize ?? (isMobile ? 0.43 : 0.69);
		const fontSize = saved?.fontSize ?? (isMobile ? 0.43 : 0.62);
		this.$store.commit('fretboard/noteSize', noteSize);
		document.documentElement.style.setProperty('--font-size-scale', fontSize);

		// Listen to any changes on the device type and layout orientation
		Object.keys(mediaQueries).forEach(mq => mediaQueries[mq].addListener(this[`update.${mq}`]));

		const ref = this.$refs.backgroundImageRef;

		window.ref = ref;
		const store = this.$store;

		const observer = new ResizeObserver((_entries) => {
			//const entry = entries[0];
			store.commit('backgroundSize', {width:ref.width, height:ref.height});
		});
		observer.observe(ref);

		// Keyboard arrow keys move the position bracket
		this._onKeyDown = (e) => {
			// Ctrl-R resets all settings, like Display > Reset (Phil,
			// 2026-11-10) -- even from the Jam box, where it would otherwise
			// reload the page (Windows). Cmd-R on a Mac still just reloads.
			if (e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'r' || e.key === 'R')) {
				e.preventDefault();
				resetAllSettings();
				return;
			}
			const tag = e.target?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			if (e.ctrlKey && e.key === 'b') {
				e.preventDefault();
				this.bugTrackerActive = !this.bugTrackerActive;
				this.bugTrackerTab = 'report';
				return;
			}
			if (e.ctrlKey && e.shiftKey && e.key === 'B') {
				e.preventDefault();
				this.bugTrackerActive = !this.bugTrackerActive;
				this.bugTrackerTab = 'view';
				return;
			}
			if (e.ctrlKey && e.shiftKey && e.key === 'A') {
				e.preventDefault();
				window.open(`${window.location.origin}/docs/architecture.html`, '_blank');
				return;
			}
			if (e.ctrlKey && e.key === 'a') {
				e.preventDefault();
				this.$store.commit('fretboard/audioPreviewActive', !this.audioPreviewActive);
				this.flashSound(this.audioPreviewActive ? 'Sound on' : 'Sound off');
				return;
			}
			// Jam mode (Phil, 2026-10-26): a secret shortcut, not in any menu.
			if (e.ctrlKey && e.key === 'j') {
				e.preventDefault();
				this.$store.commit('fretboard/jamModeActive', !this.jamModeActive);
				return;
			}
			if (e.ctrlKey && e.key === 'o') {
				e.preventDefault();
				const idx  = OVAL_WIDTH_CYCLE.indexOf(this.ovalFretWidth);
				const next = OVAL_WIDTH_CYCLE[(idx + 1) % OVAL_WIDTH_CYCLE.length];
				this.$store.commit('fretboard/ovalFretWidth', next);
				this.flashOvalWidth(next);
				return;
			}
			// Bug 20260908-2: Ctrl-Z undoes the single most recently removed
			// scale/arpeggio (Bradley: "if you accidentally delete a scale,
			// etc you can go back"). Narrow on purpose -- one slot, not a
			// full undo history; see sequences.js's remove/undoRemove.
			if (e.ctrlKey && e.key === 'z') {
				e.preventDefault();
				const removed = this.$store.state.sequences.lastRemoved;
				if (!removed) return;
				this.$store.commit('sequences/undoRemove');
				// undoRemove no-ops (and leaves lastRemoved set) if the list
				// was already back at MAX_NB_SEQUENCES -- only flash success
				// once it's confirmed the restore actually happened.
				if (this.$store.state.sequences.lastRemoved === null) {
					this.flashUndo(`Undid: removed ${this.scaleText(removed.sequence)}`);
				}
				return;
			}
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				e.preventDefault();
				const nutOnRight = this.isFlippedHor !== this.isFlippedVert;
				const goRight = (e.key === 'ArrowRight') !== nutOnRight;
				// Shift+arrow also steps onto "weird" pentatonic positions (widened
				// bracket, one string short a note) that plain arrow stepping skips.
				this.$store.commit(goRight ? 'incrementPosition' : 'decrementPosition', { includeWeird: e.shiftKey });
			}
		};
		window.addEventListener('keydown', this._onKeyDown);

		// URL param handler — restores full configuration from URL
		// Single scale:  ?instrument=guitar&key=A&scale=min5&position=5&view=RHP&capo=0
		// Multi-scale:   ?key=A&scale=min5&position=5&color=red&key2=A&scale2=maj5&color2=blue ...
		const p = new URLSearchParams(window.location.search);

		// ?bug=<bug_id> opens straight to that bug in the BugTracker's View
		// tab -- lets Phil send Bradley a link showing one bug's current state
		// (description, notes, screenshots) instead of pasting it all by hand.
		if (p.has('bug')) {
			this.bugTrackerFocusId = p.get('bug');
			this.bugTrackerTab     = 'view';
			this.bugTrackerActive  = true;
		}

		// ?bugbutton=on / ?bugbutton=off shows or hides the floating bug
		// button on this device from now on.
		if (p.has('bugbutton')) {
			this.bugButtonOn = p.get('bugbutton') !== 'off';
			try { localStorage.setItem(BUG_BUTTON_KEY, this.bugButtonOn ? 'on' : 'off'); } catch (e) { /* private mode */ }
		}

		// ?chart=120//:D C(add9)/G/G:// (Phil + Bradley, 2026-10-26) opens the
		// Jam box with that chart, ready for Play -- not playing yet, since a
		// browser only lets sound start from a click.
		if (p.has('chart')) {
			this.$store.commit('fretboard/jamText', p.get('chart'));
			this.$store.commit('fretboard/jamModeActive', true);
		}

		const URL_SUFFIXES = ['', '2', '3', '4', '5'];
		const scaleParams  = URL_SUFFIXES.filter(s => p.has('key' + s) || p.has('scale' + s));
		const capoParams   = URL_SUFFIXES.filter(s => p.has('capo' + s));
		const hasAnyParam  = scaleParams.length > 0 || p.has('view') || p.has('instrument') || capoParams.length > 0 || p.has('chords');

		if (hasAnyParam) {
			this.$nextTick(() => {
				this.$store.commit('sequences/removeAll');

				if (p.has('instrument'))
					this.$store.commit('fretboard/instrument', p.get('instrument'));

				// Capo(s) (bug 20260914-4 follow-up, Bradley: "could we add two
				// capos at the same time?"): same suffix convention as the
				// scale/arpeggio params above, so an old single-capo link (bare
				// `capo=N`) still works unchanged. caporeleased/caporeleased2/...
				// is the same bitmask shape as `muted`, and arms that capo's own
				// master lever so the UI shows the levers that explain why --
				// "fully clamped" (master red, levers hidden) must never
				// secretly mean a string is released.
				if (capoParams.length) {
					const capos = capoParams.map(s => {
						const releasedStrings = p.has('caporeleased' + s)
							? p.get('caporeleased' + s).split(',').map(b => b === '1')
							: [];
						return {
							fret:            parseInt(p.get('capo' + s)),
							releasedStrings,
							leversExpanded:  releasedStrings.some(Boolean),
						};
					});
					this.$store.commit('fretboard/capos', capos);
				}

				// Settings that change what the fretboard actually shows (as opposed
				// to cosmetic prefs like dark mode) -- kept in sync with
				// copyShareUrl() in FretboardSettings.vue, which only emits these
				// when they differ from their store default.
				if (p.has('tuning'))
					this.$store.commit('fretboard/tuning', p.get('tuning'));
				if (p.has('customtuning'))
					this.$store.commit('fretboard/customTuning', p.get('customtuning').split(','));
				if (p.has('ovalwidth'))
					this.$store.commit('fretboard/ovalFretWidth', parseInt(p.get('ovalwidth')));
				if (p.has('noteinfos'))
					this.$store.commit('fretboard/noteInfos', p.get('noteinfos'));
				if (p.has('audio'))
					this.$store.commit('fretboard/audioPreviewActive', p.get('audio') === '1');
				if (p.has('fretnbs'))
					this.$store.commit('fretboard/isShowingFretNbs', p.get('fretnbs') === '1');
				if (p.has('notenames'))
					this.$store.commit('fretboard/isShowingNoteNames', p.get('notenames') === '1');

				// View: RHP=default, LHP=flipHor, RHA=flipVert, LHA=both
				const view = p.get('view') ?? 'RHP';
				this.$store.commit('fretboard/isFlippedHor',  view === 'LHP' || view === 'LHA');
				this.$store.commit('fretboard/isFlippedVert', view === 'RHA' || view === 'LHA');

				// Add up to 5 scales from URL params
				const suffixes = scaleParams.length > 0 ? scaleParams : [''];
				suffixes.forEach(s => {
					this.$store.commit('sequences/add');
					const idx = this.$store.state.sequences.sequences.length - 1;
					if (p.has('key'      + s)) this.$store.commit('sequences/update', {index: idx, prop: 'tonality',         value: p.get('key'      + s)});
					if (p.has('scale'    + s)) this.$store.commit('sequences/update', {index: idx, prop: 'model',            value: p.get('scale'    + s)});
					if (p.has('position' + s)) this.$store.commit('sequences/update', {index: idx, prop: 'position',         value: parseInt(p.get('position' + s))});
					if (p.has('color'    + s)) {
						const hex = SEQ_COLOR_VALUES[p.get('color' + s)];
						if (hex) this.$store.commit('sequences/update', {index: idx, prop: 'color', value: hex});
					}
					if (p.has('oval'       + s)) this.$store.commit('sequences/update', {index: idx, prop: 'showOval',          value: p.get('oval'       + s) === '1'});
					if (p.has('harmony'    + s)) this.$store.commit('sequences/update', {index: idx, prop: 'harmonyInterval',   value: parseInt(p.get('harmony' + s))});
					if (p.has('skipstring' + s)) this.$store.commit('sequences/update', {index: idx, prop: 'harmonySkipString', value: p.get('skipstring' + s) === '1'});
					// Custom scale: which notes are checked, and (for the "Custom" position)
					// its own explicit fret bounds -- neither is derivable from key/scale/
					// position alone, so a shared URL for a custom scale did nothing without
					// these (bug 20260826-1 follow-up, Phil).
					if (p.has('customnotes' + s)) {
						const activeNotes   = p.get('customnotes' + s).split(',').filter(Boolean);
						const customSequence = mapObjectToObject(notesNames, () => false);
						activeNotes.forEach(n => { if (n in customSequence) customSequence[n] = true; });
						this.$store.commit('sequences/update', {index: idx, prop: 'customSequence', value: customSequence});
					}
					if (p.has('custombounds' + s)) {
						const bounds = p.get('custombounds' + s).split(',').map(Number);
						this.$store.commit('sequences/update', {index: idx, prop: 'customFretBounds', value: bounds});
					}
					// Notes hidden by hand (bug 20261012-2). Applied last: setting the
					// scale or key above clears any hidden notes.
					if (p.has('hidden' + s)) {
						const keys = p.get('hidden' + s).split(',').filter(k => /^\d+:\d+$/.test(k));
						this.$store.commit('sequences/update', {index: idx, prop: 'hiddenFrets', value: keys});
					}
				});

				// Muted strings
				if (p.has('muted')) {
					const bits = p.get('muted').split(',');
					const enabled = bits.map(b => b !== '0');
					this.$store.commit('fretboard/enabledStrings', enabled);
				}

				// Jam mode link, ?chords=C,G7,G,F (Phil, 2026-10-26): every chord at
				// once, replacing any key/scale entries above.
				if (p.has('chords'))
					applyChordList(this.$store, p.get('chords'));
			});
		}
	},

	destroyed() {
		// Clear event listeners
		Object.keys(mediaQueries).forEach(mq => mediaQueries[mq].removeListener(this[`update.${mq}`]));
		window.removeEventListener('keydown', this._onKeyDown);
		clearTimeout(this._ovalWidthFlashTimer);
		clearTimeout(this._undoFlashTimer);
		clearTimeout(this._soundFlashTimer);
	},

	methods: {
		openBugReport() {
			this.bugTrackerFocusId = null;
			this.bugTrackerTab     = 'report';
			this.bugTrackerActive  = true;
		},
		// Add all kinds of media queries as methods.
		...Object.fromEntries(Object.keys(mediaQueries).map(mq => [`update.${mq}`, function(event) { return this.$store.commit(mq, event.matches); }])),
		flashOvalWidth(n) {
			clearTimeout(this._ovalWidthFlashTimer);
			this.ovalWidthFlash = n;
			this._ovalWidthFlashTimer = setTimeout(() => { this.ovalWidthFlash = null; }, 1200);
		},
		flashSound(text) {
			clearTimeout(this._soundFlashTimer);
			this.soundFlash = text;
			this._soundFlashTimer = setTimeout(() => { this.soundFlash = null; }, 1200);
		},
		flashUndo(text) {
			clearTimeout(this._undoFlashTimer);
			this.undoFlash = text;
			this._undoFlashTimer = setTimeout(() => { this.undoFlash = null; }, 1200);
		},
		// Scales & arpeggios live below the fretboard on the same mobile
		// screen now (not a separate subpage) -- the header's list icon just
		// scrolls down to them instead of switching views.
		scrollToSequences() {
			document.querySelector('.FretboardSequences')?.scrollIntoView({ behavior: 'smooth' });
		},
		// Index is sequence index.
		scaleText(sequence) {
			const modelName = nameModel(sequence.model);

			// const modelStrings = enabledStringsText(
			// 	[...this.enabledStrings].reverse(), 
			// 	tuningNotes({
			// 		instrument: this.instrument,
			// 		tuning: this.tuning,
			// 		customTuning: this.customTuning
			// 	})
			// );

			const tonality = resolveNoteName(
				sequence.tonality, sequence.tonality,
				models[sequence.model].mode,
				sequence.model
			);
			return capitalizeWords(`${tonality} ${modelName}`);
		},
	}
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

// E: mode (Phil, 2026-11-12): the Jam box to the left of the Entries.
.jam-study.is-side {
	display: flex;
	align-items: flex-start;

	.JamPanel {
		flex: 0 0 34%;
		align-self: stretch;
	}

	.jam-study__sequences {
		flex: 1;
		min-width: 0;
	}
}

/**
 * Layout
 * -----------------------------------------------------------------------------
 */

.root.is-mobile-device.is-layout-landscape {
	// Was overflow-y:hidden + a fixed height:100vh, which clipped anything
	// past the fretboard -- including the scales/arpeggios list below it --
	// entirely out of reach on mobile. Scales used to live on their own
	// subpage instead for exactly that reason; now that they're inline (see
	// scrollToSequences above), the page needs to actually be scrollable.
	overflow-y: auto;
	min-height: 100vh;
}

.App {
	display: flex;
	flex-direction: column;
	width: 100%;

	flex: 1 1 auto;
	background-color: var(--color--bg);
	min-height: 100vh;
}

.fretboard-wrapper {
	@include mq($until: desktop) {
		@media (orientation: portrait) {
			margin: 20px 0;

			&.is-large-instrument {
				//overflow-x: scroll;

				margin: 0;
				padding: 20px;
			}
		}

		@media (orientation: landscape) {
			//overflow-x: scroll;

			padding: 40px 20px;
		}
	}

	@include mq($from: desktop) {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		//overflow-x: auto;

		min-height: 33vh;

		margin-bottom: 60px;
		padding: 70px 0 40px;
	}
}

/**
 * Header
 * -----------------------------------------------------------------------------
 */

.header {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	padding: 1rem;

	display: flex;
	align-items: center;
	justify-content: space-between;

	@include mq($until: desktop) {
		background-color: var(--color--bg--tooltip);
		//background-color: red;
	}
	

	@include mq($from: desktop) {
		margin-bottom: 40px;
	}
}

.header.is-mobile-device {
	position:static;
}

.header__logo {
	display: flex;
	align-items: center;
	@include space-children-h(8px);

	padding: 10px;

	border-radius: 6px;

	//color: var(--color--text);
	color: white;

	@include mq($from: desktop) {
		@include space-children-h(5px);

		padding: 4px 6px;

		/*color: var(--color--bg);*/
		background-color: #171e29;

		&:hover {
			background-color: var(--color--hover);
		}
	}
}

.oval-width-flash {
	position: fixed;
	top: 16%;
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	pointer-events: none;

	padding: 10px 22px;

	font-size: 20px;
	font-weight: 700;
	color: #fff;

	border: 1px solid #ff8c00;
	border-radius: 999px;
	background: #2a1a05e6;
	box-shadow: 0 0 16px #ff8c0088;
}

.oval-width-flash-enter-active,
.oval-width-flash-leave-active {
	transition: opacity 0.2s ease;
}
.oval-width-flash-enter,
.oval-width-flash-leave-to {
	opacity: 0;
}

.roygbiv-toggle {
	cursor: pointer;
	font-family: monospace;
	border: 1px solid #334;
	border-radius: 6px;
	padding: 4px 10px;
	font-size: 12px;
	background: #10102a;
	color: #aab;
	margin-left: 12px;

	&.is-active {
		background: #1a1a40;
		border-color: #6633ff;
		color: #fff;
		box-shadow: 0 0 8px #6633ff88;
	}
}

.logo__icon {
	font-size: 20px;

	&.is-ukulele { font-size: 14px; }
}

.logo__version {
	font-size: 11px;
	font-weight: 600;
	opacity: 0.65;
	vertical-align: super;
	letter-spacing: 0.03em;
	margin-left: 3px;
}

.logo__text {
	font-size: 20px;
	font-weight: bold;

	transition: color 200ms;

	@include mq($from: desktop) {
		font-size: 24px;
	}
}

.header__sublinks {
	display: flex;
	justify-content: flex-end;

	padding: 10px;
}

.sublinks__item {
	@include center-content;
	@include circle(36px);

	font-size: 18px;

	border: 1px solid var(--color--text);

	color: var(--color--text);

	cursor: pointer;

	&:first-child {
		margin-right: 10px;
	}
}

.header__subpage-header {
	flex: 1 1 100%;

	font-size: 18px;
	font-weight: bold;

	color: var(--color--text);

	
}

/**
 * Footer
 * -----------------------------------------------------------------------------
 */

.footer {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;

	flex: 1 1 100%;

	margin-top: 40px;
}

.dot {
	@include circle(14px);
	display: inline-block;
	margin-right: 10px;
}

.header {
	// Ensure that header is displayed over absolutely-positioned fret notes.
	z-index: 100; 
}

.nav {
	display: flex;
	justify-content: flex-end;
	@include space-children-h(20px);
}

.nav__link {
	display: flex;
	align-items: center;
	@include space-children-h(6px);

	font-size: 1.35rem;

	color: var(--color--text--secondary);

	cursor: pointer;

	&:hover {
		color: var(--color--hover);
	}
}

.nav__link__text {
	cursor: pointer;
}

.link-support    { color: var(--color--red);    }
.link-tgld:hover { color: var(--color--orange); }

.instrument-background {
	// Display over water backround, but still take up space in layout.
	display: block;
	z-index: 1;
	position: relative;
	width: 100%;

	// Without this, a press-and-hold anywhere near this image on iOS Safari
	// (e.g. the nudger buttons sitting on top of it) can trigger the native
	// "Save Image / Copy Image" callout instead of -- or racing with -- this
	// app's own hold gesture (bug 20260825-2, Phil: dialog kept popping up
	// while holding a nudger button on his phone).
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	user-select: none;
}

// Water background behind instrument.
.background-background {
	display: block;
	width: 100%;
	position: absolute;
	height: 100%;
	object-fit: cover;

	-webkit-touch-callout: none;
	-webkit-user-select: none;
	user-select: none;
}

// Bradley Fish logo on headstock — sits above text-overlay, below instrument.
// top, height, and left/right are set dynamically via logoOverlayStyle.
.logo-overlay {
	display: block;
	position: absolute;
	width: auto;
	z-index: 2;
	pointer-events: none;
}

// Text overlay (copyright, website) above background, below instrument.
// --text-nudge shifts the overlay right for instruments where the body covers the text.
.text-overlay {
	display: block;
	width: 100%;
	position: absolute;
	height: 100%;
	object-fit: cover;
	z-index: 1;
	pointer-events: none;
	transform: translateX(var(--text-nudge, 0%));
}

.instrument-background.is-layout-landscape {
	width: 100%;
}

.instrument-background-scroll {
	width: 100%;
	overflow-x: hidden;

	@include mq($from:desktop) {
		overflow-x: hidden;
	}
	overflow-y:hidden;
}

.instrument-background-scroll.is-mobile-device {
	width: 100%;
	overflow-x: hidden;
	overflow-y: hidden;
}

.instrument-background-scroll.is-mobile-device.is-layout-landscape {
	width: 100%;
	overflow-x: hidden;
	overflow-y: auto;
}

.bg-and-frets {
	position: relative;
	width: 100%;
	overflow: hidden;
}
.bg-and-frets > div {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
}

.instrument-background.is-flipped-vert {
	margin-top: 0px;
}

.bg-and-frets.is-flipped-vert > div {
	top: -1px;
}



.bg-and-frets.is-layout-landscape.is-short-screen {
	transform: scale(0.5) translateY(-50%) translateX(-50%);
}

// TODO only display on desktop.
.version-stamp {
	position: absolute;
	bottom: 18px;
	left: calc(38% + var(--text-nudge, 0%));
	font-size: 0.8em;
	color: white;
	opacity: 0.8;
	font-weight: 600;
	pointer-events: none;
	z-index: 5;
	@include outline-text(1px);
}

.smilin-phil-stamp {
	position: absolute;
	top: auto !important;
	left: calc(41.5% + var(--text-nudge, 0%)) !important;
	bottom: 10px !important;
	font-size: 1.4em;
	color: #f0e68c;
	opacity: 0.9;
	font-weight: 500;
	font-style: italic;
	pointer-events: none;
	z-index: 5;
	letter-spacing: 0.03em;
	@include outline-text(1px);
}

.bg-and-frets > .scale-titles {
	position: absolute;
	top: 5px !important;
	left: 200px !important;
	z-index: 4;
	font-size: 5em;
	color: white;
	font-weight: 700;
	@include outline-text(1px);

	@media (max-width: 1024px) and (orientation: landscape) {
		font-size: 2.5em;
		left: 20px !important;
		top: 20px !important;
	}
}

.bg-and-frets > .scale-titles.two-scales {
	font-size: 2.5em;

	@media (max-width: 1024px) and (orientation: landscape) {
		font-size: 1.5em;
	}
}

.scale-texts {
	display: flex;
	flex-direction: row;
}

.strings-text {
	text-align: center;
}

.scale-text {
	padding-left: 1em;
	padding-right: 1em;
}

// Portrait mode overlay
.portrait-overlay {
	position: fixed;
	inset: 0;
	z-index: 99999;
	background: #0a0a1a;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 80px;
}

.portrait-message {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24px;
	padding: 40px;
	text-align: center;
}

.portrait-icon {
	font-size: 64px;
	animation: rotate-hint 2s ease-in-out infinite;
}

@keyframes rotate-hint {
	0%   { transform: rotate(0deg); }
	40%  { transform: rotate(90deg); }
	60%  { transform: rotate(90deg); }
	100% { transform: rotate(0deg); }
}

.portrait-text {
	font-size: 22px;
	font-weight: 700;
	color: #fff;
	font-family: 'Segoe UI', sans-serif;
	line-height: 1.4;
	max-width: 260px;
}

// Bug button (see template). The button itself is an invisible tap area
// covering the lower-left tuning peg and the strip below it, so a tap anywhere
// near the peg opens Report Bug; only the small dot under the peg shows.
.bug-fab {
	position: absolute;
	left: 0;
	bottom: 0;
	z-index: 50;
	width: 6.5%;
	height: 27%;
	padding: 0 0 0.3% 0;
	border: none;
	background: transparent;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;

	&:hover .bug-fab__dot { opacity: 1; }
}
.bug-fab__dot {
	display: flex;
	align-items: center;
	justify-content: center;
	width: clamp(14px, 1.45vw, 21px);
	height: clamp(14px, 1.45vw, 21px);
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.85);
	background: #c0392b;
	font-size: clamp(8px, 0.8vw, 12px);
	line-height: 1;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
	opacity: 0.85;
}

</style>
<!--}}}-->

<!--{{{ Global styles -->
<style lang="scss">

@use "@/styles/global";

</style>
<!--}}}-->

<style>
.bg-and-frets > .PositionNudgers {
    top: auto !important;
    bottom: 10% !important;
}

/* iPhone — halfway between copyright and fret numbers, 20% smaller */
@media (max-width: 1200px) {
    .bg-and-frets > .PositionNudgers {
        bottom: 12% !important;
        font-size: 16px !important;
    }
}

</style>
