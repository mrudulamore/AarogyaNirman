import type { AssistantAnswer } from './projectAssistant';
export type AssistantLanguage = 'en' | 'hi' | 'mr';
export const assistantLocales = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const messages: Record<string, [string, string]> = {
  'Overview': ['अवलोकन', 'आढावा'],
  'Released funds': ['जारी निधि', 'वितरित निधी'],
  'Expenditure': ['व्यय', 'खर्च'],
  'Pending bills': ['लंबित बिल', 'प्रलंबित बिले'],
  'Delayed milestones': ['विलंबित चरण', 'विलंबित टप्पे'],
  'Open defects': ['खुले दोष', 'प्रलंबित दोष'],
  'Latest inspection': ['नवीनतम निरीक्षण', 'नवीनतम तपासणी'],
  'Open risks': ['खुले जोखिम', 'प्रलंबित जोखीम'],
  'Approvals': ['अनुमोदन', 'मंजुरी'],
  'Work order': ['कार्य आदेश', 'कार्यादेश'],
  'Give me a project overview': ['परियोजना का अवलोकन दिखाएँ', 'प्रकल्पाचा आढावा दाखवा'],
  'How much funding has been released?': ['कितनी निधि जारी हुई है?', 'किती निधी वितरित झाला आहे?'],
  'How much has been spent?': ['कितना खर्च हुआ है?', 'किती खर्च झाला आहे?'],
  'Show pending bills': ['लंबित बिल दिखाएँ', 'प्रलंबित बिले दाखवा'],
  'What milestones are delayed?': ['कौन से चरण विलंबित हैं?', 'कोणते टप्पे विलंबित आहेत?'],
  'Show open defects': ['खुले दोष दिखाएँ', 'प्रलंबित दोष दाखवा'],
  'Show the latest inspection': ['नवीनतम निरीक्षण दिखाएँ', 'नवीनतम तपासणी दाखवा'],
  'Show open risks': ['खुले जोखिम दिखाएँ', 'प्रलंबित जोखीम दाखवा'],
  'Show approvals': ['अनुमोदन दिखाएँ', 'मंजुरी दाखवा'],
  'Show the work order': ['कार्य आदेश दिखाएँ', 'कार्यादेश दाखवा'],
  'Your project companion': ['आपका परियोजना साथी', 'तुमचा प्रकल्प सोबती'],
  'YOUR PROJECT GUIDE': ['आपका परियोजना मार्गदर्शक', 'तुमचा प्रकल्प मार्गदर्शक'],
  'AI GUIDE': ['AI सहायक', 'AI सहाय्यक'],
  'Ask Nirman': ['निर्माण से पूछें', 'निर्माणला विचारा'],
  'Explore your project': ['अपनी परियोजना चुनें', 'तुमचा प्रकल्प निवडा'],
  'Choose a project': ['परियोजना चुनें', 'प्रकल्प निवडा'],
  'All accessible projects': ['सभी उपलब्ध परियोजनाएँ', 'सर्व उपलब्ध प्रकल्प'],
  'Hi, I’m Nirman.': ['नमस्ते, मैं निर्माण हूँ।', 'नमस्कार, मी निर्माण आहे.'],
  'Let’s make your project easier to understand. What would you like to know?': ['आइए, आपकी परियोजना को बेहतर समझें। आप क्या जानना चाहेंगे?', 'चला, तुमचा प्रकल्प सोप्या भाषेत समजून घेऊया. तुम्हाला काय जाणून घ्यायचे आहे?'],
  'Talk to Nirman': ['निर्माण से बात करें', 'निर्माणशी बोला'],
  'Listening… Tap to stop': ['सुन रहा हूँ… रोकने के लिए दबाएँ', 'ऐकत आहे… थांबवण्यासाठी दाबा'],
  'A few things you can ask': ['आप ये सवाल पूछ सकते हैं', 'तुम्ही हे प्रश्न विचारू शकता'],
  'What is the sanctioned amount?': ['स्वीकृत राशि कितनी है?', 'मंजूर रक्कम किती आहे?'],
  'How many inspections are pending?': ['कितने निरीक्षण लंबित हैं?', 'किती तपासण्या प्रलंबित आहेत?'],
  'Show physical progress': ['भौतिक प्रगति दिखाएँ', 'भौतिक प्रगती दाखवा'],
  'What is the planned completion date?': ['नियोजित पूर्णता तिथि क्या है?', 'नियोजित पूर्णत्वाची तारीख काय आहे?'],
  'Show the available balance': ['उपलब्ध शेष राशि दिखाएँ', 'उपलब्ध शिल्लक दाखवा'],
  'Sanctioned amount': ['स्वीकृत राशि', 'मंजूर रक्कम'],
  'Inspections': ['निरीक्षण', 'तपासण्या'],
  'Progress': ['प्रगति', 'प्रगती'],
  'Completion date': ['पूर्णता तिथि', 'पूर्णत्वाची तारीख'],
  'Funds available': ['उपलब्ध निधि', 'उपलब्ध निधी'],
  'Project insight': ['परियोजना की जानकारी', 'प्रकल्पाची माहिती'],
  'Read answer aloud': ['उत्तर सुनें', 'उत्तर ऐका'],
  'View details': ['विवरण देखें', 'तपशील पहा'],
  'No matching records.': ['कोई संबंधित रिकॉर्ड नहीं मिला।', 'संबंधित नोंदी आढळल्या नाहीत.'],
  'Ask Nirman anything about your project…': ['परियोजना के बारे में निर्माण से पूछें…', 'प्रकल्पाबद्दल निर्माणला विचारा…'],
  'Stop reading': ['पढ़ना बंद करें', 'वाचन थांबवा'],
  'Start fresh': ['फिर से शुरू करें', 'पुन्हा सुरू करा'],
  'Aarogya Nirman · Project records only': ['आरोग्य निर्माण · केवल परियोजना रिकॉर्ड', 'आरोग्य निर्माण · फक्त प्रकल्प नोंदी'],
  'Voice input is not supported in this browser. Type or select a demo question.': ['इस ब्राउज़र में आवाज़ से सवाल पूछना उपलब्ध नहीं है। सवाल लिखें या चुनें।', 'या ब्राउझरमध्ये आवाजाद्वारे प्रश्न विचारता येत नाही. प्रश्न लिहा किंवा निवडा.'],
  'Your browser may send audio to its speech service.': ['आपका ब्राउज़र आवाज़ को अपनी स्पीच सेवा को भेज सकता है।', 'तुमचा ब्राउझर आवाज त्याच्या स्पीच सेवेकडे पाठवू शकतो.'],
  'Microphone stopped. You can type your question.': ['माइक्रोफ़ोन बंद है। आप सवाल लिख सकते हैं।', 'मायक्रोफोन बंद आहे. तुम्ही प्रश्न लिहू शकता.'],
  'Question captured. Review it, then press Send.': ['सवाल दर्ज हुआ। जाँचें, फिर भेजें।', 'प्रश्न नोंदवला आहे. तपासा आणि पाठवा.'],
  'Listening…': ['सुन रहा हूँ…', 'ऐकत आहे…'],
  'Microphone stopped. Try again or type a question.': ['माइक्रोफ़ोन बंद है। फिर कोशिश करें या सवाल लिखें।', 'मायक्रोफोन बंद आहे. पुन्हा प्रयत्न करा किंवा प्रश्न लिहा.'],
  'Microphone access was denied. Allow it in your browser or type a question.': ['माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र में अनुमति दें या सवाल लिखें।', 'मायक्रोफोनची परवानगी नाकारली. ब्राउझरमध्ये परवानगी द्या किंवा प्रश्न लिहा.'],
  'No speech detected. Try again or type a question.': ['आवाज़ नहीं मिली। फिर कोशिश करें या सवाल लिखें।', 'आवाज ऐकू आला नाही. पुन्हा प्रयत्न करा किंवा प्रश्न लिहा.'],
  'Voice input is unavailable. Try again or type a question.': ['आवाज़ से सवाल पूछना उपलब्ध नहीं है। फिर कोशिश करें या सवाल लिखें।', 'आवाजाद्वारे प्रश्न विचारणे उपलब्ध नाही. पुन्हा प्रयत्न करा किंवा प्रश्न लिहा.'],
  'Could not start the microphone. You can type a question instead.': ['माइक्रोफ़ोन शुरू नहीं हुआ। आप सवाल लिख सकते हैं।', 'मायक्रोफोन सुरू झाला नाही. तुम्ही प्रश्न लिहू शकता.'],
  'Audio playback is unavailable. The answer is shown above.': ['आवाज़ में उत्तर उपलब्ध नहीं है। उत्तर ऊपर दिखाया गया है।', 'आवाजात उत्तर उपलब्ध नाही. उत्तर वर दिले आहे.'],
  'Some detailed records are shown in their original language.': ['कुछ विस्तृत रिकॉर्ड अपनी मूल भाषा में दिखाए गए हैं।', 'काही तपशीलवार नोंदी मूळ भाषेत दाखवल्या आहेत.'],
  'Choose a project above, then ask one of the suggested questions.': ['ऊपर परियोजना चुनें, फिर सुझाया गया सवाल पूछें।', 'वर प्रकल्प निवडा, नंतर सुचवलेला प्रश्न विचारा.'],
  'Which project or district would you like me to check? Select a project above, or choose All accessible projects.': ['किस परियोजना या जिले की जानकारी चाहिए? ऊपर परियोजना या सभी उपलब्ध परियोजनाएँ चुनें।', 'कोणत्या प्रकल्पाची किंवा जिल्ह्याची माहिती हवी आहे? वर प्रकल्प किंवा सर्व उपलब्ध प्रकल्प निवडा.'],
  'You do not have permission to access this information.': ['आपको यह जानकारी देखने की अनुमति नहीं है।', 'तुम्हाला ही माहिती पाहण्याची परवानगी नाही.'],
  'No accessible projects match this selection and the requested filters.': ['इस चयन के लिए कोई उपलब्ध परियोजना नहीं मिली।', 'या निवडीसाठी कोणताही उपलब्ध प्रकल्प आढळला नाही.'],
  'That project is unavailable in your authorized scope. Select an accessible project.': ['यह परियोजना आपके अधिकृत दायरे में उपलब्ध नहीं है। उपलब्ध परियोजना चुनें।', 'हा प्रकल्प तुमच्या अधिकृत कार्यक्षेत्रात उपलब्ध नाही. उपलब्ध प्रकल्प निवडा.'],
  'I can provide the relevant project information, but this assistant is read-only. Please use the appropriate workflow in the system to perform this action.': ['मैं परियोजना की जानकारी दे सकता हूँ, लेकिन बदलाव नहीं कर सकता। इस कार्रवाई के लिए संबंधित कार्यप्रवाह का उपयोग करें।', 'मी प्रकल्पाची माहिती देऊ शकतो, पण बदल करू शकत नाही. या कृतीसाठी संबंधित कार्यप्रवाह वापरा.'],
  'I cannot provide credentials or sensitive personal information.': ['मैं पासवर्ड या संवेदनशील व्यक्तिगत जानकारी नहीं दे सकता।', 'मी पासवर्ड किंवा संवेदनशील वैयक्तिक माहिती देऊ शकत नाही.'],
  'I can answer recorded project overview, finance, timeline, construction, inspection, defect, risk, approval and document questions. Please choose a suggested question or rephrase using one of these topics.': ['मैं परियोजना, वित्त, प्रगति और निरीक्षण की दर्ज जानकारी बता सकता हूँ। सुझाया गया सवाल चुनें या इन विषयों पर पूछें।', 'मी प्रकल्प, वित्त, प्रगती आणि तपासणीची नोंदवलेली माहिती सांगू शकतो. सुचवलेला प्रश्न निवडा किंवा या विषयांवर विचारा.'],
  'Sanctioned amount (recorded)': ['स्वीकृत राशि (दर्ज)', 'मंजूर रक्कम (नोंदवलेली)'],
  'Available balance': ['उपलब्ध शेष राशि', 'उपलब्ध शिल्लक'],
  'Released amount (recorded)': ['जारी राशि (दर्ज)', 'वितरित रक्कम (नोंदवलेली)'],
  'Expenditure (recorded)': ['व्यय (दर्ज)', 'खर्च (नोंदवलेला)'],
  'Unavailable': ['उपलब्ध नहीं', 'उपलब्ध नाही'],
  'Not recorded': ['दर्ज नहीं', 'नोंद नाही'],
  'Total inspections': ['कुल निरीक्षण', 'एकूण तपासण्या'],
  'Completed': ['पूर्ण', 'पूर्ण'], 'Pending': ['लंबित', 'प्रलंबित'],
  'Open HIGH / CRITICAL defects': ['खुले उच्च / गंभीर दोष', 'प्रलंबित उच्च / गंभीर दोष'],
  'Physical progress': ['भौतिक प्रगति', 'भौतिक प्रगती'],
  'Current completion': ['वर्तमान पूर्णता तिथि', 'सध्याची पूर्णत्वाची तारीख'],
  'Project / ID': ['परियोजना / आईडी', 'प्रकल्प / आयडी'],
  'Inspections & quality — recorded': ['निरीक्षण और गुणवत्ता — दर्ज', 'तपासणी आणि गुणवत्ता — नोंदवलेली'],
  'Physical progress — recorded': ['भौतिक प्रगति — दर्ज', 'भौतिक प्रगती — नोंदवलेली'],
  'Record inconsistencies': ['रिकॉर्ड में विसंगतियाँ', 'नोंदींमधील विसंगती'],
  'At a glance': ['एक नज़र में', 'एका नजरेत'],
  'Status': ['स्थिति', 'स्थिती'], 'Inspector': ['निरीक्षक', 'तपासणी अधिकारी'],
  'Result': ['परिणाम', 'निकाल'], 'ID / project': ['आईडी / परियोजना', 'आयडी / प्रकल्प'],
  'Completed / scheduled': ['पूर्ण / निर्धारित', 'पूर्ण / नियोजित'],
  'Send question': ['सवाल भेजें', 'प्रश्न पाठवा'], 'Stop microphone': ['माइक्रोफ़ोन बंद करें', 'मायक्रोफोन बंद करा'],
  'Ask with microphone': ['माइक्रोफ़ोन से पूछें', 'मायक्रोफोनद्वारे विचारा'],
  'Close assistant': ['सहायक बंद करें', 'सहाय्यक बंद करा'],
};

export function assistantText(value: string, language: AssistantLanguage): string {
  if (language === 'en') return value;
  const index = language === 'hi' ? 0 : 1;
  if (messages[value]) return messages[value][index];
  // Translate generated labels, never arbitrary words within project names or record text.
  const split = value.indexOf(': ');
  if (split >= 0 && messages[value.slice(0, split)]) return messages[value.slice(0, split)][index] + ': ' + assistantText(value.slice(split + 2), language);
  return value;
}

export function normalizeAssistantQuestion(question: string): string {
  let q = question.normalize('NFC').trim();
  const exact = Object.entries(messages).find(([, translations]) => translations.includes(q));
  if (exact) q = exact[0];
  q = q.toLowerCase();
  const aliases: [RegExp, string][] = [
    [/\b(?:sanction amount|approved budget|manjur rakkam|manzoor rashi)\b/g, 'sanctioned amount'],
    [/\b(?:money left|remaining funds|remaining balance|bacha paisa|shillak)\b/g, 'available balance'],
    [/\b(?:expenses|spending|kharch)\b/g, 'expenditure'],
    [/\binspection pending\b/g, 'pending inspection'],
    [/\b(?:tapasani|nirikshan)\b/g, 'inspection'],
    [/\b(?:finish date|end date|deadline|kab pura|kadhi purna)\b/g, 'completion date'],
    [/\b(?:progress|pragati)\b/g, 'physical progress'],
    [/\b(?:problems|snags|faults)\b/g, 'defects'],
    [/\b(?:late milestones|overdue milestones)\b/g, 'delayed milestones'],
    [/मंजूर करा|स्वीकृत करें|मंजूरी दें/g, 'approve'],
    [/कार्य आदेश|कार्यादेश/g, 'work order'],
    [/तांत्रिक मंजुरी|तकनीकी स्वीकृति/g, 'technical sanction'],
    [/विलंबित|उशीर|देरी/g, 'delayed'], [/टप्पे|टप्पा|चरण/g, 'milestones'],
    [/जोखीम|जोखिम/g, 'risks'], [/दोष|त्रुटी|खामियां/g, 'defects'],
    [/बिले|बिल/g, 'bills'], [/मंजुरी|अनुमोदन/g, 'approvals'],
    [/नवीनतम|नवीन|आखिरी|ताज्या/g, 'latest'],
    [/वितरित निधी|जारी निधि|वितरित|जारी/g, 'released'],
    [/प्रगती|प्रगति/g, 'physical progress'], [/बजट|अंदाजपत्रक/g, 'budget'],
    [/स्वीकृत राशि|मंजूर रक्कम|मंजूर निधी|मंजूर राशि|sanction rakkam|manjur rakkam|स्वीकृत बजट/g, 'sanctioned amount'],
    [/निरीक्षण|तपासण्या|तपासणी|तपासण्या/g, 'inspection'],
    [/लंबित|प्रलंबित|बाकी/g, 'pending'],
    [/भौतिक प्रगति|भौतिक प्रगती|कामाची प्रगती|काम की प्रगति/g, 'physical progress'],
    [/पूर्णता तिथि|पूर्णत्वाची तारीख|पूर्ण होण्याची तारीख|कब पूरा|कधी पूर्ण/g, 'completion date'],
    [/उपलब्ध शेष राशि|उपलब्ध शिल्लक|शिल्लक निधी|शेष राशि|शिल्लक|बचा हुआ पैसा/g, 'available balance'],
    [/खर्च|व्यय/g, 'expenditure'], [/आढावा|अवलोकन/g, 'overview'],
    [/पासवर्ड|मोबाइल नंबर|फोन नंबर|ईमेल/g, 'credentials'],
    [/मंजूर करा|स्वीकृत करें|मंजूरी दें/g, 'approve'], [/हटाएँ|हटाएं|हटवा|काढून टाका/g, 'delete'],
    [/बदल करा|बदलें|बदलो/g, 'modify'],
  ];
  for (const [pattern, replacement] of aliases) q = q.replace(pattern, ` ${replacement} `);
  return q;
}

export function assistantSummary(answer: AssistantAnswer, question: string, language: AssistantLanguage): string {
  if (language === 'en') return answer.summary;
  const t = (s: string) => assistantText(s, language);
  if (answer.directAnswer) {
    return answer.summary.split('\n').map(line => {
      const separator = line.indexOf(': ');
      return separator < 0 ? t(line) : line.slice(0, separator + 2) + line.slice(separator + 2).split('; ').map(t).join('; ');
    }).join('\n');
  }
  const q = normalizeAssistantQuestion(question).toLowerCase();
  if (/inspection/.test(q)) {
    const lines = answer.sections.find(s => s.title === 'Inspections & quality — recorded')?.lines;
    if (lines) return lines.map(t).join('\n');
  }
  const section = /physical progress/.test(q) ? answer.sections.find(s => s.title === 'Physical progress — recorded')
    : /completion/.test(q) ? answer.sections.find(s => s.title === 'Project information — recorded') : undefined;
  if (section?.rows) return section.rows.map(row => `${row[0]}: ${t(/completion/.test(q) ? 'Current completion' : 'Physical progress')}: ${t(row[/completion/.test(q) ? 5 : 1])}`).join('\n');
  return t(answer.summary);
}
