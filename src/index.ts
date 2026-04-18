import {
  ActivityType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  PermissionFlagsBits
} from "discord.js";
import { config } from "./config";
import { readRules, writeRules } from "./storage";
import { RegexRule, RuleTarget } from "./types";
import { assertValidRegex, generateId, normalizeFlags } from "./utils";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  presence: {
    status: "online",
    activities: [
      {
        name: "la surveillance anti-bots",
        type: ActivityType.Watching
      }
    ]
  }
});

async function tryBanMember(member: GuildMember): Promise<void> {
  const match = findMatchingRule(member);
  if (!match) return;

  const reason = `Auto-ban regex rule=${match.rule.id} target=${match.rule.target} value="${match.testedValue}" pattern=/${match.rule.pattern}/${match.rule.flags}`;

  try {
    await member.ban({
      deleteMessageSeconds: 0,
      reason
    });

    console.log(
      `[BAN] ${member.user.tag} (${member.id}) | rule=${match.rule.id} | ${match.rule.target}="${match.testedValue}"`
    );
  } catch (err) {
    console.error(
      `Impossible de bannir ${member.user.tag} (${member.id}) avec la règle ${match.rule.id}`,
      err
    );
  }
}

function findMatchingRule(member: GuildMember): {
  rule: RegexRule;
  testedValue: string;
} | null {
  const rules = readRules().filter((r) => r.enabled);

  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, rule.flags);
      const value = getTargetValue(member, rule.target);

      if (value && regex.test(value)) {
        return { rule, testedValue: value };
      }
    } catch (err) {
      console.error(`Règle invalide ignorée (${rule.id})`, err);
    }
  }

  return null;
}

function getTargetValue(member: GuildMember, target: RuleTarget): string {
  switch (target) {
    case "username":
      return member.user.username ?? "";
    case "globalName":
      return member.user.globalName ?? "";
    case "displayName":
      return member.displayName ?? "";
    default:
      return "";
  }
}

function setMonitoringPresence(): void {
  client.user?.setPresence({
    status: "online",
    activities: [
      {
        name: "la surveillance anti-bots",
        type: ActivityType.Watching
      }
    ]
  });
}

function setCheckingPresence(): void {
  client.user?.setPresence({
    status: "idle",
    activities: [
      {
        name: "l'analyse d'un nouveau membre",
        type: ActivityType.Watching
      }
    ]
  });
}

client.on(Events.GuildMemberAdd, async (member) => {
  setCheckingPresence();

  try {
    await tryBanMember(member);
  } finally {
    setMonitoringPresence();
  }
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Connecté en tant que ${readyClient.user.tag}`);
  setMonitoringPresence();
});

client.login(config.token).catch((err) => {
  console.error("Erreur de connexion du bot:", err);
  process.exit(1);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "regex-add":
        await handleAdd(interaction);
        break;
      case "regex-remove":
        await handleRemove(interaction);
        break;
      case "regex-toggle":
        await handleToggle(interaction);
        break;
      case "regex-list":
        await handleList(interaction);
        break;
    }
  } catch (err) {
    console.error("Erreur lors du traitement d'une commande:", err);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Une erreur est survenue.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "Une erreur est survenue.",
        ephemeral: true
      });
    }
  }
});

function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "Tu dois être administrateur pour utiliser cette commande.",
      ephemeral: true
    });
    return;
  }

  const pattern = interaction.options.getString("pattern", true);
  const target = interaction.options.getString("target", true) as RuleTarget;
  const rawFlags = interaction.options.getString("flags") ?? "";
  const flags = normalizeFlags(rawFlags);

  try {
    assertValidRegex(pattern, flags);
  } catch {
    await interaction.reply({
      content: `Regex invalide : \`/${pattern}/${flags}\``,
      ephemeral: true
    });
    return;
  }

  const rules = readRules();
  const newRule: RegexRule = {
    id: generateId(),
    pattern,
    flags,
    target,
    enabled: true,
    createdAt: new Date().toISOString(),
    createdBy: interaction.user.id
  };

  rules.push(newRule);
  writeRules(rules);

  await interaction.reply({
    content:
      `Règle ajoutée.\n` +
      `ID: \`${newRule.id}\`\n` +
      `Cible: \`${newRule.target}\`\n` +
      `Regex: \`/${newRule.pattern}/${newRule.flags}\``,
    ephemeral: true
  });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "Tu dois être administrateur pour utiliser cette commande.",
      ephemeral: true
    });
    return;
  }

  const id = interaction.options.getString("id", true);
  const rules = readRules();
  const index = rules.findIndex((r) => r.id === id);

  if (index === -1) {
    await interaction.reply({
      content: `Aucune règle trouvée avec l'ID \`${id}\`.`,
      ephemeral: true
    });
    return;
  }

  const removed = rules.splice(index, 1)[0];
  writeRules(rules);

  await interaction.reply({
    content: `Règle supprimée : \`${removed.id}\``,
    ephemeral: true
  });
}

async function handleToggle(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "Tu dois être administrateur pour utiliser cette commande.",
      ephemeral: true
    });
    return;
  }

  const id = interaction.options.getString("id", true);
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);

  if (!rule) {
    await interaction.reply({
      content: `Aucune règle trouvée avec l'ID \`${id}\`.`,
      ephemeral: true
    });
    return;
  }

  rule.enabled = !rule.enabled;
  writeRules(rules);

  await interaction.reply({
    content: `Règle \`${rule.id}\` ${rule.enabled ? "activée" : "désactivée"}.`,
    ephemeral: true
  });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "Tu dois être administrateur pour utiliser cette commande.",
      ephemeral: true
    });
    return;
  }

  const rules = readRules();

  if (rules.length === 0) {
    await interaction.reply({
      content: "Aucune règle configurée.",
      ephemeral: true
    });
    return;
  }

  const lines = rules.map(
    (r) =>
      `- ID: \`${r.id}\` | target=\`${r.target}\` | regex=\`/${r.pattern}/${r.flags}\` | enabled=\`${r.enabled}\``
  );

  await interaction.reply({
    content: lines.join("\n").slice(0, 1900),
    ephemeral: true
  });
}