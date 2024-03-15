export enum Scope {
	EditContent = "content:edit",
}
export const ScopeGroup: { [key: string]: Scope[] } = {
	default: [],
	editor: [Scope.EditContent],
	developer: Object.values(Scope), //the developer group has ALL permissions
};
