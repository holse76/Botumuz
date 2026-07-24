const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ID Tanımlamaları
const CONFIG = {
    ticketCategory: "1530167947639787680", // Ticket kanallarının açılacağı kategori ID
    setupLogRole: "1522274570986586172",  // Kurulumu başlatabilecek veya etiketlenecek rol
    supportRoles: ["1522707337473687633", "1522699609506316338"], // Ticket'a bakacak yetkili roller
    transcriptCategoryOrChannel: "1530168154599198811" // Kapat/Dosya kaydet hedef ID
};

client.once('ready', () => {
    console.log(`Bot aktif: ${client.user.tag}`);
});

// Ticket Kurulum Mesajını Gönderme Komutu (/Ticket-kurulum)
client.on('messageCreate', async message => {
    if (message.content === '/Ticket-kurulum') {
        if (!message.member.roles.cache.has(CONFIG.setupLogRole)) {
            return message.reply("Bu komutu kullanmak için yetkiniz yok.");
        }

        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek & İşlem Merkezi")
            .setDescription("Aşağıdaki butonları kullanarak ilgili kategoride ticket oluşturabilirsiniz.\n\n*İşlemi başlatan yetkili: <@&" + CONFIG.setupLogRole + ">*")
            .setColor(0x00AE86);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_sikayet').setLabel('Şikayet').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ticket_yetkili').setLabel('Yetkili Alım').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_ceklis').setLabel('Çekiliş').setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_event').setLabel('Event').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_partner').setLabel('Partner').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2] });
        await message.delete().catch(() => {});
    }
});

// Buton Etkileşimleri ve Ticket Oluşturma
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('ticket_')) {
        const ticketType = interaction.customId.replace('ticket_', '');
        const guild = interaction.guild;

        // Yetkili rolleri izinleri
        const permissionOverwrites = [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
            }
        ];

        CONFIG.supportRoles.forEach(roleId => {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
            });
        });

        // Kanal Oluşturma
        const channel = await guild.channels.create({
            name: `${ticketType}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ticketCategory,
            permissionOverwrites: permissionOverwrites
        });

        const controlEmbed = new EmbedBuilder()
            .setTitle(`Destek Talebi: ${ticketType.toUpperCase()}`)
            .setDescription(`Merhaba ${interaction.user}, destek talebiniz oluşturuldu.\n\n**İlgilenecek Yetkililer:**\n<@&1522707337473687633>\n<@&1522699609506316338>`)
            .setColor(0x5865F2);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Kapat / Dosya Kaydet').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@&1522707337473687633> <@&1522699609506316338>`, embeds: [controlEmbed], components: [closeRow] });
        await interaction.reply({ content: `Ticket kanalınız açıldı: ${channel}`, ephemeral: true });
    }

    // Ticket Kapatma ve Dosya (Transcript) Kaydetme
    if (interaction.customId === 'ticket_close') {
        await interaction.reply({ content: "Ticket kapatılıyor ve mesajlar dosyaya kaydediliyor...", ephemeral: true });

        // Kanal mesajlarını toplama
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');

        const buffer = Buffer.from(transcript, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

        // Belirtilen ID'ye (1530168154599198811) dosyayı gönderme
        try {
            const targetChannel = await interaction.guild.channels.fetch("1530168154599198811");
            if (targetChannel) {
                await targetChannel.send({
                    content: `📁 **${interaction.channel.name}** adlı ticket kapatıldı. Konuşma dökümanı aşağıdadır:`,
                    files: [attachment]
                });
            }
        } catch (err) {
            console.error("Transcript gönderilemedi:", err);
        }

        // Kanalı sil
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(process.env.TOKEN);
    
    
