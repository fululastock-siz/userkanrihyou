/**
 * 株式会社アース 入居者管理システム
 * GoogleSheetSync - 完全自動クラウド共有 & Googleスプレッドシート連携エンジン
 */

(function(window) {
  'use strict';

  const SETTINGS_KEY = 'earth_google_sheet_settings_v2';
  const PENDING_KEY = 'earth_cloud_sync_pending_v1';

  const DEFAULT_SETTINGS = {
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1fjFlkIc29WlkZxYIP3hRNXRMYPW7MQpqcgCH3FjHnkY/edit?usp=sharing',
    gasWebAppUrl: '',
    autoSync: true,
    syncIntervalSec: 30, // 表示中のみ30秒ごとに軽量な差分確認
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
      this.isApplyingCloudData = false;
      this.isDataStoreBound = false;
      this.pushInFlight = null;
      this.isPulling = false;
      this.lastCloudRevision = null;
      this.lifecycleSyncBound = false;
      this.lastImmediateSyncAt = 0;
    }

    loadSettings() {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
          loaded.syncIntervalSec = 30;
          return loaded;
        }
      } catch (e) {
        console.warn('Failed to load Google Sheet settings:', e);
      }
      return { ...DEFAULT_SETTINGS };
    }

    saveSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('Failed to save cloud sync settings:', e);
      }
      this.notifyStatusChange();
    }

    hasPendingWrite() {
      try {
        return Boolean(localStorage.getItem(PENDING_KEY));
      } catch (e) {
        return false;
      }
    }

    markPendingWrite() {
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ pending: true, queuedAt: new Date().toISOString() }));
      } catch (e) {
        console.warn('Failed to mark pending cloud write:', e);
      }
      this.notifyStatusChange();
    }

    clearPendingWrite() {
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch (e) {
        console.warn('Failed to clear pending cloud write:', e);
      }
    }

    bindDataStore() {
      if (this.isDataStoreBound || !window.DataStore) return;
      this.isDataStoreBound = true;
      window.DataStore.subscribe((_data, meta = {}) => {
        if (this.isApplyingCloudData || meta.source === 'cloud') return;
        this.markPendingWrite();
        this.triggerAutoPush({ alreadyMarked: true });
      });
    }

    requestImmediateSync() {
      if (!this.settings.gasWebAppUrl || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - this.lastImmediateSyncAt < 5000) return;
      this.lastImmediateSyncAt = now;
      this.pullFromSpreadsheet({ silent: true }).catch(err => {
        console.debug('Immediate cloud sync skipped:', err);
      });
    }

    bindLifecycleSync() {
      if (this.lifecycleSyncBound) return;
      this.lifecycleSyncBound = true;
      window.addEventListener('online', () => this.requestImmediateSync());
      window.addEventListener('focus', () => this.requestImmediateSync());
      window.addEventListener('pageshow', () => this.requestImmediateSync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.requestImmediateSync();
      });
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

      if (this.hasPendingWrite()) {
        return {
          state: 'pending',
          label: '🟠 クラウド送信待ち',
          tooltip: 'ブラウザに一時保存済みです。通信復旧後に自動送信します',
          class: 'badge-sync-pending',
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
      this.bindDataStore();
      this.bindLifecycleSync();
      this.notifyStatusChange();

      if (!this.settings.gasWebAppUrl) {
        return;
      }

      // 起動時は未送信データを先にクラウドへ退避してから最新データを取得する
      const startupSync = async () => {
        if (this.hasPendingWrite()) {
          await this.pushToSpreadsheet({ silent: true });
        } else {
          await this.pullFromSpreadsheet({ silent: true, skipPendingCheck: true });
        }
      };

      startupSync().then(() => {
        this.isInitialPullDone = true;
        if (!this.hasPendingWrite() && this.status === 'synced' && window.EarthApp && typeof window.EarthApp.showToast === 'function') {
          window.EarthApp.showToast('☁️ すべてのデータをクラウド同期しました', 'success');
        }
      }).catch(err => {
        console.warn('Initial pull failed:', err);
      });

      // 2. 定期自動同期タイマー（変更がなければ小さな応答だけを受信）
      if (this.periodicSyncTimer) clearInterval(this.periodicSyncTimer);
      const intervalMs = 30 * 1000;
      this.periodicSyncTimer = setInterval(() => {
        if (this.settings.gasWebAppUrl && document.visibilityState === 'visible') {
          this.pullFromSpreadsheet({ silent: true }).catch(err => console.debug('Periodic sync skipped:', err));
        }
      }, intervalMs);
    }

    /**
     * 編集時のデバウンス自動送信トリガー（1.5秒後に自動Push）
     */
    triggerAutoPush(options = {}) {
      if (!this.settings.gasWebAppUrl || !this.settings.autoSync) return;

      if (!options.alreadyMarked) this.markPendingWrite();

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

      if (this.isPulling) return null;
      this.isPulling = true;

      this.status = 'syncing';
      this.notifyStatusChange();

      try {
        // 未送信のローカル編集がある場合は、クラウド取得より先に必ず送信する
        if (!options.skipPendingCheck && this.hasPendingWrite()) {
          const pushed = await this.pushToSpreadsheet({ silent: options.silent });
          return pushed ? { pushed: true, residents: window.DataStore.getAllResidents() } : null;
        }

        const separator = this.settings.gasWebAppUrl.includes('?') ? '&' : '?';
        const params = new URLSearchParams({ t: String(Date.now()) });
        if (this.lastCloudRevision) params.set('since', this.lastCloudRevision);
        const res = await fetch(`${this.settings.gasWebAppUrl}${separator}${params.toString()}`, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store'
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: データ取得に失敗しました`);
        }

        const json = await res.json();
        if (json.status !== 'success') {
          throw new Error(json.message || 'データ形式が不正です');
        }

        // 変更がなければデータの置換・全画面再描画を行わない
        if (json.unchanged) {
          this.status = 'synced';
          this.saveSettings({ lastSyncTime: new Date().toISOString() });
          return { unchanged: true, residents: window.DataStore.getAllResidents() };
        }

        this.isApplyingCloudData = true;
        try {
          if (json.data && Array.isArray(json.data.residents)) {
            window.DataStore.applyCloudState(json.data);
            this.lastCloudRevision = json.revision || null;
          } else if (Array.isArray(json.residents) && json.residents.length > 0) {
            // 旧GASとの互換モード。既存の居室メモ等はマージで保持する
            window.DataStore.importFromExcel(json.residents, 'merge', { fileName: 'Cloud Legacy Sync' });
            this.markPendingWrite();
          }
        } finally {
          this.isApplyingCloudData = false;
        }

        this.status = 'synced';
        this.saveSettings({ lastSyncTime: new Date().toISOString() });
        if (json.storageMode === 'legacy' || (!json.data && Array.isArray(json.residents))) {
          this.triggerAutoPush({ alreadyMarked: true });
        }
        return json.data || json.residents;

      } catch (err) {
        this.status = 'error';
        this.notifyStatusChange(err.message);
        if (!options.silent) throw err;
        return null;
      } finally {
        this.isPulling = false;
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

      if (this.pushInFlight) return this.pushInFlight;

      this.status = 'syncing';
      this.notifyStatusChange();

      this.markPendingWrite();
      const cloudData = window.DataStore.exportCloudState();
      const sentUpdatedAt = cloudData.lastUpdated;
      const payload = {
        schemaVersion: 2,
        requestId: `cloud_write_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        clientUpdatedAt: sentUpdatedAt,
        data: cloudData,
        // 旧GASが再デプロイされるまでの互換項目
        residents: cloudData.residents,
        masters: cloudData.masters,
        columns: cloudData.columns,
        moveOutLogs: cloudData.moveOutLogs,
        snapshots: cloudData.snapshots,
        timestamp: sentUpdatedAt
      };

      this.pushInFlight = (async () => {
        try {
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
            throw new Error(json.message || 'クラウドへの保存に失敗しました');
          }

          this.lastCloudRevision = json.revision || null;
          const latestUpdatedAt = window.DataStore.exportCloudState().lastUpdated;
          if (latestUpdatedAt === sentUpdatedAt) {
            this.clearPendingWrite();
          } else {
            this.markPendingWrite();
            this.triggerAutoPush({ alreadyMarked: true });
          }

          this.status = 'synced';
          this.saveSettings({ lastSyncTime: new Date().toISOString() });
          return json;

        } catch (err) {
          // 送信失敗時は未送信フラグを残し、次回起動・定期同期で再送する
          this.markPendingWrite();
          this.status = 'error';
          this.notifyStatusChange(err.message);
          if (!options.silent) throw err;
          return null;
        } finally {
          this.pushInFlight = null;
        }
      })();

      return this.pushInFlight;
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
