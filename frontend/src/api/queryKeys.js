/**
 * 查询键工厂。
 *
 * 全部按用户 id 隔离：切换账户后旧缓存不会命中新用户，登出时整体清空。
 * 同一个键只能对应一种 DTO——邮件配置区分 full（含全部字段）与 simple
 * （选择器用的精简字段）。
 */
export const keys = {
  tasks: (uid) => ['tasks', uid],
  logs: (uid) => ['logs', uid],
  latestLogs: (uid, limit) => ['logs', uid, 'latest', limit],
  taskLogs: (uid, taskId, page, limit) => ['logs', uid, 'task', taskId, page, limit],
  emailConfigs: (uid, kind) => ['emailConfigs', uid, kind],
  publicTasks: (uid) => ['publicTasks', uid],
  subscriptions: (uid) => ['subscriptions', uid],
  subscriptionInfo: (uid) => ['subscriptionInfo', uid],
  users: (uid) => ['users', uid],
  blacklist: (uid) => ['blacklist', uid],
};

export const EMAIL_CONFIG_FULL = 'full';
export const EMAIL_CONFIG_SIMPLE = 'simple';
