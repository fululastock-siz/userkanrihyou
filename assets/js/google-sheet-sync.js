/**
 * 株式会社アース 入居者管理システム
 * GoogleSheetSync - 完全自動クラウド共有 & Googleスプレッドシート連携エンジン
 */

(function(window) {
  'use strict';

  const SETTINGS_KEY = 'earth_google_sheet_settings_v2';

  const DEFAULT_SETTINGS = {
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1fjFlkIc29WlkZxYIP3hRNXRMYPW7MQpqcgCH3FjHnkY/edit?usp=sharing',
    gasWebAppUrl: '',
    autoSync: true,
    syncIntervalSec: 30, // 30秒ごとの定期自動同期
    lastSyncTime: null
  };

  class GoogleSheetSyncEngine {
    constructor() {
      this.settings = this.loadSettings();
      this.status = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured'
      this.autoPushTimer = null;
      this.periodicSyncTimer = null;
      this.listeners = [];
      this.isInitialPullDone = false;
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
      this.notifyStatusChange();
    }

    onStatusChange(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    }

    notifyStatusChange(extraMessage = '') {
      const statusInfo = this.getStatusInfo(extraMessage);
      this.listeners.forEach(fn => {
        try { fn(statusInfo); } catch (e) { console.error(e); }
      });
    }

    getStatusInfo(extraMessage = '') {
      const hasUrl = Boolean(this.settings.gasWebAppUrl && this.settings.gasWebAppUrl.trim());
      if (!hasUrl) {
        return {
          state: 'unconfigured',
          label: '☁️ クラウド未設定',
          tooltip: 'クリックしてGoogleスプレッドシートの自動共有URLを設定してください',
          class: 'badge-sync-unconfigured',
          lastSyncTime: this.settings.lastSyncTime
        };
      }

      if (this.status === 'syncing') {
        return {
          state: 'syncing',
          label: '🔄 同期中...',
          tooltip: 'クラウドと最新データを通信中です',
          class: 'badge-sync-syncing',
          lastSyncTime: this.settings.lastSyncTime
        };
      }

      if (this.status === 'error') {
        return {
          state: 'error',
          label: '⚠️ 同期エラー',
          tooltip: extraMessage || 'クラウド通信に失敗しました。URLまたはネット接続をご確認ください',
          class: 'badge-sync-error',
          lastSyncTime: this.settings.lastSyncTime
        };
      }

      return {
        state: 'synced',
        label: '🟢 自動共有中',
        tooltip: `全端末と自動同期中（最終同期: ${this.formatLastSyncTime()}）`,
        class: 'badge-sync-ok',
        lastSyncTime: this.settings.lastSyncTime
      };
    }

    formatLastSyncTime() {
      if (!this.settings.lastSyncTime) return '未同期';
      const d = new Date(this.settings.lastSyncTime);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    }

    /**
     * 自動同期エンジンの初期化（起動時に自動Pull＆定期ポーリング開始）
     */
    initAutoSync() {
      this.notifyStatusChange();

      if (!this.settings.gasWebAppUrl) {
        return;
      }

      // 1. 起動時の自動データ取得（Auto-Pull）
      this.pullFromSpreadsheet({ silent: true }).then(() => {
        this.isInitialPullDone = true;
        if (window.EarthApp && typeof window.EarthApp.showToast === 'function') {
          window.EarthApp.showToast('☁️ クラウドから最新データを自動同期しました', 'success');
        }
      }).catch(err => {
        console.warn('Initial pull failed:', err);
      });

      // 2. 定期自動同期タイマー（30秒ごと）
      if (this.periodicSyncTimer) clearInterval(this.periodicSyncTimer);
      const intervalMs = Math.max(15, this.settings.syncIntervalSec || 30) * 1000;
      this.periodicSyncTimer = setInterval(() => {
        if (this.settings.gasWebAppUrl && document.visibilityState === 'visible') {
          this.pullFromSpreadsheet({ silent: true }).catch(err => console.debug('Periodic sync skipped:', err));
        }
      }, intervalMs);
    }

    /**
     * 編集時のデバウンス自動送信トリガー（1.5秒後に自動Push）
     */
    triggerAutoPush() {
      if (!this.settings.gasWebAppUrl || !this.settings.autoSync) return;

      if (this.autoPushTimer) clearTimeout(this.autoPushTimer);
      this.autoPushTimer = setTimeout(() => {
        this.pushToSpreadsheet({ silent: true }).catch(err => {
          console.warn('Auto-push failed:', err);
        });
      }, 1500);
    }

    /**
     * Googleスプレッドシートから最新データを取得（Pull）
     */
    async pullFromSpreadsheet(options = { silent: false }) {
      if (!this.settings.gasWebAppUrl) {
        if (!options.silent) {
          throw new Error('Google Apps Script のウェブアプリURLが設定されていません。「連携設定」からURLを設定してください。');
        }
        return null;
      }

      this.status = 'syncing';
      this.notifyStatusChange();

      try {
        const res = await fetch(this.settings.gasWebAppUrl, {
          method: 'GET',
          mode: 'cors'
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: データ取得に失敗しました`);
        }

        const json = await res.json();
        if (json.status !== 'success' || !Array.isArray(json.residents)) {
          throw new Error(json.message || 'データ形式が不正です');
        }

        if (json.residents.length > 0) {
          window.DataStore.importFromExcel(json.residents, 'merge');
          if (window.EarthApp && typeof window.EarthApp.renderAll === 'function') {
            window.EarthApp.renderAll();
          }
        }

        this.status = 'synced';
        this.saveSettings({ lastSyncTime: new Date().toISOString() });
        return json.residents;

      } catch (err) {
        this.status = 'error';
        this.notifyStatusChange(err.message);
        if (!options.silent) throw err;
        return null;
      }
    }

    /**
     * 現在の入居者データをGoogleスプレッドシートへ送信（Push）
     */
    async pushToSpreadsheet(options = { silent: false }) {
      if (!this.settings.gasWebAppUrl) {
        if (!options.silent) {
          throw new Error('Google Apps Script のウェブアプリURLが設定されていません。「連携設定」からURLを設定してください。');
        }
        return null;
      }

      this.status = 'syncing';
      this.notifyStatusChange();

      try {
        const residents = window.DataStore.getAllResidents();
        const masters = window.DataStore.getMasters();
        const columns = window.DataStore.getColumns();

        const payload = {
          residents: residents,
          masters: masters,
          columns: columns,
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
          throw new Error(`HTTP ${res.status}: 送信に失敗しました`);
        }

        const json = await res.json();
        if (json.status !== 'success') {
          throw new Error(json.message || 'スプレッドシートへの保存に失敗しました');
        }

        this.status = 'synced';
        this.saveSettings({ lastSyncTime: new Date().toISOString() });
        return json;

      } catch (err) {
        this.status = 'error';
        this.notifyStatusChange(err.message);
        if (!options.silent) throw err;
        return null;
      }
    }

    /**
     * スプレッドシートに直接貼り付け可能なTSVテキストをクリップボードにコピー
     */
    copyTsvToClipboard() {
      const dataStore = window.DataStore;
      const residents = dataStore.getAllResidents();
      const columns = dataStore.getVisibleColumns();

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

  window.GoogleSheetSync = new GoogleSheetSyncEngine();
})(window);
