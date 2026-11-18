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

div.VPopupMenu
	VButton(
		ref="button"

		:icon="icon"
		:text="text"

		@click="isOpen = !isOpen"
		)
	VPopup.popup(
		:target="$refs.button ? ($refs.button.$el || false) : false"
		placement="bottom"

		:is-open="isOpen"
		v-click-outside="clickOutsideHandler"
		)
		slot

</template>
<!--}}}-->


<!--{{{ JavaScript -->
<script>

export default {
	name: 'VPopupMenu',

	props: {
		icon: {
			type: [Array, String],
			required: true,
		},
		text: {
			type: String,
			default: '',
		},
		forceClosing: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			isOpen: false,
		}
	},

	watch: {
		forceClosing() {
			this.isOpen = false;
		},
	},

	methods: {
		clickOutsideHandler(event) {
			if (!this.$refs.button.$el.contains(event.target))
				this.isOpen = false;
		},
	},
}

</script>
<!--}}}-->


<!--{{{ SCSS -->
<style lang="scss" scoped>

.popup {
	z-index: 2000;

	color: var(--color--bg);
	background-color: var(--color--bg);
}

</style>
<!--}}}-->
