require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ━━━━━━━━━━━━━━━━━━━━━━ إعدادات القنوات ━━━━━━━━━━━━━━━━━━━━━━
const CHANNELS = process.env.REQUIRED_CHANNELS.split(',').map(ch => ({
  id: ch.trim(),
  name: ch.includes('K7P7A40PaOIwNGY0') ? 'القناة الرسمية' : 'قناة الدعم',
  url: `https://t.me/${ch.replace('@', '')}`
}));

// ━━━━━━━━━━━━━━━━━━━━━━ تهيئة البوت ━━━━━━━━━━━━━━━━━━━━━━
const bot = new TelegramBot(process.env.SUBSCRIPTION_BOT_TOKEN, {polling: true});
const app = express();
app.use(express.json());

// ━━━━━━━━━━━━━━━━━━━━━━ وظائف التحقق ━━━━━━━━━━━━━━━━━━━━━━
async function checkSubscription(userId) {
  const results = await Promise.all(
    CHANNELS.map(async channel => {
      try {
        const member = await bot.getChatMember(channel.id, userId);
        return {
          channel,
          isSubscribed: ['member', 'administrator', 'creator'].includes(member.status)
        };
      } catch (error) {
        console.error(`خطأ في التحقق من ${channel.id}:`, error);
        return { channel, isSubscribed: false };
      }
    })
  );
  
  return {
    allSubscribed: results.every(r => r.isSubscribed),
    unsubscribed: results.filter(r => !r.isSubscribed).map(r => r.channel)
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━ معالجة الأوامر ━━━━━━━━━━━━━━━━━━━━━━
bot.onText(/\/start/, async (msg) => {
  const { allSubscribed, unsubscribed } = await checkSubscription(msg.from.id);
  
  if (!allSubscribed) {
    const buttons = unsubscribed.map(ch => ({
      text: `انضم إلى ${ch.name}`,
      url: ch.url
    }));
    
    await bot.sendMessage(msg.chat.id, `
🔐 *اشتراك إجباري*
يجب الانضمام للقنوات التالية:
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
      reply_markup: {
        inline_keyboard: [[{
          text: 'فتح @VIP_H3bot',
          url: `https://t.me/VIP_H3bot?start=verified_${msg.from.id}`
        }]]
      }
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━ تشغيل الخادم (مطلوب لـ Render) ━━━━━━━━━━━━━━━━━━━━━━
app.get('/', (req, res) => res.send('🤖 نظام الاشتراك الإجباري يعمل'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 البوت المنفصل يعمل على البورت ${process.env.PORT}`);
});