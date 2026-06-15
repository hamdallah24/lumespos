require('../../_chunks/constants-BkJLCu9f.js');
require('../../_chunks/isomorphicAtob-BotUVOm6.js');
require('../../_chunks/isomorphicBtoa-o8eXb3FF.js');
require('../../_chunks/keys-COv7Q4fb.js');
require('../../_chunks/globs-CZWoq1qv.js');
require('../../_chunks/instance-DPIKVAEY.js');
require('../../_chunks/url-Cq_6jGm6.js');
const require_logger = require('../../_chunks/logger-BzS7QmaO.js');
require('../../_chunks/netlifyCacheHandler-B31jR34B.js');
require('../../_chunks/underscore-CWzKsZlj.js');
require('../../_chunks/constants--3eQeRls.js');
const require_queryParams = require('../../_chunks/queryParams-CJ_jdSG4.js');
require('../../_chunks/path-SJPOYo4w.js');
require('../../_chunks/querystring-GErwUukQ.js');
const require_url$1 = require('../../_chunks/url-BQ23dkOu.js');

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
	const params = require_queryParams.forwardClerkQueryParams();
	return require_url$1.buildURL({
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
	require_logger.logger.warnOnce(`Clerk: Session has pending tasks but no handling is configured. To handle pending tasks, provide either "taskUrls" for navigation to custom URLs or "navigate" for programmatic navigation. Without these options, users may get stuck on incomplete flows.`);
}

//#endregion
exports.INTERNAL_SESSION_TASK_ROUTE_BY_KEY = INTERNAL_SESSION_TASK_ROUTE_BY_KEY;
exports.buildTaskUrl = buildTaskUrl;
exports.getTaskEndpoint = getTaskEndpoint;
exports.navigateIfTaskExists = navigateIfTaskExists;
exports.warnMissingPendingTaskHandlers = warnMissingPendingTaskHandlers;
//# sourceMappingURL=sessionTasks.js.map