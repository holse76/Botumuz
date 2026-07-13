
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
const ekonomi = new Map(); // { userId: { cash: 0, bank: 0 } }
const antrenmanDurumu = new Map(); // { userId: score } (Hatalı boşluk düzeltildi)
const cooldowns = new Map(); // Cooldown kontrolü için

// Yardımcı Fonksiyonlar (Ekonomi verisi çekme/güncelleme)
function bakiyeGetir(userId) {
    if (!ekonomi.has(userId)) {
        ekonomi.set(userId, { cash: 100, bank: 0 }); // Başlangıç parası
    }
    return ekonomi.get(userId);
}

client.once('ready', async () => {
    console.log(`${client.user.tag} aktif!`);
    
    // Slash komutunu (bilet sistemi için) Discord'a kaydediyoruz
    const guildId = client.guilds.cache.first()?.id; // Botun olduğu ilk sunucuya kaydeder
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

    // --- 📚 .yardim / .yardım Komutu ---
    if (command === 'yardim' || command === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('📚 BOT KOMUT REHBERİ')
            .setDescription(`Merhaba **${message.author.username}**, sunucudaki tüm aktif komutlar aşağıda listelenmiştir:`)
            .addFields(
                { 
                    name: '⚽ Futbol & Eğlence', 
                    value: `\`\`\`.ant\`\`\` -> Saatlik antrenman yapar (Gelişim 10/10 olunca sıfırlanır).\n\`\`\`.pen\`\`\` -> Şansınıza bağlı olarak penaltı atışı kullanırsınız.`, 
                    inline: false 
                },
                { 
                    name: '💰 Ekonomi Sistemi', 
                    value: `\`\`\`.bal\`\`\` -> Nakit (Cash) ve Banka bakiye durumunuzu gösterir.\n\`\`\`.send @kullanici [miktar]\`\`\` -> Elinizdeki nakit paradan başka bir oyuncuya transfer edersiniz.`, 
                    inline: false 
                },
                { 
                    name: '🛠️ Yetkili Komutları', 
                    value: `\`\`\`.paraekle @kullanici [miktar]\`\`\` -> Belirtilen kişiye nakit para verir.\n\`\`\`.paracikar @kullanici [miktar]\`\`\` -> Belirtilen kişinin nakit parasını eksiltir.\n\`\`\`/ticket-kurulum\`\`\` -> Eğlence/Destek bilet panelini o kanala kurar.`, 
                    inline: false 
                }
            )
            .setColor('#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        return message.reply({ embeds: [embed] });
    }

                // ==========================================
// 🏋️‍♂️ ANTRENMAN SİSTEMİ (BİRLEŞİK SÜRÜM)
// ==========================================

if (command === 'antrenman' || command === 'idman') {
    const hedefOyuncu = message.mentions.users.first() || message.author;
    const oyuncuId = hedefOyuncu.id;
    const dosyaYolu = './antrenmanlar.json';
    const fsModul = require('fs');
    
           if (simdi < cd) {
            const kalan = Math.ceil((cd - simdi) / 1000 / 60);
            return message.reply(`Bu komutu tekrar kullanmak için **${kalan} dakika** beklemelisin.`);
}
    
    
    let tumAntrenmanlar = {};
    if (fsModul.existsSync(dosyaYolu)) {
        try {
            const dosyaIcerigi = fsModul.readFileSync(dosyaYolu, 'utf8');
            tumAntrenmanlar = dosyaIcerigi ? JSON.parse(dosyaIcerigi) : {};
        } catch (err) { tumAntrenmanlar = {}; }
    }

    if (!tumAntrenmanlar[oyuncuId]) {
        tumAntrenmanlar[oyuncuId] = { seviye: 1, ilerleme: 0 };
    }

    tumAntrenmanlar[oyuncuId].ilerleme += 1;
    const hedefIlerleme = 10;
    let seviyeAtladiMi = false;

    if (tumAntrenmanlar[oyuncuId].ilerleme >= hedefIlerleme) {
        tumAntrenmanlar[oyuncuId].seviye += 1;
        tumAntrenmanlar[oyuncuId].ilerleme = 0;
        seviyeAtladiMi = true;
    }

    try {
        fsModul.writeFileSync(dosyaYolu, JSON.stringify(tumAntrenmanlar, null, 4));
    } catch (writeErr) { console.error(writeErr); }

    if (seviyeAtladiMi) {
        const seviyeEmbed = new EmbedBuilder()
            .setTitle('⚡ SEVİYE ATLADI!')
            .setDescription(`🎉 ${hedefOyuncu} antrenmanı tamamlayarak **Seviye ${tumAntrenmanlar[oyuncuId].seviye}** oldu!`)
            .setColor('#2ecc71');
        return message.reply({ embeds: [seviyeEmbed] }).catch(console.error);
    } else {
        const antrenmanEmbed = new EmbedBuilder()
            .setTitle('💪 ANTRENMAN BAŞARILI')
            .setDescription(`🏃‍♂️ ${hedefOyuncu} çalışmaya devam ediyor.\n\n📊 **Mevcut Seviye:** \`${tumAntrenmanlar[oyuncuId].seviye}\` \n📈 **İlerleme Durumu:** \`[ ${tumAntrenmanlar[oyuncuId].ilerleme} / ${hedefIlerleme} ]\``)
            .setColor('#3498db');
        return message.reply({ embeds: [antrenmanEmbed] }).catch(console.error);
    }
}

// 1. İSTEDİĞİN KISA KOMUT: .ant
if (command === 'ant') {
    const fsModul = require('fs');
    const hedefOyuncu = message.mentions.users.first() || message.author;
    const oyuncuId = hedefOyuncu.id;
    const dosyaYolu = './antrenmanlar.json';

    let tumAntrenmanlar = {};
    if (fsModul.existsSync(dosyaYolu)) {
        try { tumAntrenmanlar = JSON.parse(fsModul.readFileSync(dosyaYolu, 'utf8')); } catch (e) { tumAntrenmanlar = {}; }
    }

    if (!tumAntrenmanlar[oyuncuId]) tumAntrenmanlar[oyuncuId] = { seviye: 1, ilerleme: 0 };

    tumAntrenmanlar[oyuncuId].ilerleme += 1;
    let seviyeAtladiMi = false;

    if (tumAntrenmanlar[oyuncuId].ilerleme >= 10) {
        tumAntrenmanlar[oyuncuId].seviye += 1;
        tumAntrenmanlar[oyuncuId].ilerleme = 0;
        seviyeAtladiMi = true;
    }

    fsModul.writeFileSync(dosyaYolu, JSON.stringify(tumAntrenmanlar, null, 4));

    if (seviyeAtladiMi) {
        message.reply(`⚡ **${hedefOyuncu.username}** antrenmanı tamamladı ve **Seviye ${tumAntrenmanlar[oyuncuId].seviye}** oldu!`);
    } else {
        message.reply(`💪 Antrenman başarılı! İlerleme: \`[ ${tumAntrenmanlar[oyuncuId].ilerleme} / 10 ]\``);
    }
}

// 2. İSTEDİĞİN EKLEME KOMUTU: .ekle
if (command === 'ekle') {
    const fsModul = require('fs');
    const hedef = message.mentions.members.first();
    const mevki = args[1];

    if (!hedef || !mevki) return message.reply('Kullanım: `.ekle @kullanici Mevki`');

    const dosyaYolu = './kadro.json';
    let kadro = {};
    if (fsModul.existsSync(dosyaYolu)) {
        try { kadro = JSON.parse(fsModul.readFileSync(dosyaYolu, 'utf8')); } catch (e) { kadro = {}; }
    }

    kadro[hedef.id] = { isim: hedef.user.username, mevki: mevki.toUpperCase() };
    fsModul.writeFileSync(dosyaYolu, JSON.stringify(kadro, null, 4));

    message.reply(`✅ **${hedef.user.username}** [${mevki.toUpperCase()}] kadroya başarıyla eklendi!`);
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
            "⚽ **GOOOL!** Top tam doksana gitti, harika gol!",
            "📐 **Direkt!** Top çat diye direkten geri döndü!",
            "🏃‍♂️ **Dışarı!** Top az farkla auta çıktı!"
        ];
        
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('⚽ Penaltı Kullanıldı!')
            .setDescription(`**Pozisyon gerçekleşti...**\n\n${rastgeleSonuc}`)
            .setColor('#00ff00')
            .setImage('https://media.giphy.com/media/uFsS603957L87eFp7M/giphy.gif'); // Temsili futbol gifi

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

// Sadece sistemi denemek için test komutu
if (command === 'saatliktetikle') {
    const fsModul = require('fs');
    const dosyaYolu = './antrenmanlar.json';

    if (!fsModul.existsSync(dosyaYolu)) return message.reply("Kayıtlı antrenman dosyası bulunamadı.");

    try {
        let tumAntrenmanlar = JSON.parse(fsModul.readFileSync(dosyaYolu, 'utf8'));

        for (let oyuncuId in tumAntrenmanlar) {
            tumAntrenmanlar[oyuncuId].ilerleme += 1;
            if (tumAntrenmanlar[oyuncuId].ilerleme >= 10) {
                tumAntrenmanlar[oyuncuId].seviye += 1;
                tumAntrenmanlar[oyuncuId].ilerleme = 0;
            }
        }

        fsModul.writeFileSync(dosyaYolu, JSON.stringify(tumAntrenmanlar, null, 4));
        message.reply("🔄 **[TEST]** Saatlik döngü manuel olarak tetiklendi! Kayıtlı herkesin ilerlemesi +1 arttı.");
    } catch (e) {
        message.reply("Bir hata oluştu.");
    }
}
    

    // --- .paraekle Komutu (Sadece Yetkili Rol) ---
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

    // --- .paracikar Komutu (Sadece Yetkili Rol) ---
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
        hedefPara.cash = Math.max(0, hedefPara.cash - miktar); // Parası eksiye düşmesin diye

        message.reply(`📉 ${hedef} kullanıcısının Cash hesabından **${miktar}** çıkarıldı!`);
    }

    // --- .send Komutu (Herkes kullanabilir) ---
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
    // 1. Slash Komutu ile kurulum tetiklenirse
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

    // 2. Butonlara Tıklanınca Ticket Kanalı Açma
    if (interaction.isButton()) {
        const customId = interaction.customId;
        if (!customId.startsWith('ticket_')) return;

        let ticketTuru = "";
        if (customId === 'ticket_sikayet') ticketTuru = "Şikayet";
        if (customId === 'ticket_reklam') ticketTuru = "Reklam";
        if (customId === 'ticket_cekilis') ticketTuru = "Çekiliş";

        await interaction.reply({ content: 'Biletiniz oluşturuluyor, lütfen bekleyin...', ephemeral: true });

        // Yeni kanal açma işlemi
        const kanal = await interaction.guild.channels.create({
            name: `ticket-${ticketTuru.toLowerCase()}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel], // Herkese kapat
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory], // Açan kişiye aç
                },
                {
                    id: YETKILI_ROL_ID,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory], // Yetkiliye aç
                }
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

    // 3. Ticket Kapatma Butonu tetiklenirse
    if (interaction.isButton() && interaction.customId === 'ticket_kapat') {
        await interaction.reply({ content: 'Bu kanal 5 saniye içinde siliniyor...' });
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.log("Kanal zaten silinmiş veya silinemedi.");
            }
        }, 5000);
    }
});

client.login(process.env.TOKEN);
            
