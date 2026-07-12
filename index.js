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
const YETKILI_ROL_ID = '1522277920083677376'; 
const KANAL_ADI = 'gelen-giden';

const mevkiler = ["SNT", "GK", "KL", "OSS", "OS", "SGK", "SLK", "SĞK", "DEF", "STP", "SLB", "SGB", "SĞB"];
const bayraklar = ["🇹🇷", "🇩🇪", "🇧🇷", "🇦🇷", "🇫🇷", "🇮🇹", "🇪🇸", "🇳🇱", "🇵🇹", "🇬🇧"];

// Sunucudaki oyuncuların veritabanı deposu
const oyuncuKartlari = new Map(); 
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
        await guild.commands.set([{ name: 'ticket-kurulum', description: 'Butonlu bilet sistemi kurar.' }]);
    }
});

// ==========================================
// 🔄 OTOMATİK GİREN OYUNCU LOGU
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.find(c => c.name === KANAL_ADI);
    if (!kanal) return;

    const atananMevki = mevkiler[Math.floor(Math.random() * mevkiler.length)];
    const atananBayrak = bayraklar[Math.floor(Math.random() * bayraklar.length)];
    
    // Oyuncuyu hafızaya kaydediyoruz
    oyuncuKartlari.set(member.id, { username: member.user.username, mevki: atananMevki, bayrak: atananBayrak });

    const embed = new EmbedBuilder()
        .setTitle('✨ KULÜBE YENİ OYUNCU KATILDI ✨')
        .setDescription(`Sunucumuza yeni bir transfer gerçekleşti! Hoş geldin **${member.user.username}**!`)
        .addFields(
            { name: '📋 Oyuncu Adı', value: `\`\`\`${member.user.username}\`\`\``, inline: false },
            { name: '🛡️ Atanan Mevki', value: `\`\`\`${atananMevki}\`\`\``, inline: true },
            { name: '🌍 Ülke / Bayrak', value: `\`\`\`${atananBayrak}\`\`\``, inline: true }
        )
        .setImage('https://i.ibb.co/VMRgkhF/manuel-neuer-afis.png') 
        .setColor('#10f091')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Güncel Kadro: ${member.guild.memberCount} Kişi` });

    kanal.send({ embeds: [embed], allowedMentions: { users: [] } });
});

// ==========================================
// 🔄 OTOMATİK ÇIKAN OYUNCU LOGU
// ==========================================
client.on('guildMemberRemove', async (member) => {
    const kanal = member.guild.channels.cache.find(c => c.name === KANAL_ADI);
    if (!kanal) return;

    oyuncuKartlari.delete(member.id);

    const embed = new EmbedBuilder()
        .setTitle('❌ SÖZLEŞME FESHİ / AYRILIK ❌')
        .setDescription(`**${member.user.username}** kulüpten ve sunucudan ayrıldı.`)
        .addFields(
            { name: '📋 Ayrılan Oyuncu', value: `\`\`\`${member.user.username}\`\`\``, inline: false }
        )
        .setColor('#ff3333')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Kalan Kadro: ${member.guild.memberCount} Kişi` });

    kanal.send({ embeds: [embed], allowedMentions: { users: [] } });
});

// ==========================================
// 💬 MESAJ KOMUTLARI
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- 🔍 Gelişmiş .ara Komutu ---
    if (command === 'ara') {
        const arananMevki = args[0]?.toUpperCase();

        if (!arananMevki) {
            return message.reply({ content: '❌ **Eksik Kullanım!** Doğru format: `.ara [MEVKİ]` (Örn: `.ara SNT`)', allowedMentions: { repliedUser: false } });
        }

        // Sunucuda bot açıkken o mevkiye atanmış herkesi filtreliyoruz
        const bulunanOyuncular = [];
        oyuncuKartlari.forEach((deger, anahtar) => {
            if (deger.mevki === arananMevki) {
                bulunanOyuncular.push(`• **${deger.username}** ${deger.bayrak}`);
            }
        });

        // Eğer o mevkide kayıtlı kimse yoksa listeyi boş göstermemek için test amaçlı sahte veri/örnek ekleyelim veya boş diyelim
        let listeMesaji = bulunanOyuncular.join('\n');
        if (bulunanOyuncular.length === 0) {
            listeMesaji = `*Bu mevkide kayıtlı oyuncu bulunamadı.*\n*(Örnek Görünüm: Osimhen 🇳🇬, Icardi 🇦🇷)*`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏃‍♂️ MEVKİ ARAMA: ${arananMevki}`)
            .setDescription(`Sunucuda **${arananMevki}** mevkisinde oynayan tüm aktif oyuncular aşağıda listelenmiştir:\n\n${listeMesaji}`)
            .setColor('#00bfff')
            .setImage('https://i.ibb.co/VMRgkhF/manuel-neuer-afis.png') // Kaliteli alt afiş görseli
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `${message.author.username} tarafından sorgulandı.`, iconURL: message.author.displayAvatarURL() });

        // allowedMentions: { repliedUser: false } -> Kimseyi etiketleyip rahatsız etmez, tertemiz isim yazar!
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // --- l.yardim Komutu ---
    if (command === 'yardim' || command === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('📚 BOT KOMUT REHBERİ')
            .setDescription('Tüm komutlar listelenmiştir. Rahat okumanız için kategorilere ayrılmıştır:')
            .addFields(
                { name: '⚽ Futbol Sistemleri', value: `\`\`\`.ara [mevki]\`\`\` -> O mevkideki tüm oyuncuları listeler.\n\`\`\`.ant\`\`\` -> Antrenman seviyenizi artırır.\n\`\`\`.pen\`\`\` -> Şansınıza penaltı atışı yaparsınız.`, inline: false },
                { name: '💰 Ekonomi Menüsü', value: `\`\`\`.bal\`\`\` -> Nakit ve Banka paranızı gösterir.\n\`\`\`.send @kullanici [miktar]\`\`\` -> Para transfer eder.`, inline: false },
                { name: '🛡️ Yetkili Alanı', value: `\`\`\`.paraekle @kullanici [miktar]\`\`\` -> Para ekler.\n\`\`\`.paracikar @kullanici [miktar]\`\`\` -> Para siler.\n\`\`\`/ticket-kurulum\`\`\` -> Destek butonlarını oluşturur.`, inline: false }
            )
            .setColor('#5865F2');

        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // --- .ant, .pen, .bal, .paraekle vb. (Stabil Komutlar) ---
    if (command === 'ant') {
        const simdi = Date.now();
        const cd = cooldowns.get(`${userId}-ant`) || 0;
        if (simdi < cd) return message.reply({ content: `⏱️ Lütfen bekleyin.`, allowedMentions: { repliedUser: false } });
        let mevcutSkor = antrenmanDurumu.get(userId) || 0;
        mevcutSkor += 1;
        if (mevcutSkor >= 10) {
            antrenmanDurumu.set(userId, 0);
            message.reply({ content: "🏋️ **Antrenman 10/10 oldu ve sıfırlandı!**", allowedMentions: { repliedUser: false } });
        } else {
            antrenmanDurumu.set(userId, mevcutSkor);
            message.reply({ content: `🏋️ Gelişim: **${mevcutSkor}/10**`, allowedMentions: { repliedUser: false } });
        }
        cooldowns.set(`${userId}-ant`, simdi + (60 * 60 * 1000));
    }

    if (command === 'pen') {
        const simdi = Date.now();
        const cd = cooldowns.get(`${userId}-pen`) || 0;
        if (simdi < cd) return message.reply({ content: `⏱️ Lütfen bekleyin.`, allowedMentions: { repliedUser: false } });
        const sonuclar = ["🧤 **Kurtarış!**", "🛡️ **Defans!**", "⚽ **GOOOL!**", "📐 **Direkt!**", "🏃‍♂️ **Dışarı!**"];
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        const embed = new EmbedBuilder().setTitle('⚽ Penaltı!').setDescription(rastgeleSonuc).setColor('#eeff00').setImage('https://media.giphy.com/media/uFsS603957L87eFp7M/giphy.gif');
        message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        cooldowns.set(`${userId}-pen`, simdi + (60 * 60 * 1000));
    }

    if (command === 'bal') {
        const userPara = bakiyeGetir(userId);
        const embed = new EmbedBuilder()
            .setTitle(`💰 Bakiye Durumu`)
            .addFields({ name: '💵 Cash', value: `\`\`\`${userPara.cash} 🪙\`\`\``, inline: true }, { name: '🏦 Banka', value: `\`\`\`${userPara.bank} 🪙\`\`\``, inline: true })
            .setColor('#00ff88');
        message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (command === 'paraekle') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);
        if (!hedef || isNaN(miktar)) return;
        bakiyeGetir(hedef.id).cash += miktar;
        message.reply({ content: `✅ Eklendi.`, allowedMentions: { users: [] } });
    }

    if (command === 'paracikar') {
        if (!message.member.roles.cache.has(YETKILI_ROL_ID)) return;
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);
        if (!hedef || isNaN(miktar)) return;
        const p = bakiyeGetir(hedef.id);
        p.cash = Math.max(0, p.cash - miktar);
        message.reply({ content: `📉 Çıkarıldı.`, allowedMentions: { users: [] } });
    }

    if (command === 'send') {
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);
        if (!hedef || isNaN(miktar) || hedef.id === userId) return;
        const g = bakiyeGetir(userId);
        if (g.cash < miktar) return;
        g.cash -= miktar;
        bakiyeGetir(hedef.id).cash += miktar;
        message.reply({ content: `💸 Gönderildi.`, allowedMentions: { users: [] } });
    }
});

// --- TICKET SİSTEMİ INTERACTION (Stabil) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticket-kurulum') {
        if (!interaction.member.roles.cache.has(YETKILI_ROL_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_sikayet').setLabel('📩 Şikayet').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ticket_reklam').setLabel('📢 Reklam').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_cekilis').setLabel('🎉 Çekiliş').setStyle(ButtonStyle.Success)
        );
        const embed = new EmbedBuilder().setTitle('🎫 Destek Sistemi').setDescription('Bilet açmak için butonları kullanın.').setColor('#2f3136');
        await interaction.reply({ content: 'Kuruldu.', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'ticket_kapat') {
            await interaction.reply({ content: 'Siliniyor...' });
            setTimeout(async () => { try { await interaction.channel.delete(); } catch(e){} }, 5000);
            return;
        }
        if (!interaction.customId.startsWith('ticket_')) return;
        await interaction.reply({ content: 'Açılıyor...', ephemeral: true });
        const kanal = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: YETKILI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });
        const embed = new EmbedBuilder().setTitle('🎫 Destek').setDescription('Yetkililer sizinle ilgilenecektir.').setColor('#00aaff');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_kapat').setLabel('🔒 Kapat').setStyle(ButtonStyle.Secondary));
        await kanal.send({ embeds: [embed], components: [row] });
    }
});

client.login(process.env.TOKEN);
            
