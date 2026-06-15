import "../../_chunks/constants-BVchI2jn.mjs";
import "../../_chunks/isomorphicAtob-C1KQ5FtS.mjs";
import "../../_chunks/isomorphicBtoa-BBBfp_jr.mjs";
import "../../_chunks/keys-jlv3GIE3.mjs";
import "../../_chunks/netlifyCacheHandler-DRKEKljg.mjs";
import { r as CLERK_MODAL_STATE } from "../../_chunks/constants-BhvdWHJL.mjs";
import { n as getClerkQueryParam } from "../../_chunks/queryParams-CgLKNx4H.mjs";
import { n as encodeB64 } from "../../_chunks/encoders-I4aTL_St.mjs";

//#region src/internal/clerk-js/queryStateParams.ts
const readStateParam = () => {
	const urlClerkState = getClerkQueryParam(CLERK_MODAL_STATE) ?? "";
	return urlClerkState ? JSON.parse(atob(urlClerkState)) : null;
};
const appendModalState = ({ url, startPath = "/user", currentPath = "", componentName, socialProvider = "" }) => {
	const redirectParams = {
		path: currentPath.replace(/CLERK-ROUTER\/VIRTUAL\/.*\//, "") || "",
		componentName,
		startPath,
		socialProvider
	};
	const encodedRedirectParams = encodeB64(JSON.stringify(redirectParams));
	const urlWithParams = new URL(url);
	const searchParams = urlWithParams.searchParams;
	searchParams.set(CLERK_MODAL_STATE, encodedRedirectParams);
	urlWithParams.search = searchParams.toString();
	return urlWithParams.toString();
};

//#endregion
export { appendModalState, readStateParam };
//# sourceMappingURL=queryStateParams.mjs.map