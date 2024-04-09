export enum Scope {
	EditContent = "content:edit",
	ReadWhitelist = "whitelist:read",
	ManageWhitelist = "whitelist:manage",
}
export const ScopeGroup: { [key: string]: Scope[] } = {
	default: [],
	editor: [Scope.EditContent],
	developer: Object.values(Scope), //the developer group has ALL permissions
};
