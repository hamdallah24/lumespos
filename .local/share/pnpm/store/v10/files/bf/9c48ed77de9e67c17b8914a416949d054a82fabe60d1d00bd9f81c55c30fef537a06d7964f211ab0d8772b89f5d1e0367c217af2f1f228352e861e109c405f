require('../../_chunks/constants-BkJLCu9f.js');
require('../../_chunks/isomorphicAtob-BotUVOm6.js');
require('../../_chunks/isomorphicBtoa-o8eXb3FF.js');
require('../../_chunks/keys-COv7Q4fb.js');
require('../../_chunks/netlifyCacheHandler-B31jR34B.js');
require('../../_chunks/constants--3eQeRls.js');
const require_queryParams = require('../../_chunks/queryParams-CJ_jdSG4.js');

//#region src/internal/clerk-js/completeSignUpFlow.ts
const completeSignUpFlow = ({ signUp, verifyEmailPath, verifyPhonePath, continuePath, navigate, handleComplete, redirectUrl = "", redirectUrlComplete = "", oidcPrompt }) => {
	if (signUp.status === "complete") return handleComplete && handleComplete();
	else if (signUp.status === "missing_requirements") {
		if (signUp.missingFields.some((mf) => mf === "enterprise_sso")) return signUp.authenticateWithRedirect({
			strategy: "enterprise_sso",
			redirectUrl,
			redirectUrlComplete,
			continueSignUp: true,
			oidcPrompt
		});
		const params = require_queryParams.forwardClerkQueryParams();
		if (signUp.unverifiedFields?.includes("email_address") && verifyEmailPath) return navigate(verifyEmailPath, { searchParams: params });
		if (signUp.unverifiedFields?.includes("phone_number") && verifyPhonePath) return navigate(verifyPhonePath, { searchParams: params });
		if (continuePath) return navigate(continuePath, { searchParams: params });
	}
};

//#endregion
exports.completeSignUpFlow = completeSignUpFlow;
//# sourceMappingURL=completeSignUpFlow.js.map