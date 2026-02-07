
import { GoogleGenAI, Modality } from "@google/genai";

const getClient = () => {
    const key = process.env.API_KEY;
    if (!key) throw new Error("API Key chưa được cấu hình (process.env.API_KEY).");
    return new GoogleGenAI({ apiKey: key });
};

export const performOcr = async (imageBase64: string, language: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                    { text: `Extract all text from this image accurately. The language is likely ${language}. Preserve layout as much as possible.` }
                ]
            }
        });
        return response.text || "Không tìm thấy văn bản.";
    } catch (e) {
        console.error(e);
        return `Lỗi OCR: ${(e as Error).message}`;
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    if (!text.trim()) throw new Error("Văn bản trống.");
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text.substring(0, 4000) }] }], // Limit char count
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
        }
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("Không nhận được dữ liệu âm thanh.");
    return audioData;
};
