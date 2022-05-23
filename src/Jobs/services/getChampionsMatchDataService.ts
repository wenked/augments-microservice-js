import { PrismaClient } from "@prisma/client";
import axios from "axios";
import chillout from "chillout";
import log from "../../logger";
import champions from "../../static/champions.json";
import { sleep } from "../../utils";

export default async function getChampionsMatchDataService() {
	try {
		let requestCount = 0;
		log.info(`Buscando dados dos champions`);
		const prisma = new PrismaClient();

		const championsExists = await prisma.champion.findMany();

		if (championsExists.length === 0) {
			log.info(`Criando dados dos champions`);

			await chillout.forEach(champions, async (champion, key: number) => {
				log.info(`Criando dados do champion ${champion.name}, ${key + 1}/${champions.length}`);
				await prisma.champion.create({
					data: {
						cost: champion.cost,
						name: champion.name,
						set: "6.5",
						trait_1: champion.classes[0],
						trait_2: champion.origins[0] || null,
						trait_3: champion.origins[1] || null,
					},
				});
			});
		}

		const formatedChampions = championsExists.map((champion) => {
			return {
				id: champion.id,
				name: champion.name.replace(/\s/g, ""),
			};
		});

		const matches = await prisma.matches.findMany();

		await chillout.forEach(matches, async (match: any, key: number) => {
			log.info(`Buscando dados de ${key + 1}/${matches.length} partidas...`);

			const { data: matchData } = await axios.get(
				`https://americas.api.riotgames.com/tft/match/v1/matches/${match.matchid}?api_key=${process.env.RIOT_API_KEY}`
			);
			requestCount++;

			if (requestCount === 99) {
				log.info(`Request count ${requestCount},Aguardando 1 minuto`);
				await sleep(60000);
				requestCount = 0;
			}

			await chillout.forEach(matchData.info.participants, async (participant: any, key: number) => {
				const units = participant.units;
				console.log(units);
				await chillout.forEach(units, async (unit: any, key: number) => {
					const champion = formatedChampions.find((champion) => {
						return champion.name === unit.character_id.replace(/TFT6_/g, "");
					});

					/* 	if (champion) {
						log.info(`Inserindo api_name do champion ${champion.name}`);
						await prisma.champion.update({
							data: {
								api_name: unit.character_id,
							},
							where: { id: champion.id },
						});
					} */

					const championMatchDataExists = await prisma.champions_match_data.findFirst({
						where: {
							api_name: unit.character_id,
							matchid: match.matchid,
							placement: participant.placement,
						},
					});

					if (championMatchDataExists) {
						log.info(`Dados da partida do champion ${unit.character_id} já existem`);
						return;
					}

					log.info(`Inserindo dados da partida do champion ${unit.character_id}`);
					await prisma.champions_match_data.create({
						data: {
							api_name: unit.character_id,
							champion: championsExists.find((champion) => champion.api_name === unit.character_id)
								?.name,
							game_version: matchData.info.game_version,
							matchid: match.matchid,
							placement: participant.placement,
						},
					});
				});
			});
		});

		log.info(`Dados dos champions inseridos com sucesso`);
	} catch (error) {
		log.error(`Erro ao buscar dados de campeões da partida: ${error}`);
	}
}