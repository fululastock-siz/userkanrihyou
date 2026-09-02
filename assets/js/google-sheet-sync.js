/**
 * 株式会社アース 入居者管理システム
 * GoogleSheetSync - Googleスプレッドシート連携 & 同期モジュール
 */

(function(window) {
  'use strict';

  const SETTINGS_KEY = 'earth_google_sheet_settings_v1';

  const DEFAULT_SETTINGS = {
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1fjFlkIc29WlkZxYIP3hRNXRMYPW7MQpqcgCH3FjHnkY/edit?usp=sharing',
    gasWebAppUrl: '',
    autoSync: false,
    lastSyncTime: null
  };

  class GoogleSheetSync {
    constructor() {
      this.settings = this.loadSettings();
    }

    loadSettings() {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Failed to load Google Sheet settings:', e);
      }
      return { ...DEFAULT_SETTINGS };
    }

    saveSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    }

    /**
     * Googleスプレッドシートから最新データを取得
     */
    async pullFromSpreadsheet() {
      if (!this.settings.gasWebAppUrl) {
        throw new Error('Google Apps Script のウェブアプリURLが設定されていません。「連携設定」からURLを設定してください。');
      }

      const res = await fetch(this.settings.gasWebAppUrl, {
        method: 'GET',
        mode: 'cors'
      });

      if (!res.ok) {
        throw new Error(`スプレッドシートからのデータ取得に失敗しました (Status: ${res.status})`);
      }

      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.residents)) {
        throw new Error(json.message || 'データ形式が不正です');
      }

      window.DataStore.importFromExcel(json.residents, 'merge');
      this.saveSettings({ lastSyncTime: new Date().toISOString() });

      return json.residents;
    }

    /**
     * 現在の入居者データをGoogleスプレッドシートへ送信
     */
    async pushToSpreadsheet() {
      if (!this.settings.gasWebAppUrl) {
        throw new Error('Google Apps Script のウェブアプリURLが設定されていません。「連携設定」からURLを設定してください。');
      }

      const residents = window.DataStore.getAllResidents();
      const payload = {
        residents: residents,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(this.settings.gasWebAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`スプレッドシートへの保存に失敗しました (Status: ${res.status})`);
      }

      const json = await res.json();
      if (json.status !== 'success') {
        throw new Error(json.message || '保存に失敗しました');
      }

      this.saveSettings({ lastSyncTime: new Date().toISOString() });
      return json;
    }

    /**
     * スプレッドシートに直接貼り付け可能なTSVテキストをクリップボードにコピー
     */
    copyTsvToClipboard() {
      const dataStore = window.DataStore;
      const residents = dataStore.getAllResidents();
      const columns = dataStore.getColumns();

      const rows = [
        columns.map(c => c.label).join('\t')
      ];

      residents.forEach(r => {
        rows.push(
          columns.map(c => {
            const val = r[c.key];
            if (c.key === 'earlyFood') return val ? '早出し' : '';
            return val !== undefined && val !== null ? val : '';
          }).join('\t')
        );
      });

      const tsvText = rows.join('\n');
      return navigator.clipboard.writeText(tsvText);
    }
  }

  window.GoogleSheetSync = new GoogleSheetSync();
})(window);
