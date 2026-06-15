import "../../../_chunks/getEnvVariable-CzO2lHzx.mjs";
import "../../../_chunks/runtimeEnvironment-DHuMF-tN.mjs";
import "../../../_chunks/handleValueOrFn-xqbU450o.mjs";
import "../../../_chunks/instance-oOmLJefy.mjs";
import { t as noop } from "../../../_chunks/noop-D9Q9z2gm.mjs";
import "../../../_chunks/createDeferredPromise-BfxREsNu.mjs";
import "../../../_chunks/utils-DUJ_LExT.mjs";
import { t as createValidateComplexity } from "../../../_chunks/complexity-CaUD0e4e.mjs";
import { t as createValidatePasswordStrength } from "../../../_chunks/strength-Dv5QQLiv.mjs";

//#region src/internal/clerk-js/passwords/password.ts
const createValidatePassword = (loadZxcvbn, config, callbacks) => {
	const { onValidation = noop, onValidationComplexity = noop } = callbacks || {};
	const { show_zxcvbn, validatePassword: validatePasswordProp } = config;
	const getComplexity = createValidateComplexity(config);
	const getScore = createValidatePasswordStrength(config);
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
export { createValidatePassword };
//# sourceMappingURL=password.mjs.map