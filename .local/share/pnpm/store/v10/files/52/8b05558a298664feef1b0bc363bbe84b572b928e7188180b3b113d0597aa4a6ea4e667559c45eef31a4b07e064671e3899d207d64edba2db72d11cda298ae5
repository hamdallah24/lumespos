import "../../_chunks/constants-BVchI2jn.mjs";
import "../../_chunks/isomorphicAtob-C1KQ5FtS.mjs";
import "../../_chunks/isomorphicBtoa-BBBfp_jr.mjs";
import "../../_chunks/keys-jlv3GIE3.mjs";
import "../../_chunks/netlifyCacheHandler-DRKEKljg.mjs";
import "../../_chunks/constants-BhvdWHJL.mjs";
import { t as forwardClerkQueryParams } from "../../_chunks/queryParams-CgLKNx4H.mjs";

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
		const params = forwardClerkQueryParams();
		if (signUp.unverifiedFields?.includes("email_address") && verifyEmailPath) return navigate(verifyEmailPath, { searchParams: params });
		if (signUp.unverifiedFields?.includes("phone_number") && verifyPhonePath) return navigate(verifyPhonePath, { searchParams: params });
		if (continuePath) return navigate(continuePath, { searchParams: params });
	}
};

//#endregion
export { completeSignUpFlow };
//# sourceMappingURL=completeSignUpFlow.mjs.map