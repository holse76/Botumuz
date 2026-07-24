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

// Belirttiğiniz ID Ayarları
const CONFIG = {
    ticketCategory: "1530167947639787680", // Ticket kanallarının açılacağı kategori ID
    setupLogRole: "1522274570986586172",  // Kurulumu yapabilecek / yetkili rol
    supportRoles: ["1522707337473687633", "1522699609506316338"], // Ticket'a bakacak yetkili roller
    transcriptChannel: "1530168154599198811" // Kapatınca dosyanın gideceği hedef ID
};

client.once('ready', () => {
    console.log(`Bot aktif: ${client.user.tag}`);
});

// /Ticket-kurulum Komutu
client.on('messageCreate', async message => {
    if (message.content === '/Ticket-kurulum') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek & İşlem Merkezi")
            .setDescription("Aşağıdaki butonları kullanarak destek talebi (ticket) oluşturabilirsiniz.")
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

// Buton Etkileşimleri ve Ticket Kanalının Oluşturulması
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('ticket_')) {
        const ticketType = interaction.customId.replace('ticket_', '');
        const guild = interaction.guild;

        // İzin ayarları (Sadece üyeye ve yetkili rollere görünür)
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

        // Ticket kanalını 1530167947639787680 ID'li kategori altında açma
        const channel = await guild.channels.create({
            name: `${ticketType}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ticketCategory,
            permissionOverwrites: permissionOverwrites
        });

        // Yetkili rollerin etiketleneceği mesaj içeriği
        const roleMentions = CONFIG.supportRoles.map(id => `<@&${id}>`).join(' ');

        const controlEmbed = new EmbedBuilder()
            .setTitle(`Destek Talebi: ${ticketType.toUpperCase()}`)
            .setDescription(`Merhaba ${interaction.user}, destek talebiniz başarıyla oluşturuldu.\n\n**İlgilenecek Yetkililer:**\n<@&1522707337473687633>\n<@&1522699609506316338>`)
            .setColor(0x5865F2);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Kapat / Dosya Kaydet').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ 
            content: `${roleMentions} yeni bir ticket açıldı!`, 
            embeds: [controlEmbed], 
            components: [closeRow] 
        });

        await interaction.reply({ content: `Ticket kanalınız oluşturuldu: ${channel}`, ephemeral: true });
    }

    // Ticket Kapatma, Dosyayı Gönderme ve Kanalı Silme
    if (interaction.customId === 'ticket_close') {
        await interaction.reply({ content: "Ticket kapatılıyor, dosya kaydediliyor ve kanal siliniyor...", ephemeral: true });

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');

        const buffer = Buffer.from(transcript, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

        try {
            const targetChannel = await interaction.guild.channels.fetch(CONFIG.transcriptChannel);
            if (targetChannel) {
                await targetChannel.send({
                    content: `📁 **${interaction.channel.name}** adlı ticket kapatıldı. Konuşma dökümanı:`,
                    files: [attachment]
                });
            }
        } catch (err) {
            console.error("Dosya gönderilemedi:", err);
        }

        // Kanalı doğrudan sil (Botun "Kanalı Yönet" yetkisi olduğundan emin olun)
        try {
            await interaction.channel.delete();
        } catch (err) {
            console.error("Kanal silinemedi:", err);
        }
    }
});

client.login(process.env.TOKEN);
            
