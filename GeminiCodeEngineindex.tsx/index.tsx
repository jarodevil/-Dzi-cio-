
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

/**
 * GEMINI CODE ENGINE - Klasa pomocnicza do zadań obliczeniowych
 */
export class GeminiCodeEngine {
  private ai: any;
  private modelName: string;

  constructor(apiKey: string, model: string = 'gemini-3-pro-preview') {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = model;
  }

  async executeTask(prompt: string, customConfig: any = {}) {
    const defaultConfig = {
      tools: [{ codeExecution: {} }],
      systemInstruction: "Wykonaj zadanie programistyczne. Odpowiadaj zawsze w języku polskim.",
    };
    const mergedConfig = { ...defaultConfig, ...customConfig };

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: mergedConfig,
      });
      return response;
    } catch (error) {
      console.error("GeminiCodeEngine Execution Error:", error);
      throw error;
    }
  }
}

/**
 * Bezpieczna inicjalizacja DOM
 * Zapobiega błędom "Cannot read properties of null (reading 'addEventListener')" 
 * gdy plik jest importowany jako moduł do głównej aplikacji.
 */
const initStandalone = () => {
    const runBtn = document.getElementById('runBtn');
    const promptInput = document.getElementById('promptInput');
    
    if (runBtn && promptInput) {
        runBtn.addEventListener('click', () => {
            console.log('GeminiCodeEngine: Uruchomiono w trybie standalone.');
        });
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStandalone);
    } else {
        initStandalone();
    }
}
