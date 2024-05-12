import { createId } from "@paralleldrive/cuid2";
export default async function generateId() {
	const num = parseInt(process.argv[3] ?? 1);
	if (isNaN(num)) {
		console.error("Invalid input. Must be a number");
		process.exit();
	}
	for (let i = 0; i < num; i++) {
		console.log(createId());
	}
}
