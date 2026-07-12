const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType 
} = require('discord.js');
const http = require('http');

// Railway 7/24 Aktiflik Sunucusu
http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '.';
const YETKILI_ROL_ID = '1522277920083677376'; // Belirttiğin yetkili rol ID'si

// Veritabanı simülasyonları
const ekonomi = new Map(); 
const antrenmanDurumu = new Map(); 
const cooldowns = new Map(); 

function bakiyeGetir(userId) {
    if (!ekonomi.has(userId)) {
        ekonomi.set(userId, { cash: 100, bank: 0 }); 
    }
    return ekonomi.get(userId);
}

client.once('ready', async () => {
    console.log(`${client.user.tag} aktif!`);
    
    const guildId = client.guilds.cache.first()?.id; 
    if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        await guild.commands.set([
            {
                name: 'ticket-kurulum',
                description: 'Butonlu ticket sistemini kurar.',
            }
        ]);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- .ara Komutu (Yeni) ---
    // Kullanım: .ara [mevki] [bayrak]
    if (command === 'ara') {
        const mevki = args[0];
        const bayrak = args[1];

        if (!mevki || !bayrak) {
            return message.reply('❌ Eksik kullanım! Doğru format: `.ara [mevki] [bayrak]`\nÖrnek: `.ara ST 🇹🇷`');
        }

        const embed = new EmbedBuilder()
            .setTitle('🏃‍♂️ Oyuncu Arama Sonucu')
            .setDescription(`**Mevki:** ${mevki.toUpperCase()}\n**Ülke/Bayrak:** ${bayrak}\n\n🔍 Kriterlerinize uygun oyuncu afişi aşağıda oluşturuldu!`)
            .addFields({ name: '👤 Bulunan Oyuncu', value: '**M. Neuer**' })
            .setImage('https://i.ibb.co/VMRgkhF/manuel-neuer-afis.png') // Temsili kaliteli bir Neuer afiş linki
            .setColor('#0099ff')
            .setFooter({ text: `${message.author.username} tarafından arandı.`, iconURL: message.author.displayAvatarURL() });

        return message.reply({ embeds: [embed] });
    }

    // --- .ant Komutu ---
    if (command === 'ant') {
        const simdi = Date.now();
        const cd = cooldowns.get(`${userId}-ant`) || 0;
        
        if (simdi < cd) {
            const kalan = Math.ceil((cd - simdi) / 1000 / 60);
            return message.reply(`Bu komutu tekrar kullanmak için **${kalan} dakika** beklemelisin.`);
        }

        let mevcutSkor = antrenmanDurumu.get(userId) || 0;
        mevcutSkor += 1;

        if (mevcutSkor >= 10) {
            antrenmanDurumu.set(userId, 0);
            message.reply("🏋️ **Antrenman Tamamlandı!** Skorun **10/10** oldu ve antrenmanın sıfırlandı!");
        } else {
            antrenmanDurumu.set(userId, mevcutSkor);
            message.reply(`🏋️ **Antrenman Yapıldı!** Mevcut Gelişim: **${mevcutSkor}/10**`);
        }

        cooldowns.set(`${userId}-ant`, simdi + (60 * 60 * 1000));
    }

    // --- .pen Komutu ---
    if (command === 'pen') {
        const simdi = Date.now();
        const cd = cooldowns.get(`${userId}-pen`) || 0;
        
        if (simdi < cd) {
            const kalan = Math.ceil((cd - simdi) / 1000 / 60);
            return message.reply(`Bu komutu tekrar kullanmak için **${kalan} dakika** beklemelisin.`);
        }

        const sonuclar = [
            "🧤 **Kurtarış!** Kaleci muhteşem uzandı ve topu çıkardı!",
            "🛡️ **Defans!** Barajdan veya araya giren savunmadan döndü!",
            "⚽ **GOOOL!** Top tam doksana gitti, harika gol!",
            "📐 **Direkt!** Top çat diye direkten geri döndü!",
            "🏃‍♂️ **Dışarı!** Top az farkla auta çıktı!"
        ];
        
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('⚽ Penaltı Kullanıldı!')
            .setDescription(`**Pozisyon gerçekleşti...**\n\n${rastgeleSonuc}`)
            .setColor('#00ff00')
            .setImage('https://media.giphy.com/media/uFsS603957L87eFp7M/giphy.gif');

        message.reply({ embeds: [embed] });
        cooldowns.set(`${userId}-pen`, simdi + (60 * 60 * 1000));
    }

    // --- .bal Komutu ---
    if (command === 'bal') {
        const userPara = bakiyeGetir(userId);
        const embed = new EmbedBuilder()
            .setTitle(`💰 ${message.author.username} Bakiye Durumu`)
            .addFields(
                { name: '💵 Cash (Nakit)', value: `${userPara.cash} 🪙`, inline: true },
                { name: '🏦 Banka', value: `${userPara.bank} 🪙`, inline: true }
            )
            .setColor('#00ff88');
        message.reply({ embeds: [embed] });
    }

    // --- .paraekle Komutu ---
    if (command === 'paraekle') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply('Bu komutu kullanmak için gerekli yetkili rolüne sahip değilsiniz.');
        }

        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);

        if (!hedef || isNaN(miktar) || miktar <= 0) {
            return message.reply('Kullanım: `.paraekle @kullanici [miktar]`');
        }

        const hedefPara = bakiyeGetir(hedef.id);
        hedefPara.cash += miktar;

        message.reply(`✅ ${hedef} kullanıcısının Cash hesabına **${miktar}** eklendi!`);
    }

    // --- .paracikar Komutu ---
    if (command === 'paracikar') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
            return message.reply('Bu komutu kullanmak için gerekli yetkili rolüne sahip değilsiniz.');
        }

        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);

        if (!hedef || isNaN(miktar) || miktar <= 0) {
            return message.reply('Kullanım: `.paracikar @kullanici [miktar]`');
        }

        const hedefPara = bakiyeGetir(hedef.id);
        hedefPara.cash = Math.max(0, hedefPara.cash - miktar);

        message.reply(`📉 ${hedef} kullanıcısının Cash hesabından **${miktar}** çıkarıldı!`);
    }

    // --- .send Komutu ---
    if (command === 'send') {
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);

        if (!hedef || isNaN(miktar) || miktar <= 0) {
            return message.reply('Kullanım: `.send @kullanici [miktar]`');
        }

        if (hedef.id === userId) return message.reply('Kendine para gönderemezsin.');

        const gonderenPara = bakiyeGetir(userId);
        const alanPara = bakiyeGetir(hedef.id);

        if (gonderenPara.cash < miktar) {
            return message.reply('Nakit hesabında (Cash) yeterli para yok!');
        }

        gonderenPara.cash -= miktar;
        alanPara.cash += miktar;

        message.reply(`💸 ${message.author}, ${hedef} kullanıcısına başarıyla **${miktar}** gönderdi!`);
    }
});

// --- TICKET INTERACTION BÖLÜMÜ ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket-kurulum') {
            if (!interaction.member.roles.cache.has(YETKILI_ROL_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: 'Bu kurulumu sadece yetkililer yapabilir.', ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_sikayet').setLabel('📩 Şikayet').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_reklam').setLabel('📢 Reklam / Sponsor').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_cekilis').setLabel('🎉 Çekiliş Talebi').setStyle(ButtonStyle.Success)
            );

            const embed = new EmbedBuilder()
                .setTitle('🎫 Destek & Bilet Sistemi')
                .setDescription('Destek talebi oluşturmak için aşağıdaki butonlardan durumunuza uygun olana tıklayın.')
                .setColor('#2f3136');

            await interaction.reply({ content: 'Ticket sistemi başarıyla kuruldu!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;
        if (customId === 'ticket_kapat') {
            await interaction.reply({ content: 'Bu bilet 5 saniye içinde siliniyor...' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch(e){}
            }, 5000);
            return;
        }

        if (!customId.startsWith('ticket_')) return;

        let ticketTuru = "";
        if (customId === 'ticket_sikayet') ticketTuru = "Şikayet";
        if (customId === 'ticket_reklam') ticketTuru = "Reklam";
        if (customId === 'ticket_cekilis') ticketTuru = "Çekiliş";

        await interaction.reply({ content: 'Biletiniz oluşturuluyor...', ephemeral: true });

        const kanal = await interaction.guild.channels.create({
            name: `ticket-${ticketTuru.toLowerCase()}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                { id: YETKILI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 Yeni Destek Talebi: ${ticketTuru}`)
            .setDescription(`Hoş geldin ${interaction.user}! Yetkililerimiz <@&${YETKILI_ROL_ID}> en kısa sürede seninle ilgilenecektir.\n\nKanalı kapatmak için aşağıdaki butona basabilirsiniz.`)
            .setColor('#00aaff');

        const kapatRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_kapat').setLabel('🔒 Kanalı Kapat').setStyle(ButtonStyle.Secondary)
        );

        await kanal.send({ content: `${interaction.user} & <@&${YETKILI_ROL_ID}>`, embeds: [ticketEmbed], components: [kapatRow] });
        await interaction.editReply({ content: `Biletiniz başarıyla açıldı: ${kanal}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
