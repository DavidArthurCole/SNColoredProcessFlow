var ProcessFlowUtils = Class.create();
ProcessFlowUtils.prototype = {
    initialize: function() { },

	/**
	 * Given a record as input, lookup the Process Flow steps for the table, if available,
	 * and convert them into a GlideChoiceList.
	 * 
	 * @param {GlideRecord<>} current - the current record. Will be populated 'automatically' by the Business Rule.
	 * @returns {GlideChoiceList|null} the populated choice list, if Process Flow steps were found for the given record's table, null otherwise.
	 */
	getProcessFlowSteps: function(current) {
		if (gs.nil(current) || !current.isValidRecord()) return null;
		const tableName = current.getValue('sys_class_name');
		
		// Lookup process flow records for the given table.
		const pfGr = new GlideRecord('sys_process_flow');
		pfGr.addEncodedQuery(`table=${tableName}^active=true`);
		pfGr.orderBy('order');
		pfGr.query();

		// If none were found, return null
		if (!pfGr.hasNext()) return null;

		// Build out a new choice list
		const choices = new GlideChoiceList();
		var foundCurrentStep = false;
		var reachedEndStep = false;

		// Loop through the Process Flow steps we found,
		// until we reach an End Step, or have gone through them all.
		while(pfGr.next() && !reachedEndStep) {
			// Backend name of the step.
			var pfName = pfGr.getValue('name');
			// User-facing name of the step.
			var pfLabel = pfGr.getDisplayValue('label');
			var choice = new GlideChoice(pfName, pfLabel);
			// We will assume the step is in the 'past' state, for now.
			choice.setParameter('state', 'past');

			// Check if the current record matches the given condition(s).
			var conditionsMatch = GlideFilter.checkRecord(current, pfGr.condition);

			if (!foundCurrentStep && conditionsMatch) {
				// This is the current step!
				choice.setParameter('state', 'current');
				foundCurrentStep = true;

				// This is where we add our color!
				var customColor = pfGr.getValue('u_color');
				if (!gs.nil(customColor)) {
					var parsedColorArray = this._parseColor(customColor);
					if (!gs.nil(parsedColorArray) && parsedColorArray.length == 3) {
						var tripletArrayString = parsedColorArray.join(', ');
						choice.setParameter('rgb_triplet', tripletArrayString);
					} else {
						gs.error(`Could not parse provided custom color: ${customColor}`, 'ProcessFlowUtils');
					}
				}

				// Check if we've reached an End Step
				var endStepValue = pfGr.getValue('u_end_step');
				reachedEndStep = (reachedEndStep || endStepValue == 1);
			} else if (foundCurrentStep) {
				// If we've already found the current step, any further steps will be Future.
				choice.setParameter('state', 'future');
			}

			// Add the choice to the GlideChoiceList
			choices.add(choice);
		}

		// Return the GlideChoiceList we built.
		return choices;
	},

	/**
	 * Given an input, parse out the RGB color format, to be passed as a parameter in the GlideChoiceList
	 * for a Process Flow step. Note that alpha values, if provided, will be ignored.
	 * 
	 * NOTE: As written, this function will ONLY parse the following formats:
	 * 	- RGB/A (comma agnostic): rgb(0, 122, 255) OR rgba(0 122 255 / 80%)
	 * 	- Hex: #f0f OR #ff00ff
	 * 
	 * If you are using a different color format, you will need to edit this function.
	 * 
	 * @param {string} input - the input to parse the color from.
	 * @returns {Array|null} a length-3 array of R,G,B values, if the color could be parsed, null otherwise. 
	 */
	_parseColor: function(input) {
		/**
		 * REGEX-TEST: rgb(0, 0, 0)
		 * REGEX-TEST: rgba(0, 255, 255, 0.5)
		 * REGEX-TEST: rgba(255, 99, 71, 1)
		 * REGEX-TEST: rgba(0 122 255 / 80%)
		 */
		const rgbaExp = /^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+[\d\.%]+)?\)$/g;
		const rgbaRegex = new RegExp(rgbaExp);
		const rgbaMatches = rgbaRegex.exec(input);
		if (!gs.nil(rgbaMatches) && rgbaMatches.length == 4) {
			// Drop the first element from the array.
			// Essentially converting from:
			//  [ 'rgb(0, 0, 0)', '0', '0', '0' ]
			// To:
			//  [ '0', '0', '0' ]
			return rgbaMatches.slice(1).map(nStr => parseInt(nStr));
		}

		/**
		 * REGEX-TEST: #FFFFFF
		 * REGEX-TEST: #fff
		 * REGEX-TEST: #000
		 */
		const hexExp = /^#(?:[a-f\d]{3}|[a-f\d]{6})$/gi;
		const hexRegex = new RegExp(hexExp);
		const hexMatches = hexRegex.exec(input);
		if (!gs.nil(hexMatches)) {
			var hexString = hexMatches[0].replace(/^#/, '');
			if (!hexString.length == 6) {
				// Join each character with a leading 0 to conform to full hex code.
				hexString = hexString.split('').map(s => '0' + s).join('');
			}
			return [
				hexString.slice(0, 2), // Red
				hexString.slice(2, 4), // Green
				hexString.slice(4, 6), // Blue
			].map(hexStr => parseInt(hexStr, 16));
		}

		// If you want to add additional color format(s) parsing, do so here.
		// ...


		// No matching format found.
		return null;
	},

    type: 'ProcessFlowUtils'
};