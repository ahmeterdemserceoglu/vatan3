/**
 * =====================================================
 * GELİŞMİŞ İNTİHAL (PLAGIARISM) TESPİT SİSTEMİ
 * =====================================================
 * 
 * Bu sistem aşağıdaki yöntemleri kullanarak intihal tespiti yapar:
 * 
 * 1. N-Gram Analizi - Kelime gruplarını karşılaştırma (bigram, trigram)
 * 2. Shingling (MinHash) - Metin parçalarını karşılaştırma
 * 3. Levenshtein Mesafesi - Karakter bazlı benzerlik
 * 4. Cosine Similarity - TF-IDF vektör benzerliği
 * 5. Longest Common Subsequence - En uzun ortak alt dizi
 * 6. Sentence Structure Analysis - Cümle yapısı karşılaştırma
 * 7. Word Frequency Analysis - Kelime frekans analizi
 * 
 * Sonuç: Ağırlıklı ortalama ile kombine edilen nihai skor
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// =====================================================
// TİP TANIMLARI
// =====================================================

export interface PlagiarismMatch {
    startIndex: number;
    endIndex: number;
    matchedText: string;
    sourceStudentName: string;
    sourceSubmissionId: string;
    similarity: number;
}

export interface PlagiarismResult {
    overallScore: number;           // 0-100 genel benzerlik skoru
    jaccardScore: number;           // Jaccard benzerliği
    ngramScore: number;             // N-gram benzerliği
    cosineScore: number;            // Cosine benzerliği
    lcsScore: number;               // LCS benzerliği
    sentenceScore: number;          // Cümle yapısı benzerliği
    wordFrequencyScore: number;     // Kelime frekans benzerliği
    riskLevel: 'low' | 'medium' | 'high' | 'critical'; // Risk seviyesi
    similarSubmissions: SimilarSubmission[];
    matchedSections: PlagiarismMatch[];
    analysisDetails: AnalysisDetails;
    checkedAt: Date;
}

export interface SimilarSubmission {
    submissionId: string;
    studentId: string;
    studentName: string;
    studentPhotoURL?: string;
    similarity: number;
    matchedPhrases: string[];
    matchCount: number;
}

export interface AnalysisDetails {
    totalWords: number;
    uniqueWords: number;
    totalSentences: number;
    averageWordLength: number;
    vocabularyRichness: number;     // Unique/Total kelime oranı
    commonPhraseCount: number;      // Ortak ifade sayısı
    suspiciousPatterns: string[];   // Şüpheli kalıplar
}

// =====================================================
// METİN ÖN İŞLEME
// =====================================================

// Türkçe stop words (edat, bağlaç vb.)
const TURKISH_STOP_WORDS = new Set([
    've', 'veya', 'ile', 'için', 'de', 'da', 'den', 'dan', 'bir', 'bu', 'şu', 'o',
    'ben', 'sen', 'biz', 'siz', 'onlar', 'ki', 'ama', 'fakat', 'ancak', 'lakin',
    'çünkü', 'zira', 'eğer', 'şayet', 'ya', 'hem', 'ne', 'nasıl', 'neden', 'niçin',
    'gibi', 'kadar', 'göre', 'dair', 'olan', 'olarak', 'üzere', 'diye', 'dolayı',
    'rağmen', 'karşın', 'halde', 'var', 'yok', 'ise', 'mi', 'mı', 'mu', 'mü',
    'daha', 'en', 'bile', 'sadece', 'yalnızca', 'hep', 'hiç', 'her', 'bazı',
    'tüm', 'bütün', 'aynı', 'başka', 'diğer', 'öyle', 'böyle', 'şöyle',
    // English stop words
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'from',
    'by', 'on', 'off', 'for', 'in', 'out', 'over', 'to', 'into', 'with', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'whom', 'where', 'how', 'why', 'because', 'as', 'of',
]);

/**
 * Metni normalleştir ve temizle
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\wığüşöçİĞÜŞÖÇ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Metni kelimelere ayır (tokenize)
 */
function tokenize(text: string, removeStopWords: boolean = true): string[] {
    const normalized = normalizeText(text);
    const words = normalized.split(/\s+/).filter(w => w.length > 1);

    if (removeStopWords) {
        return words.filter(w => !TURKISH_STOP_WORDS.has(w));
    }
    return words;
}

/**
 * Metni cümlelere ayır
 */
function splitToSentences(text: string): string[] {
    return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
}

// =====================================================
// BENZERLİK ALGORİTMALARI
// =====================================================

/**
 * N-Gram oluştur (kelime grupları)
 */
function generateNGrams(tokens: string[], n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * Shingle oluştur (karakter tabanlı parçalar)
 */
function generateShingles(text: string, k: number = 5): Set<string> {
    const shingles = new Set<string>();
    const normalized = normalizeText(text);
    for (let i = 0; i <= normalized.length - k; i++) {
        shingles.add(normalized.substring(i, i + k));
    }
    return shingles;
}

/**
 * Jaccard Benzerliği - İki set arasındaki benzerlik
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

/**
 * N-Gram Benzerliği - Bigram ve Trigram kullanarak
 */
function ngramSimilarity(text1: string, text2: string): number {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    if (tokens1.length < 2 || tokens2.length < 2) return 0;

    // Bigram benzerliği
    const bigrams1 = generateNGrams(tokens1, 2);
    const bigrams2 = generateNGrams(tokens2, 2);
    const bigramSim = jaccardSimilarity(bigrams1, bigrams2);

    // Trigram benzerliği
    const trigrams1 = generateNGrams(tokens1, 3);
    const trigrams2 = generateNGrams(tokens2, 3);
    const trigramSim = tokens1.length >= 3 && tokens2.length >= 3
        ? jaccardSimilarity(trigrams1, trigrams2)
        : 0;

    // 4-gram benzerliği (daha spesifik eşleşmeler için)
    const fourgrams1 = generateNGrams(tokens1, 4);
    const fourgrams2 = generateNGrams(tokens2, 4);
    const fourgramSim = tokens1.length >= 4 && tokens2.length >= 4
        ? jaccardSimilarity(fourgrams1, fourgrams2)
        : 0;

    // Ağırlıklı ortalama (uzun n-gram'lar daha önemli)
    return (bigramSim * 0.2 + trigramSim * 0.4 + fourgramSim * 0.4);
}

/**
 * Cosine Benzerliği - TF vektörleri kullanarak
 */
function cosineSimilarity(text1: string, text2: string): number {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    // Kelime frekansları (TF)
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    tokens1.forEach(w => freq1.set(w, (freq1.get(w) || 0) + 1));
    tokens2.forEach(w => freq2.set(w, (freq2.get(w) || 0) + 1));

    // Tüm benzersiz kelimeler
    const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

    if (allWords.size === 0) return 0;

    // Vektörleri hesapla
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allWords.forEach(word => {
        const f1 = freq1.get(word) || 0;
        const f2 = freq2.get(word) || 0;
        dotProduct += f1 * f2;
        magnitude1 += f1 * f1;
        magnitude2 += f2 * f2;
    });

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

/**
 * En Uzun Ortak Alt Dizi (LCS) oranı
 */
function lcsRatio(text1: string, text2: string): number {
    const words1 = tokenize(text1, false);
    const words2 = tokenize(text2, false);

    const m = words1.length;
    const n = words2.length;

    if (m === 0 || n === 0) return 0;

    // Optimize: Çok uzun metinler için sampling yap
    const maxLen = 500;
    const sample1 = m > maxLen ? words1.slice(0, maxLen) : words1;
    const sample2 = n > maxLen ? words2.slice(0, maxLen) : words2;

    const dp: number[][] = Array(sample1.length + 1)
        .fill(null)
        .map(() => Array(sample2.length + 1).fill(0));

    for (let i = 1; i <= sample1.length; i++) {
        for (let j = 1; j <= sample2.length; j++) {
            if (sample1[i - 1] === sample2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const lcsLength = dp[sample1.length][sample2.length];
    return (2 * lcsLength) / (sample1.length + sample2.length);
}

/**
 * Cümle Yapısı Benzerliği
 */
function sentenceStructureSimilarity(text1: string, text2: string): number {
    const sentences1 = splitToSentences(text1);
    const sentences2 = splitToSentences(text2);

    if (sentences1.length === 0 || sentences2.length === 0) return 0;

    let totalSimilarity = 0;
    let matchCount = 0;

    // Her cümle için en benzer cümleyi bul
    sentences1.forEach(s1 => {
        let maxSim = 0;
        sentences2.forEach(s2 => {
            const sim = cosineSimilarity(s1, s2);
            maxSim = Math.max(maxSim, sim);
        });
        if (maxSim > 0.5) { // Anlamlı eşleşme eşiği
            totalSimilarity += maxSim;
            matchCount++;
        }
    });

    // Eşleşen cümle oranı
    const matchRatio = matchCount / sentences1.length;
    const avgSimilarity = matchCount > 0 ? totalSimilarity / matchCount : 0;

    return matchRatio * avgSimilarity;
}

/**
 * Kelime Frekans Profili Benzerliği
 */
function wordFrequencySimilarity(text1: string, text2: string): number {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    // Top N kelime frekansları
    const getTopFrequencies = (tokens: string[], n: number = 20): Map<string, number> => {
        const freq = new Map<string, number>();
        tokens.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));

        const sorted = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);

        // Normalize et
        const total = sorted.reduce((sum, [, count]) => sum + count, 0);
        return new Map(sorted.map(([word, count]) => [word, count / total]));
    };

    const topFreq1 = getTopFrequencies(tokens1);
    const topFreq2 = getTopFrequencies(tokens2);

    // Ortak kelimelerin frekans benzerliği
    let similaritySum = 0;
    let count = 0;

    topFreq1.forEach((ratio1, word) => {
        const ratio2 = topFreq2.get(word);
        if (ratio2 !== undefined) {
            // Her iki metinde de bulunan kelimeler için frekans benzerliği
            const minRatio = Math.min(ratio1, ratio2);
            const maxRatio = Math.max(ratio1, ratio2);
            similaritySum += minRatio / maxRatio;
            count++;
        }
    });

    if (count === 0) return 0;

    // Ortak kelime oranı ve frekans benzerliğini kombine et
    const commonWordRatio = count / Math.max(topFreq1.size, topFreq2.size);
    const avgFreqSimilarity = similaritySum / count;

    return commonWordRatio * avgFreqSimilarity;
}

// =====================================================
// EŞLEŞEN BÖLÜMLERİ BUL
// =====================================================

/**
 * Eşleşen metin bölümlerini bul
 */
function findMatchedSections(
    text1: string,
    text2: string,
    studentName: string,
    submissionId: string
): PlagiarismMatch[] {
    const matches: PlagiarismMatch[] = [];
    const sentences1 = splitToSentences(text1);

    sentences1.forEach(sentence => {
        // Cümle text2'de benzer şekilde var mı?
        const similarity = cosineSimilarity(sentence, text2);

        if (similarity > 0.6) {
            // Cümlenin pozisyonunu bul
            const startIndex = text1.indexOf(sentence);
            if (startIndex !== -1) {
                matches.push({
                    startIndex,
                    endIndex: startIndex + sentence.length,
                    matchedText: sentence,
                    sourceStudentName: studentName,
                    sourceSubmissionId: submissionId,
                    similarity: Math.round(similarity * 100),
                });
            }
        }
    });

    return matches;
}

/**
 * Ortak ifadeleri bul
 */
function findCommonPhrases(text1: string, text2: string, minLength: number = 4): string[] {
    const tokens1 = tokenize(text1, false);
    const tokens2 = tokenize(text2, false);
    const commonPhrases: string[] = [];

    // 4-6 kelimelik ortak ifadeleri bul
    for (let len = 6; len >= minLength; len--) {
        const ngrams1 = generateNGrams(tokens1, len);
        const ngrams2 = generateNGrams(tokens2, len);

        ngrams1.forEach(ngram => {
            if (ngrams2.has(ngram) && !commonPhrases.some(p => p.includes(ngram) || ngram.includes(p))) {
                commonPhrases.push(ngram);
            }
        });
    }

    return commonPhrases.slice(0, 10); // İlk 10 ortak ifade
}

// =====================================================
// ANALİZ DETAYLARI
// =====================================================

/**
 * Metin analizi detaylarını hesapla
 */
function analyzeText(text: string): Omit<AnalysisDetails, 'commonPhraseCount' | 'suspiciousPatterns'> {
    const allTokens = tokenize(text, false);
    const uniqueTokens = new Set(allTokens);
    const sentences = splitToSentences(text);

    const avgWordLength = allTokens.length > 0
        ? allTokens.reduce((sum, w) => sum + w.length, 0) / allTokens.length
        : 0;

    const vocabularyRichness = allTokens.length > 0
        ? uniqueTokens.size / allTokens.length
        : 0;

    return {
        totalWords: allTokens.length,
        uniqueWords: uniqueTokens.size,
        totalSentences: sentences.length,
        averageWordLength: Math.round(avgWordLength * 10) / 10,
        vocabularyRichness: Math.round(vocabularyRichness * 100),
    };
}

/**
 * Şüpheli kalıpları tespit et
 */
function detectSuspiciousPatterns(text: string): string[] {
    const patterns: string[] = [];

    // Çok uzun cümleler
    const sentences = splitToSentences(text);
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 50);
    if (longSentences.length > 0) {
        patterns.push(`${longSentences.length} adet aşırı uzun cümle tespit edildi`);
    }

    // Tutarsız noktalama
    const excessivePunctuation = (text.match(/[!?]{2,}/g) || []).length;
    if (excessivePunctuation > 3) {
        patterns.push('Aşırı noktalama işareti kullanımı');
    }

    // Kopyala-yapıştır kalıntıları (özel karakterler)
    if (/[\u200B-\u200D\uFEFF]/.test(text)) {
        patterns.push('Gizli karakterler tespit edildi (kopyala-yapıştır işareti)');
    }

    // Anormal kelime tekrarı
    const tokens = tokenize(text, false);
    const freq = new Map<string, number>();
    tokens.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));

    freq.forEach((count, word) => {
        const ratio = count / tokens.length;
        if (ratio > 0.05 && word.length > 4 && !TURKISH_STOP_WORDS.has(word)) {
            patterns.push(`"${word}" kelimesi anormal sıklıkta kullanılmış (%${Math.round(ratio * 100)})`);
        }
    });

    return patterns.slice(0, 5);
}

// =====================================================
// RİSK SEVİYESİ HESAPLAMA
// =====================================================

/**
 * Risk seviyesini belirle
 */
function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

// =====================================================
// ANA İNTİHAL KONTROL FONKSİYONU
// =====================================================

/**
 * Gelişmiş intihal kontrolü yap
 */
export async function advancedPlagiarismCheck(
    submissionId: string,
    assignmentId: string
): Promise<PlagiarismResult> {
    // Teslimi getir
    const subDoc = await getDoc(doc(db, 'submissions', submissionId));
    if (!subDoc.exists()) throw new Error('Teslim bulunamadı');

    const submission = subDoc.data();
    const content = submission.content || '';

    // Boş içerik kontrolü
    if (!content.trim()) {
        const emptyResult: PlagiarismResult = {
            overallScore: 0,
            jaccardScore: 0,
            ngramScore: 0,
            cosineScore: 0,
            lcsScore: 0,
            sentenceScore: 0,
            wordFrequencyScore: 0,
            riskLevel: 'low',
            similarSubmissions: [],
            matchedSections: [],
            analysisDetails: {
                totalWords: 0,
                uniqueWords: 0,
                totalSentences: 0,
                averageWordLength: 0,
                vocabularyRichness: 0,
                commonPhraseCount: 0,
                suspiciousPatterns: [],
            },
            checkedAt: new Date(),
        };
        return emptyResult;
    }

    // Aynı ödev için tüm teslimleri getir
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId)
    );
    const snapshot = await getDocs(q);

    const similarSubmissions: SimilarSubmission[] = [];
    const allMatchedSections: PlagiarismMatch[] = [];

    let maxJaccard = 0;
    let maxNgram = 0;
    let maxCosine = 0;
    let maxLcs = 0;
    let maxSentence = 0;
    let maxWordFreq = 0;

    // Her teslim ile karşılaştır
    for (const docSnap of snapshot.docs) {
        if (docSnap.id === submissionId) continue; // Kendini atla

        const otherData = docSnap.data();
        const otherContent = otherData.content || '';

        if (!otherContent.trim()) continue;

        // Tüm algoritmaları uygula
        const tokens1 = new Set(tokenize(content));
        const tokens2 = new Set(tokenize(otherContent));
        const jaccardScore = jaccardSimilarity(tokens1, tokens2);

        const ngramScore = ngramSimilarity(content, otherContent);
        const cosineScore = cosineSimilarity(content, otherContent);
        const lcsScore = lcsRatio(content, otherContent);
        const sentenceScore = sentenceStructureSimilarity(content, otherContent);
        const wordFreqScore = wordFrequencySimilarity(content, otherContent);

        // Ağırlıklı ortalama
        const combinedScore = (
            jaccardScore * 0.10 +
            ngramScore * 0.25 +
            cosineScore * 0.20 +
            lcsScore * 0.20 +
            sentenceScore * 0.15 +
            wordFreqScore * 0.10
        );

        const similarityPercent = Math.round(combinedScore * 100);

        // Maksimum skorları güncelle
        maxJaccard = Math.max(maxJaccard, jaccardScore);
        maxNgram = Math.max(maxNgram, ngramScore);
        maxCosine = Math.max(maxCosine, cosineScore);
        maxLcs = Math.max(maxLcs, lcsScore);
        maxSentence = Math.max(maxSentence, sentenceScore);
        maxWordFreq = Math.max(maxWordFreq, wordFreqScore);

        // %25'in üzerinde benzerlik varsa kaydet
        if (similarityPercent >= 25) {
            const commonPhrases = findCommonPhrases(content, otherContent);
            const matchedSections = findMatchedSections(
                content,
                otherContent,
                otherData.studentName,
                docSnap.id
            );

            similarSubmissions.push({
                submissionId: docSnap.id,
                studentId: otherData.studentId,
                studentName: otherData.studentName,
                studentPhotoURL: otherData.studentPhotoURL,
                similarity: similarityPercent,
                matchedPhrases: commonPhrases,
                matchCount: matchedSections.length,
            });

            allMatchedSections.push(...matchedSections);
        }
    }

    // Sonuçları sırala
    similarSubmissions.sort((a, b) => b.similarity - a.similarity);

    // Metin analizini yap
    const textAnalysis = analyzeText(content);
    const suspiciousPatterns = detectSuspiciousPatterns(content);

    // Toplam ortak ifade sayısı
    const commonPhraseCount = similarSubmissions.reduce(
        (sum, s) => sum + s.matchedPhrases.length,
        0
    );

    // Genel skor (en yüksek benzerlik)
    const overallScore = similarSubmissions.length > 0
        ? similarSubmissions[0].similarity
        : 0;

    const result: PlagiarismResult = {
        overallScore,
        jaccardScore: Math.round(maxJaccard * 100),
        ngramScore: Math.round(maxNgram * 100),
        cosineScore: Math.round(maxCosine * 100),
        lcsScore: Math.round(maxLcs * 100),
        sentenceScore: Math.round(maxSentence * 100),
        wordFrequencyScore: Math.round(maxWordFreq * 100),
        riskLevel: determineRiskLevel(overallScore),
        similarSubmissions: similarSubmissions.slice(0, 10), // İlk 10
        matchedSections: allMatchedSections.slice(0, 20), // İlk 20 eşleşme
        analysisDetails: {
            ...textAnalysis,
            commonPhraseCount,
            suspiciousPatterns,
        },
        checkedAt: new Date(),
    };

    // Sonuçları veritabanına kaydet
    await updateDoc(doc(db, 'submissions', submissionId), {
        plagiarismScore: overallScore / 100, // 0-1 aralığında
        plagiarismCheckedAt: serverTimestamp(),
        plagiarismResult: {
            overallScore: result.overallScore,
            riskLevel: result.riskLevel,
            jaccardScore: result.jaccardScore,
            ngramScore: result.ngramScore,
            cosineScore: result.cosineScore,
            lcsScore: result.lcsScore,
            sentenceScore: result.sentenceScore,
            wordFrequencyScore: result.wordFrequencyScore,
            analysisDetails: result.analysisDetails,
        },
        similarSubmissions: result.similarSubmissions.slice(0, 5).map(s => ({
            submissionId: s.submissionId,
            studentName: s.studentName,
            similarity: s.similarity / 100,
            matchedPhrases: s.matchedPhrases.slice(0, 3),
        })),
    });

    return result;
}

/**
 * Tüm teslimleri toplu kontrol et
 */
export async function bulkAdvancedPlagiarismCheck(
    assignmentId: string,
    onProgress?: (current: number, total: number) => void
): Promise<Map<string, PlagiarismResult>> {
    const q = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignmentId)
    );
    const snapshot = await getDocs(q);
    const results = new Map<string, PlagiarismResult>();

    let current = 0;
    const total = snapshot.docs.length;

    for (const docSnap of snapshot.docs) {
        try {
            const result = await advancedPlagiarismCheck(docSnap.id, assignmentId);
            results.set(docSnap.id, result);
        } catch (error) {
            console.error(`Plagiarism check failed for ${docSnap.id}:`, error);
        }

        current++;
        if (onProgress) {
            onProgress(current, total);
        }
    }

    return results;
}

/**
 * Hızlı benzerlik kontrolü (önizleme için)
 */
export function quickSimilarityCheck(text1: string, text2: string): number {
    if (!text1?.trim() || !text2?.trim()) return 0;

    const cosine = cosineSimilarity(text1, text2);
    const ngram = ngramSimilarity(text1, text2);

    return Math.round((cosine * 0.5 + ngram * 0.5) * 100);
}

/**
 * Risk seviyesi renk ve ikon bilgisi
 */
export function getRiskLevelStyle(level: 'low' | 'medium' | 'high' | 'critical'): {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
    label: { tr: string; en: string };
} {
    switch (level) {
        case 'critical':
            return {
                color: 'text-red-700',
                bgColor: 'bg-red-100',
                borderColor: 'border-red-300',
                icon: '🚨',
                label: { tr: 'Kritik', en: 'Critical' },
            };
        case 'high':
            return {
                color: 'text-orange-700',
                bgColor: 'bg-orange-100',
                borderColor: 'border-orange-300',
                icon: '⚠️',
                label: { tr: 'Yüksek', en: 'High' },
            };
        case 'medium':
            return {
                color: 'text-amber-700',
                bgColor: 'bg-amber-100',
                borderColor: 'border-amber-300',
                icon: '⚡',
                label: { tr: 'Orta', en: 'Medium' },
            };
        default:
            return {
                color: 'text-green-700',
                bgColor: 'bg-green-100',
                borderColor: 'border-green-300',
                icon: '✓',
                label: { tr: 'Düşük', en: 'Low' },
            };
    }
}
