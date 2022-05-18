import express from "express";
import config from "config";
import log from "./logger";
import Worker from "./worker";

const port = config.get("port") as number;
const host = config.get("host") as string;

process.on("uncaughtException", (error) => {
	log.error("Alert! ERROR : ", error);
	process.exit(1); // Exit your app
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.listen(port, host, async () => {
	try {
		log.info(`Server is running on http://${host}:${port}`);
		Worker();
	} catch (error) {
		log.error(`Error in app.listen: ${error}`);
	}
});
