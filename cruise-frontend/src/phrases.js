// מילים וביטויים שימושיים לכל שפה במסלול, עם תעתיק לעברית.
// speech: קוד השפה להשמעה בטלפון (speechSynthesis). text: מה שמופיע בשפה המקורית ומה שמושמע.

export const languages = {
  it: {
    name: 'איטלקית',
    speech: 'it-IT',
    tip: 'באיטליה נהוג לפתוח כל שיחה ב-Buongiorno (עד אחר הצהריים) או ב-Buonasera (מהערב).',
    phrases: [
      { he: 'בוקר טוב / שלום', text: 'Buongiorno', say: 'בּוֹנְ-גּ׳וֹרְנוֹ' },
      { he: 'ערב טוב', text: 'Buonasera', say: 'בּוּאוֹנָה-סֵרָה' },
      { he: 'תודה', text: 'Grazie', say: 'גְּרַצְיֶה' },
      { he: 'בבקשה (כשמבקשים)', text: 'Per favore', say: 'פֶּר פָבוֹרֶה' },
      { he: 'סליחה', text: 'Scusi', say: 'סְקוּזִי' },
      { he: 'כן / לא', text: 'Sì / No', say: 'סִי / נוֹ' },
      { he: 'כמה זה עולה?', text: 'Quanto costa?', say: 'קְוָואנְטוֹ קוֹסְטָה?' },
      { he: 'את החשבון, בבקשה', text: 'Il conto, per favore', say: 'אִיל קוֹנְטוֹ, פֶּר פָבוֹרֶה' },
      { he: 'איפה השירותים?', text: 'Dov’è il bagno?', say: 'דוֹבֶה אִיל בַּנְיוֹ?' },
      { he: 'מים בלי גז / עם גז', text: 'Acqua naturale / frizzante', say: 'אָקְוָוה נָטוּרָאלֶה / פְרִיצָנְטֶה' },
      { he: 'קפה אחד, בבקשה', text: 'Un caffè, per favore', say: 'אוּן קָפֶה, פֶּר פָבוֹרֶה' },
      { he: 'הצילו! / עזרה!', text: 'Aiuto!', say: 'אַיּוּטוֹ!' },
    ],
  },
  el: {
    name: 'יוונית',
    speech: 'el-GR',
    tip: 'שימו לב: ביוונית Ναι (נֶה) זה "כן", ו-Όχι (אוֹחִי) זה "לא".',
    phrases: [
      { he: 'שלום', text: 'Γεια σας', latin: 'Yia sas', say: 'יָה סָס' },
      { he: 'בוקר טוב', text: 'Καλημέρα', latin: 'Kaliméra', say: 'קָלִימֶרָה' },
      { he: 'ערב טוב', text: 'Καλησπέρα', latin: 'Kalispéra', say: 'קָלִיסְפֶּרָה' },
      { he: 'תודה', text: 'Ευχαριστώ', latin: 'Efcharistó', say: 'אֶפְחָרִיסְטוֹ' },
      { he: 'בבקשה', text: 'Παρακαλώ', latin: 'Parakaló', say: 'פָּרָקָלוֹ' },
      { he: 'סליחה', text: 'Συγγνώμη', latin: 'Signómi', say: 'סִיגְנוֹמִי' },
      { he: 'כן / לא', text: 'Ναι / Όχι', latin: 'Ne / Óchi', say: 'נֶה / אוֹחִי' },
      { he: 'כמה זה עולה?', text: 'Πόσο κάνει;', latin: 'Póso káni?', say: 'פּוֹסוֹ קָאנִי?' },
      { he: 'את החשבון, בבקשה', text: 'Τον λογαριασμό, παρακαλώ', latin: 'Ton logariasmó, parakaló', say: 'טוֹן לוֹגָרְיָאזְמוֹ, פָּרָקָלוֹ' },
      { he: 'איפה השירותים?', text: 'Πού είναι η τουαλέτα;', latin: 'Pu íne i tualéta?', say: 'פּוּ אִינֶה אִי טוּאָלֶטָה?' },
      { he: 'מים', text: 'Νερό', latin: 'Neró', say: 'נֶרוֹ' },
      { he: 'לחיים!', text: 'Γεια μας!', latin: 'Yia mas!', say: 'יָה מָאס!' },
      { he: 'עזרה!', text: 'Βοήθεια!', latin: 'Voíthia!', say: 'ווֹאִיתְיָה!' },
    ],
  },
  tr: {
    name: 'טורקית',
    speech: 'tr-TR',
    tip: 'בבזאר המחיר הראשון הוא רק פתיחה. "Hayır, teşekkürler" (לא, תודה) עוזר להיפטר ממוכרים בנימוס.',
    phrases: [
      { he: 'שלום', text: 'Merhaba', say: 'מֶרְהָבָּה' },
      { he: 'תודה', text: 'Teşekkür ederim', say: 'טֶשֶׁכּוּר אֶדֶרִים' },
      { he: 'בבקשה (כשמבקשים)', text: 'Lütfen', say: 'לִיוּטְפֶן' },
      { he: 'סליחה', text: 'Affedersiniz', say: 'אַפֶדֶרְסִינִיז' },
      { he: 'כן / לא', text: 'Evet / Hayır', say: 'אֶוֶט / הָאיִר' },
      { he: 'לא, תודה', text: 'Hayır, teşekkürler', say: 'הָאיִר, טֶשֶׁכּוּרְלֶר' },
      { he: 'כמה זה עולה?', text: 'Bu ne kadar?', say: 'בּוּ נֶה קָדָר?' },
      { he: 'יקר מדי', text: 'Çok pahalı', say: 'צ׳וֹק פָּהָאלִי' },
      { he: 'את החשבון, בבקשה', text: 'Hesap, lütfen', say: 'הֶסָאפּ, לִיוּטְפֶן' },
      { he: 'איפה השירותים?', text: 'Tuvalet nerede?', say: 'טוּוָולֶט נֶרֶדֶה?' },
      { he: 'מים', text: 'Su', say: 'סוּ' },
      { he: 'עזרה!', text: 'İmdat!', say: 'אִימְדָאט!' },
    ],
  },
};

// השפה של כל מדריך
export const guideLanguage = { rome: 'it', naples: 'it', santorini: 'el', mykonos: 'el', kusadasi: 'tr' };
