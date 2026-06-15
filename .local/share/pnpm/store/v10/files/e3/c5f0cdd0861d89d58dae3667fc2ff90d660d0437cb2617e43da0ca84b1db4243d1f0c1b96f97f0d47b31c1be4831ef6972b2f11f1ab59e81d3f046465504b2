require('../../../_chunks/getEnvVariable-HbsW2WWf.js');
require('../../../_chunks/runtimeEnvironment-DLM4o1Pu.js');
require('../../../_chunks/handleValueOrFn-D1JzdrJ-.js');
require('../../../_chunks/instance-DPIKVAEY.js');
const require_noop = require('../../../_chunks/noop-CTUdRHpt.js');
require('../../../_chunks/createDeferredPromise-B0t_CzEQ.js');
require('../../../_chunks/utils-COuXXlVE.js');
const require_complexity = require('../../../_chunks/complexity-CxIC3I0A.js');
const require_strength = require('../../../_chunks/strength-gaXjXfiO.js');

//#region src/internal/clerk-js/passwords/password.ts
const createValidatePassword = (loadZxcvbn, config, callbacks) => {
	const { onValidation = require_noop.noop, onValidationComplexity = require_noop.noop } = callbacks || {};
	const { show_zxcvbn, validatePassword: validatePasswordProp } = config;
	const getComplexity = require_complexity.createValidateComplexity(config);
	const getScore = require_strength.createValidatePasswordStrength(config);
	let result = {};
	return (password, internalCallbacks) => {
		const { onValidation: internalOnValidation = onValidation, onValidationComplexity: internalOnValidationComplexity = onValidationComplexity } = internalCallbacks || {};
		if (!validatePasswordProp) return;
		/**
		* Validate Complexity
		*/
		const failedValidationsComplexity = getComplexity(password);
		internalOnValidationComplexity(Object.keys(failedValidationsComplexity).length === 0);
		result = {
			...result,
			complexity: failedValidationsComplexity
		};
		/**
		* Validate score
		*/
		if (show_zxcvbn)
 /**
		* Lazy load zxcvbn without preventing a complexityError to be thrown if it exists
		*/
		loadZxcvbn().then((zxcvbn) => {
			const strength = getScore(zxcvbn)(password);
			result = {
				...result,
				strength
			};
			internalOnValidation({
				...result,
				strength
			});
		});
		if (result.complexity && Object.keys(result.complexity).length === 0 && show_zxcvbn) return;
		internalOnValidation(result);
	};
};

//#endregion
exports.createValidatePassword = createValidatePassword;
//# sourceMappingURL=password.js.map