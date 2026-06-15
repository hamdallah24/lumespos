require('../../_chunks/constants-BkJLCu9f.js');
require('../../_chunks/isomorphicAtob-BotUVOm6.js');
require('../../_chunks/isomorphicBtoa-o8eXb3FF.js');
require('../../_chunks/keys-COv7Q4fb.js');
require('../../_chunks/netlifyCacheHandler-B31jR34B.js');
const require_constants$1 = require('../../_chunks/constants--3eQeRls.js');
const require_queryParams = require('../../_chunks/queryParams-CJ_jdSG4.js');
const require_encoders = require('../../_chunks/encoders-DUnKnyS7.js');

//#region src/internal/clerk-js/queryStateParams.ts
const readStateParam = () => {
	const urlClerkState = require_queryParams.getClerkQueryParam(require_constants$1.CLERK_MODAL_STATE) ?? "";
	return urlClerkState ? JSON.parse(atob(urlClerkState)) : null;
};
const appendModalState = ({ url, startPath = "/user", currentPath = "", componentName, socialProvider = "" }) => {
	const redirectParams = {
		path: currentPath.replace(/CLERK-ROUTER\/VIRTUAL\/.*\//, "") || "",
		componentName,
		startPath,
		socialProvider
	};
	const encodedRedirectParams = require_encoders.encodeB64(JSON.stringify(redirectParams));
	const urlWithParams = new URL(url);
	const searchParams = urlWithParams.searchParams;
	searchParams.set(require_constants$1.CLERK_MODAL_STATE, encodedRedirectParams);
	urlWithParams.search = searchParams.toString();
	return urlWithParams.toString();
};

//#endregion
exports.appendModalState = appendModalState;
exports.readStateParam = readStateParam;
//# sourceMappingURL=queryStateParams.js.map