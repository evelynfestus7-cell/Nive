// js/ai-story-parser.js - AI Story Document Parser & Automated Choice Branching Generator
(function () {
  "use strict";

  function normalizeWhitespace(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function looksLikeBinaryGarbage(text) {
    if (!text) return true;
    const sample = String(text).slice(0, 4000);
    const replacementChars = (sample.match(/\uFFFD/g) || []).length;
    const controlChars = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const pdfMarkers = /%PDF-|endobj|xref|\/Type\s*\/Page|\/Filter|stream/.test(sample);
    return pdfMarkers || replacementChars > 10 || controlChars > 20;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function textToChapterHtml(text) {
    return normalizeWhitespace(text)
      .split(/\n{2,}/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  }

  async function readPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error("PDF support is still loading. Please wait a moment and try again.");
    }

    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || "").join(" ");
      if (pageText.trim()) pages.push(pageText.trim());
    }

    return normalizeWhitespace(pages.join("\n\n"));
  }

  async function readDocx(file) {
    if (!window.mammoth) {
      throw new Error("Word document support is still loading. Please wait a moment and try again.");
    }

    const buffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    return normalizeWhitespace(result.value || "");
  }

  window.NiveAIStoryParser = {
    // Intelligently parse raw manuscript text into chapters and auto-generated choice branches
    parseManuscript: function (rawText, storyTitle = "Untitled Interactive Story") {
      if (!rawText || typeof rawText !== "string") {
        throw new Error("No text content found in document.");
      }

      const text = normalizeWhitespace(rawText);
      if (looksLikeBinaryGarbage(text) || text.length < 80) {
        throw new Error("Could not extract readable story text from this file. Try a selectable-text PDF, DOCX, TXT, or MD file.");
      }
      
      // Split manuscript into chapters using regex patterns (Chapter 1, Part 1, ACT I, or double linebreaks)
      let rawChapters = text.split(/(?=Chapter\s+\d+|Part\s+\d+|ACT\s+[IVX]+|\n{3,})/i).filter(c => c.trim().length > 30);

      // Fallback if no chapter headers detected: split by word blocks (~400 words per chapter)
      if (rawChapters.length <= 1) {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        rawChapters = [];
        let currentChunk = [];
        let wordCount = 0;

        paragraphs.forEach(p => {
          currentChunk.push(p);
          wordCount += p.split(/\s+/).length;
          if (wordCount >= 350) {
            rawChapters.push(currentChunk.join("\n\n"));
            currentChunk = [];
            wordCount = 0;
          }
        });
        if (currentChunk.length) rawChapters.push(currentChunk.join("\n\n"));
      }

      if (!rawChapters.length) {
        rawChapters = [text];
      }

      // Generate structured chapters with automated interactive choices & narrative branches
      const structuredChapters = rawChapters.map((contentRaw, index) => {
        const chapterNum = index + 1;
        const totalChapters = rawChapters.length;
        const lines = contentRaw.trim().split("\n");
        
        let title = `Chapter ${chapterNum}`;
        let body = contentRaw.trim();

        // Extract heading if first line looks like a title
        if (lines[0] && lines[0].length < 80 && !lines[0].includes(".")) {
          title = lines[0].replace(/^#+\s*/, "").trim();
          body = lines.slice(1).join("\n").trim();
        }

        const choices = [];

        // If not the final chapter, generate smart choice branches leading to different paths/alternatives
        if (chapterNum < totalChapters) {
          const nextChapterId = `chap-${chapterNum + 1}`;
          const altChapterId = (chapterNum + 2 <= totalChapters) ? `chap-${chapterNum + 2}` : nextChapterId;

          choices.push({
            id: `choice-${chapterNum}-1`,
            text: `Proceed to Chapter ${chapterNum + 1}`,
            next: nextChapterId,
            targetChapterId: nextChapterId,
            xpReward: 15,
            coinReward: 5
          });

          choices.push({
            id: `choice-${chapterNum}-2`,
            text: `Investigate alternative outcome / bonus shortcut`,
            next: altChapterId,
            targetChapterId: altChapterId,
            xpReward: 25,
            coinReward: 10
          });
        }

        return {
          id: `chap-${chapterNum}`,
          title: title,
          chapterNumber: chapterNum,
          content: textToChapterHtml(body || contentRaw),
          choices: choices,
          isEnding: chapterNum === totalChapters
        };
      });

      return {
        title: storyTitle,
        totalChapters: structuredChapters.length,
        chapters: structuredChapters
      };
    },

    // Read uploaded document (PDF, DOCX, TXT)
    readDocumentFile: function (file) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("Please select a story document file."));

        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || file.type.includes("text")) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error("Failed to read text file."));
          reader.readAsText(file);
        } else if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
          readPdf(file).then(resolve).catch(reject);
        } else if (lowerName.endsWith(".docx") || file.type.includes("wordprocessingml.document")) {
          readDocx(file).then(resolve).catch(reject);
        } else if (lowerName.endsWith(".doc")) {
          reject(new Error("Legacy .doc files are not supported in-browser. Please save/export as .docx, .pdf, .txt, or .md."));
        } else {
          reject(new Error("Unsupported file type. Upload PDF, DOCX, TXT, or MD."));
        }
      });
    }
  };
})();
