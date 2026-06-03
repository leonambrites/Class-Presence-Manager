import { Readable } from 'stream';

const MAC_ROMAN_MAP = [
  'Ä', 'Å', 'Ç', 'É', 'Ñ', 'Ö', 'Ü', 'á', 'à', 'â', 'ä', 'ã', 'å', 'ç', 'é', 'è',
  'ê', 'ë', 'í', 'ì', 'î', 'ï', 'ñ', 'ó', 'ò', 'ô', 'ö', 'õ', 'ú', 'ù', 'û', 'ü',
  '†', '°', '¢', '£', '§', '•', '¶', 'ß', '®', '©', '™', '´', '¨', '≠', 'Æ', 'Ø',
  '∞', '±', '≤', '≥', '¥', 'µ', '∂', '∑', '∏', 'π', '∫', 'ª', 'º', 'Ω', 'æ', 'ø',
  '¿', '¡', '¬', '√', 'ƒ', '≈', '∆', '«', '»', '…', '\xa0', 'À', 'Ã', 'Õ', 'Œ', 'œ',
  '–', '—', '“', '”', '‘', '’', '÷', '◊', 'ÿ', 'Ÿ', '⁄', '€', '‹', '›', 'ﬁ', 'ﬂ',
  '‡', '·', '‚', '„', '‰', 'Â', 'Ê', 'Á', 'Ë', 'È', 'Í', 'Î', 'Ï', 'Ì', 'Ó', 'Ô',
  '\uf8ff', 'Ò', 'Ú', 'Û', 'Ù', 'ı', 'ˆ', '˜', '¯', '˘', '˙', '˚', '¸', '˝', '˛', 'ˇ'
];

export function decodeBuffer(buf: Buffer): string {
    // 1. Try UTF-8 first
    const utf8Str = buf.toString('utf8');
    if (!utf8Str.includes('\uFFFD')) {
        return utf8Str;
    }

    // 2. Count common Portuguese accented characters in MacRoman vs Latin1/CP1252 to decide
    let macRomanScore = 0;
    let latin1Score = 0;

    for (let i = 0; i < buf.length; i++) {
        const b = buf[i];
        // MacRoman: á (0x87), ã (0x8B), ç (0x8D), é (0x8E), ê (0x90), í (0x92), õ (0x96), ó (0x97), ú (0x9C)
        if ([0x87, 0x8B, 0x8D, 0x8E, 0x90, 0x92, 0x96, 0x97, 0x9C].includes(b)) {
            macRomanScore++;
        }
        // Latin1/CP1252: á (0xE1), ã (0xE3), ç (0xE7), é (0xE9), ê (0xEA), í (0xED), õ (0xF5), ó (0xF3), ú (0xFA)
        if ([0xE1, 0xE3, 0xE7, 0xE9, 0xEA, 0xED, 0xF5, 0xF3, 0xFA].includes(b)) {
            latin1Score++;
        }
    }

    if (latin1Score > macRomanScore) {
        return buf.toString('latin1');
    }

    // Decode as Mac OS Roman
    let str = '';
    for (let i = 0; i < buf.length; i++) {
        const byte = buf[i];
        if (byte < 128) {
            str += String.fromCharCode(byte);
        } else {
            str += MAC_ROMAN_MAP[byte - 128];
        }
    }
    return str;
}
