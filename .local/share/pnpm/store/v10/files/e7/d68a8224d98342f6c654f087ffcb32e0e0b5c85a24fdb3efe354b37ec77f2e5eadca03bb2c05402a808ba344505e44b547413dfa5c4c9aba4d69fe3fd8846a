import "../../_chunks/constants-BVchI2jn.mjs";
import "../../_chunks/isomorphicAtob-C1KQ5FtS.mjs";
import "../../_chunks/isomorphicBtoa-BBBfp_jr.mjs";
import "../../_chunks/keys-jlv3GIE3.mjs";
import "../../_chunks/globs-i-wlvmWn.mjs";
import "../../_chunks/instance-oOmLJefy.mjs";
import "../../_chunks/url-BwZwnCsF.mjs";
import { t as logger } from "../../_chunks/logger-C6joC6-q.mjs";
import "../../_chunks/netlifyCacheHandler-DRKEKljg.mjs";
import "../../_chunks/underscore-CPJSkOtE.mjs";
import "../../_chunks/constants-BhvdWHJL.mjs";
import { t as forwardClerkQueryParams } from "../../_chunks/queryParams-CgLKNx4H.mjs";
import "../../_chunks/path-Cu4Idm84.mjs";
import "../../_chunks/querystring-CkKMRfkg.mjs";
import { t as buildURL } from "../../_chunks/url-DmmVMOFI.mjs";

//#region src/internal/clerk-js/sessionTasks.ts
/**
* @internal
*/
const INTERNAL_SESSION_TASK_ROUTE_BY_KEY = {
	"choose-organization": "choose-organization",
	"reset-password": "reset-password",
	"setup-mfa": "setup-mfa"
};
/**
* @internal
*/
const getTaskEndpoint = (task) => `/tasks/${INTERNAL_SESSION_TASK_ROUTE_BY_KEY[task.key]}`;
/**
* @internal
*/
function buildTaskUrl(task, opts) {
	const params = forwardClerkQueryParams();
	return buildURL({
		base: opts.base,
		hashPath: getTaskEndpoint(task),
		searchParams: params
	}, { stringify: true });
}
/**
* @internal
*/
function navigateIfTaskExists(session, { navigate, baseUrl }) {
	const currentTask = session.currentTask;
	if (!currentTask) return;
	return navigate(buildTaskUrl(currentTask, { base: baseUrl }));
}
function warnMissingPendingTaskHandlers(options) {
	const taskOptions = ["taskUrls", "navigate"];
	if (Object.keys(options).some((option) => taskOptions.includes(option))) return;
	logger.warnOnce(`Clerk: Session has pending tasks but no handling is configured. To handle pending tasks, provide either "taskUrls" for navigation to custom URLs or "navigate" for programmatic navigation. Without these options, users may get stuck on incomplete flows.`);
}

//#endregion
export { INTERNAL_SESSION_TASK_ROUTE_BY_KEY, buildTaskUrl, getTaskEndpoint, navigateIfTaskExists, warnMissingPendingTaskHandlers };
//# sourceMappingURL=sessionTasks.mjs.map