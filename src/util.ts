import { intersection } from "lodash";

export const cleanFilePath = (path: string) => path.replace(/^\/|\/$/g, "");

/**
 * Checks if first array contains all items in second array.
 * @example
 * hasAllItems(["a"], ["a", "b", "c"]) //false
 * hasAllItems(["a", "b", "c"], ["a"]) //true
 */
export function hasAllItems<T>(a: Array<T>, b: Array<T>): boolean {
	const is = intersection(a, b);
	return is.length === b.length;
}

export const toSQLDate = (d: Date) =>
	d.toISOString().replace("T", " ").replace("Z", "");
