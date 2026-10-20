/**
 * WebSearchService - Live Web Reconnaissance Engine for ARYA.
 * Architect & Author: Shubhanshu Kumar Srivastav
 * Fetches real-time factual information, author details, biographies,
 * books, inventions, and general web knowledge in English & Hindi.
 * Zero external API key required.
 */
class WebSearchService {
  constructor() {
    this.userAgent = 'ARYA-AI-Assistant/2.0 (Author: Shubhanshu Kumar Srivastav; Tactical Neural Interface)';
  }

  /**
   * Check if user input is asking for web factual lookup (author, writer, creator, who is, what is, etc.)
   */
  isWebQuery(lowerText) {
    const triggers = [
      'author of', 'who wrote', 'who is the author', 'written by',
      'who invented', 'who discovered',
      'search web', 'search the web', 'look up on web', 'web search',
      // Hindi author patterns
      'ke lekhak', 'kisne likha', 'kisne likhi',
      'लेखक कौन', 'किसने लिखा', 'किसने लिखी'
    ];

    return triggers.some(t => lowerText.includes(t));
  }

  /**
   * Extract target search topic from prompt
   */
  extractSearchTopic(text) {
    let clean = text.trim();

    // Strip common prefixes including ARYA wake words
    clean = clean.replace(/^(?:hey\s+|हे\s+|अरे\s+)?(?:arya|आर्या|jarvis|ज़ार्विस)[,\s]*/i, '');
    clean = clean.replace(/^(?:please\s+|tell\s+me\s+|can\s+you\s+tell\s+me\s+)/i, '');

    // Pattern: "who is the author of X" / "author of X" -> extract X
    const authorMatch = clean.match(/(?:who\s+is\s+the\s+author\s+of|who\s+wrote|author\s+of|written\s+by)\s+([^?.]+)/i);
    if (authorMatch && authorMatch[1]) {
      return { topic: authorMatch[1].trim(), type: 'author' };
    }

    // Pattern: "who invented X" / "who created X"
    const creatorMatch = clean.match(/(?:who\s+invented|who\s+created|who\s+discovered|who\s+directed|who\s+founded)\s+([^?.]+)/i);
    if (creatorMatch && creatorMatch[1]) {
      return { topic: creatorMatch[1].trim(), type: 'creator' };
    }

    // Hindi pattern: "X ke lekhak kaun hain" / "X kisne likhi"
    const hindiAuthorMatch = clean.match(/(.+?)\s*(?:के\s+लेखक|ke\s+lekhak|किसने\s+लिखी|kisne\s+likhi|किसने\s+लिखा|kisne\s+likha)/i);
    if (hindiAuthorMatch && hindiAuthorMatch[1]) {
      return { topic: hindiAuthorMatch[1].trim(), type: 'author' };
    }

    // Generic "who is X" / "what is X"
    const genericMatch = clean.match(/(?:who\s+is|who\s+was|what\s+is|tell\s+me\s+about)\s+([^?.]+)/i);
    if (genericMatch && genericMatch[1]) {
      return { topic: genericMatch[1].trim(), type: 'general' };
    }

    return { topic: clean.replace(/[?.]+$/, '').trim(), type: 'general' };
  }

  /**
   * Perform live web lookup via Wikipedia API (supports English & Hindi)
   */
  async searchWeb(queryText, isHindi = false) {
    const { topic, type } = this.extractSearchTopic(queryText);
    const langCode = isHindi ? 'hi' : 'en';

    try {
      // 1. Search Wikipedia for matching articles
      const searchUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();

      let topResult = null;
      if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
        topResult = searchData.query.search[0];
      }

      // If Hindi search yielded no results, fallback to English Wikipedia
      if (!topResult && isHindi) {
        const fallbackRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`, {
          headers: { 'User-Agent': this.userAgent }
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.query && fallbackData.query.search && fallbackData.query.search.length > 0) {
            topResult = fallbackData.query.search[0];
            return await this.fetchPageSummary(topResult.title, 'en', topic, type, isHindi);
          }
        }
      }

      if (!topResult) return null;

      return await this.fetchPageSummary(topResult.title, langCode, topic, type, isHindi);
    } catch (err) {
      console.error('WebSearchService error:', err.message);
      return null;
    }
  }

  /**
   * Fetch rich summary and extract for a Wikipedia page
   */
  async fetchPageSummary(pageTitle, langCode, rawTopic, queryType, isHindi) {
    try {
      const summaryUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
      const res = await fetch(summaryUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!res.ok) return null;
      const data = await res.json();

      if (!data.extract) return null;

      // Extract first 1-2 key sentences for clear spoken voice
      const sentences = data.extract.split(/(?<=[.!?।])\s+/);
      const voiceExtract = sentences.slice(0, 2).join(' ');

      const pageUrl = data.content_urls ? data.content_urls.desktop.page : `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
      const thumbnail = data.thumbnail ? data.thumbnail.source : null;

      return {
        title: data.title || pageTitle,
        description: data.description || '',
        extract: data.extract,
        voiceText: voiceExtract,
        url: pageUrl,
        thumbnail,
        topic: rawTopic,
        queryType,
        lang: langCode
      };
    } catch (err) {
      console.error('fetchPageSummary error:', err.message);
      return null;
    }
  }

  /**
   * Format the final ARYA. voice and display response for web search findings
   */
  formatAryaWebResponse(searchResult, userName = 'Sir', isHindi = false) {
    if (!searchResult) return null;

    const { title, extract, voiceText, url, description } = searchResult;

    if (isHindi) {
      const speech = `लाइव वेब रिकॉर्ड्स के अनुसार, ${voiceText}`;
      const display = `🌐 **लाइव वेब खोज परिणाम (Live Web Reconnaissance):**\n### ${title}\n${description ? `*${description}*\n\n` : ''}${extract}\n\n🔗 **वेब स्रोत (Web Source):** [${title}](${url})`;

      return {
        speech,
        display,
        action: 'web_search',
        data: {
          title,
          url,
          source: 'Wikipedia Live Web'
        }
      };
    } else {
      const speech = `According to live web records, ${voiceText}, ${userName}.`;
      const display = `🌐 **LIVE WEB RECONNAISSANCE FINDINGS:**\n### ${title}\n${description ? `*${description}*\n\n` : ''}${extract}\n\n🔗 **Source:** [${title}](${url})`;

      return {
        speech,
        display,
        action: 'web_search',
        data: {
          title,
          url,
          source: 'Wikipedia Live Web'
        }
      };
    }
  }

  formatJarvisWebResponse(searchResult, userName = 'Sir', isHindi = false) {
    return this.formatAryaWebResponse(searchResult, userName, isHindi);
  }
}

module.exports = new WebSearchService();
