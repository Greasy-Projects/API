import fs from "fs";
const file = process.argv[2];

if (!file) {
	const files = fs.readdirSync("src/db/util/");

	// Log each file
	console.log("available scripts:");

	files.forEach(file => {
		if (file !== "run.ts" && file.endsWith(".ts"))
			console.log(file.substring(0, file.length - 3));
	});
	process.exit();
}
import(`src/db/util/${file}.ts`).then(script => script.default());
