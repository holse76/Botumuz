
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
const fs = require('fs'); // Dosya işlemleri için eklendi

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
const ekonomi = new Map(); // { userId: { cash: 0, bank: 0 } }
const cooldowns = new Map(); // Cooldown kontrolü için

// Yardımcı Fonksiyonlar (Ekonomi verisi çekme/güncelleme)
function bakiyeGetir(userId) {
    if (!ekonomi.has(userId)) {
        ekonomi.set(userId, { cash: 100, bank: 0 }); // Başlangıç parası
    }
    return ekonomi.get(userId);
}

// ==========================================
// ⏰ SAATLİK OTOMATİK ANTRENMAN SAYAÇI (60 DK)
// ==========================================
client.once('ready', async () => {
    console.log(`${client.user.tag} aktif!`);
    
    // Her 60 dakikada bir kayıtlı herkesin antrenman ilerlemesini otomatik 1 arttırır
    setInterval(() => {
        const dosyaYolu = './antrenmanlar.json';
        if (!fs.existsSync(dosyaYolu)) return;

        try {
            let tumAntrenmanlar = JSON.parse(fs.readFileSync(dosyaYolu, 'utf8'));
            for (let oyuncuId in tumAntrenmanlar) {
                tumAntrenmanlar[oyuncuId].ilerleme += 1;
                if (tumAntrenmanlar[oyuncuId].ilerleme >= 10) {
                    tumAntrenmanlar[oyuncuId].seviye += 1;
                    tumAntrenmanlar[oyuncuId].ilerleme = 0;
                }
            }
            fs.writeFileSync(dosyaYolu, JSON.stringify(tumAntrenmanlar, null, 4));
            console.log("⏰ [SAYAÇ] 60 dakika doldu, antrenmanlar otomatik +1 arttı!");
        } catch (err) { console.error("Saatlik sayaç hatası:", err); }
    }, 3600000);

    // Slash komutunu (bilet sistemi için) Discord'a kaydediyoruz
    const guildId = client.guilds.cache.first()?.id; 
    if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        await guild.commands.set([
            {
                name: 'ticket-kurulum',
                description: 'Butonlu ticket sistemini kurar.',
            }
        ]).catch(() => {});
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- .yardim veya -yardim Komutu ---
    if (message.content.trim() === '.yardim' || message.content.trim() === '-yardim' || message.content.trim() === '-yardım' || message.content.trim() === '.yardım') {
        const embed = new EmbedBuilder()
            .setTitle('📚 BOT SİSTEM REHBERİ')
            .setDescription(`Merhaba **${message.author.username}**, sunucudaki aktif komutlar aşağıda listelenmiştir:`)
            .addFields(
                { name: '🏋️‍♂️ Antrenman & Kadro', value: '`.ant` (İdman yapar) | `.ekle @kisi MEVKI` (Kadroya ekler)', inline: false },
                { name: '⚽ Futbol / Eğlence', value: '`.pen` (Penaltı atışı kullanırsınız)', inline: false },
                { name: '💰 Ekonomi Komutları', value: '`.bal` (Bakiyeni gösterir) | `.send @kisi miktar` (Para gönderir)', inline: false },
                { name: '⚙️ Yetkili Komutları', value: '`.paraekle @kisi miktar` | `.paracikar @kisi miktar` | `/ticket-kurulum`', inline: false }
            )
            .setColor('#3498db');
        return message.reply({ embeds: [embed] });
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- .ant / .antrenman Komutu (Hatasız & JSON Bağlantılı) ---
    if (command === 'ant' || command === 'antrenman') {
        const simdi = Date.now();
        const cd = cooldowns.get(`${userId}-ant`) || 0;
        
        if (simdi < cd) {
            const kalan = Math.ceil((cd - simdi) / 1000 / 60);
            return message.reply(`Bu komutu tekrar kullanmak için **${kalan} dakika** beklemelisin.`);
        }

        const dosyaYolu = './antrenmanlar.json';
        let tumAntrenmanlar = {};

        if (fs.existsSync(dosyaYolu)) {
            try { tumAntrenmanlar = JSON.parse(fs.readFileSync(dosyaYolu, 'utf8')); } catch (e) { tumAntrenmanlar = {}; }
        }

        if (!tumAntrenmanlar[userId]) tumAntrenmanlar[userId] = { seviye: 1, ilerleme: 0 };

        // İlerlemeyi kesin olarak güvenli şekilde +1 yapıyoruz (Asla geriye gitmez)
        tumAntrenmanlar[userId].ilerleme += 1;
        let seviyeAtladiMi = false;

        if (tumAntrenmanlar[userId].ilerleme >= 10) {
            tumAntrenmanlar[userId].seviye += 1;
            tumAntrenmanlar[userId].ilerleme = 0;
            seviyeAtladiMi = true;
        }

        fs.writeFileSync(dosyaYolu, JSON.stringify(tumAntrenmanlar, null, 4));

        if (seviyeAtladiMi) {
            message.reply(`🏋️ **TEBRİKLER!** Antrenmanı tamamladın ve **Seviye ${tumAntrenmanlar[userId].seviye}** oldun!`);
        } else {
            message.reply(`🏋️ **Antrenman Yapıldı!** Mevcut Gelişim Durumu: **[ ${tumAntrenmanlar[userId].ilerleme} / 10 ]** (Mevcut Seviye: ${tumAntrenmanlar[userId].seviye})`);
        }

        // 1 saat cooldown
        cooldowns.set(`${userId}-ant`, simdi + (60 * 60 * 1000));
    }

    // --- .ekle Komutu (Kadroya Oyuncu Ekleme) ---
    if (command === 'ekle') {
        const hedef = message.mentions.members.first();
        const mevki = args[1];
        if (!hedef || !mevki) return message.reply('Kullanım: `.ekle @kullanici Mevki` (Örn: `.ekle @kisi SNT`)');

        const dosyaYolu = './kadro.json';
        let kadro = {};
        if (fs.existsSync(dosyaYolu)) {
            try { kadro = JSON.parse(fs.readFileSync(dosyaYolu, 'utf8')); } catch (e) { kadro = {}; }
        }

        kadro[hedef.id] = { isim: hedef.user.username, mevki: mevki.toUpperCase() };
        fs.writeFileSync(dosyaYolu, JSON.stringify(kadro, null, 4));

        return message.reply(`✅ **${hedef.user.username}** [${mevki.toUpperCase()}] kadroya başarıyla eklendi!`);
    }

    // --- .pen Komutu (Her saat 1 kez) ---
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

// --- TICKET SİSTEMİ (Interaction Yönetimi) ---
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
        if (!customId.startsWith('ticket_')) return;

        if (customId === 'ticket_kapat') {
            await interaction.reply({ content: 'Bu kanal 5 saniye içinde siliniyor...' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (err) {}
            }, 5000);
            return;
        }

        let ticketTuru = "";
        if (customId === 'ticket_sikayet') ticketTuru = "Şikayet";
        if (customId === 'ticket_reklam') ticketTuru = "Reklam";
        if (customId === 'ticket_cekilis') ticketTuru = "Çekiliş";

        await interaction.reply({ content: 'Biletiniz oluşturuluyor, lütfen bekleyin...', ephemeral: true });

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
    
