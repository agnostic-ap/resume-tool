export interface LocalizedSyncCopy {
  zh: string
  en: string
}

export function getSyncUnavailableCopy(error = ''): LocalizedSyncCopy {
  const suffixZh = error ? `：${error}` : ''
  const suffixEn = error ? `: ${error}` : ''
  return {
    zh: `云端服务不可用${suffixZh}`,
    en: `Cloud sync unavailable${suffixEn}`,
  }
}

export function getSyncLocalModeCopy(): LocalizedSyncCopy {
  return {
    zh: '云端服务不可用，数据会保存在本地',
    en: 'Cloud sync unavailable. Data is saved locally.',
  }
}

export function getSyncQueuedCopy(): LocalizedSyncCopy {
  return {
    zh: '本地已保存，云端同步恢复后会自动上传。',
    en: 'Saved locally. Upload when cloud sync is available.',
  }
}

export function getSyncPendingCopy(): LocalizedSyncCopy {
  return {
    zh: '正在同步到云端。',
    en: 'Syncing to cloud.',
  }
}

export function getSyncConnectedCopy(): LocalizedSyncCopy {
  return {
    zh: '云端同步已连接',
    en: 'Cloud sync connected',
  }
}

export function getSyncRestoredCopy(): LocalizedSyncCopy {
  return {
    zh: '云端同步已恢复',
    en: 'Cloud sync restored',
  }
}

export function getSyncStillUnavailableCopy(): LocalizedSyncCopy {
  return {
    zh: '云端服务仍不可用，继续使用本地模式',
    en: 'Cloud sync is still unavailable. Continuing locally.',
  }
}

export function getSyncRetryLaterCopy(): LocalizedSyncCopy {
  return {
    zh: '云端服务仍不可用，稍后可继续重试',
    en: 'Cloud sync is still unavailable. Try again later.',
  }
}

export function getSyncFailedActivityCopy(): LocalizedSyncCopy {
  return {
    zh: '云端同步失败，已进入重试队列',
    en: 'Cloud sync failed and was queued for retry',
  }
}
