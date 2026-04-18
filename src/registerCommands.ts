import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("regex-add")
    .setDescription("Ajoute une règle regex de ban automatique")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("pattern")
        .setDescription("Expression régulière sans les / /")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("flags")
        .setDescription("Flags regex, ex: i")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("target")
        .setDescription("Champ du compte à vérifier")
        .setRequired(true)
        .addChoices(
          { name: "username", value: "username" },
          { name: "globalName", value: "globalName" },
          { name: "displayName", value: "displayName" }
        )
    ),

  new SlashCommandBuilder()
    .setName("regex-remove")
    .setDescription("Supprime une règle regex")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("Identifiant de la règle")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("regex-toggle")
    .setDescription("Active ou désactive une règle")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("Identifiant de la règle")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("regex-list")
    .setDescription("Liste les règles regex configurées")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map((cmd) => cmd.toJSON());

async function main(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );

  console.log("Commandes slash enregistrées.");
}

main().catch((err) => {
  console.error("Erreur d'enregistrement des commandes:", err);
  process.exit(1);
});