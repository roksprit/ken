require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// تأكيد وجود المتغيرات الأساسية
if (!process.env.SUBSCRIPTION_BOT_TOKEN) {
  throw new Error("❌ لم يتم تعيين SUBSCRIPTION_BOT_TOKEN في ملف .env");
}

const bot = new TelegramBot(process.env.SUBSCRIPTION_BOT_TOKEN, {polling: true});

// تحويل القنوات إلى مصفوفة
const getChannels = () => {
  return process.env.REQUIRED_CHANNELS.split(',').map(ch => ({
    id: ch.trim(),
    name: ch.includes('K7P7A40PaOIwNGY0') ? 'القناة الرسمية' : 'قناة الدعم'
  }));
};

// التحقق من الاشتراكات
const checkSubscription = async (userId) => {
  const channels = getChannels();
  const results = await Promise.all(
    channels.map(async channel => {
      try {
        const member = await bot.getChatMember(channel.id, userId);
        return {
          channel,
          isMember: ['member', 'administrator', 'creator'].includes(member.status)
        };
      } catch (error) {
        console.error(`فشل التحقق في ${channel.id}:`, error);
        return { channel, isMember: false };
      }
    })
  );

  return {
    allSubscribed: results.every(r => r.isMember),
    unsubscribed: results.filter(r => !r.isMember).map(r => r.channel)
  };
};

// معالجة /start
bot.onText(/\/start/, async (msg) => {
  const { allSubscribed, unsubscribed } = await checkSubscription(msg.from.id);

  if (!allSubscribed) {
    const buttons = unsubscribed.map(ch => ({
      text: `انضم إلى ${ch.name}`,
      url: `https://t.me/${ch.id.replace('@', '')}`
    }));

    await bot.sendMessage(msg.chat.id, `
🔐 *مطلوب اشتراك*
للاستمرار، يرجى الانضمام إلى:
${unsubscribed.map(ch => `- ${ch.name}`).join('\n')}
    `.trim(), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          buttons,
          [{ text: 'تحقق الآن', callback_data: 'check_sub' }]
        ]
      }
    });
  } else {
    await bot.sendMessage(msg.chat.id, `
🎉 *تم التحقق بنجاح!*
اضغط لفتح البوت الرئيسي:
    `.trim(), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{
          text: 'فتح @VIP_H3bot',
          url: `https://t.me/VIP_H3bot?start=verified_${msg.from.id}`
        }]]
      }
    });
  }
});

// معالجة التحقق
bot.on('callback_query', async (query) => {
  if (query.data === 'check_sub') {
    const { allSubscribed } = await checkSubscription(query.from.id);
    
    await bot.answerCallbackQuery(query.id, {
      text: allSubscribed ? '✅ تم التحقق!' : '❌ لم تنضم بعد!',
      show_alert: true
    });
  }
});

console.log(`🤖 ${process.env.SUBSCRIPTION_BOT_NAME} يعمل بنجاح!`);