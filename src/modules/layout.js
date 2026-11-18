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
import scssVars              from '@/styles/layout.module.scss'
import { mapObjectToObject } from '@/modules/object'

export const layout = mapObjectToObject({
	...scssVars,
}, function(_, value) {
	const numValue = parseInt(value.replace('px', ''), 10);

	return {
		px:  value,
		em:  `${numValue / 16}em`,
		int: numValue,
	};
});
