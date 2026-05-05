const SPREADSHEET_ID = '1MZ-3YdoViw8nDyop-0GVuylYF9oRYuplYbep2A1Juq8';
const SHEET_NAME = 'Tokens';
const LEGACY_SHEET_NAME = 'Жетоны';
const ADMIN_PASSWORD_PROPERTY = 'ADMIN_PASSWORD';
const DEFAULT_ADMIN_PASSWORD = 'wZ3inB6gsIbt';
const ADMIN_SESSION_PREFIX = 'admin_session_';

function doGet(event) {
  const action = event && event.parameter && event.parameter.action;

  try {
    if (action === 'getTokens') {
      return json_(200, getTokens_());
    }

    return json_(200, {
      ok: true,
      message: 'Tokens API is running',
    });
  } catch (error) {
    return json_(500, {
      error: cleanError_(error),
    });
  }
}

function doPost(event) {
  try {
    const body = parseBody_(event);
    const action = body.action;

    if (action === 'saveToken') {
      return json_(200, saveToken_(body.token));
    }

    if (action === 'updateToken') {
      return json_(200, updateToken_(body.tokenNumber, body.token, body.adminSession));
    }

    if (action === 'deleteToken') {
      return json_(200, deleteToken_(body.tokenNumber, body.adminSession));
    }

    if (action === 'verifyAdminPassword') {
      return json_(200, verifyAdminPassword_(body.password));
    }

    return json_(400, {
      error: 'Неизвестное действие',
    });
  } catch (error) {
    return json_(500, {
      error: cleanError_(error),
    });
  }
}

function getTokens_() {
  const sheet = ensureSheet_();
  const values = getTokenRows_(sheet);

  return values.map(row => ({
    tokenNumber: String(row[0]).trim().padStart(6, '0'),
    nickname: String(row[1] || '').trim(),
    passportNumber: String(row[2] || '').trim(),
    createdAt: row[3] || '',
    updatedAt: row[4] || '',
  }));
}

function saveToken_(token) {
  const sheet = ensureSheet_();
  const normalized = normalizeToken_(token);

  if (findTokenRow_(sheet, normalized.tokenNumber) !== -1) {
    throw new Error('Жетон уже существует');
  }

  const now = new Date();
  sheet.appendRow([
    normalized.tokenNumber,
    normalized.nickname,
    normalized.passportNumber,
    now,
    now,
  ]);
  SpreadsheetApp.flush();

  return {
    message: 'Жетон добавлен',
    tokens: getTokens_(),
  };
}

function updateToken_(tokenNumber, token, adminSession) {
  requireAdmin_(adminSession);

  const sheet = ensureSheet_();
  const normalizedNumber = normalizeTokenNumber_(tokenNumber);
  const row = findTokenRow_(sheet, normalizedNumber);

  if (row === -1) {
    throw new Error('Жетон не найден');
  }

  const normalized = normalizeToken_({
    tokenNumber: normalizedNumber,
    nickname: token.nickname,
    passportNumber: token.passportNumber,
  });

  sheet.getRange(row, 2, 1, 3).setValues([[
    normalized.nickname,
    normalized.passportNumber,
    new Date(),
  ]]);
  SpreadsheetApp.flush();

  return {
    message: 'Обновлено',
    tokens: getTokens_(),
  };
}

function deleteToken_(tokenNumber, adminSession) {
  requireAdmin_(adminSession);

  const sheet = ensureSheet_();
  const normalizedNumber = normalizeTokenNumber_(tokenNumber);
  const row = findTokenRow_(sheet, normalizedNumber);

  if (row === -1) {
    throw new Error('Жетон не найден');
  }

  sheet.deleteRow(row);
  SpreadsheetApp.flush();

  return {
    message: 'Удалено',
    tokens: getTokens_(),
  };
}

function verifyAdminPassword_(password) {
  const savedPassword = String(
    PropertiesService.getScriptProperties().getProperty(ADMIN_PASSWORD_PROPERTY) || DEFAULT_ADMIN_PASSWORD
  );

  if (String(password || '') !== savedPassword) {
    throw new Error('Неверный пароль администратора');
  }

  const sessionId = Utilities.getUuid();
  CacheService.getScriptCache().put(ADMIN_SESSION_PREFIX + sessionId, '1', 60 * 60 * 2);

  return {
    adminSession: sessionId,
    message: 'Админ-режим включен',
  };
}

function ensureSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = getDataSheet_(spreadsheet);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Номер жетона',
      'Никнейм',
      'Номер паспорта',
      'Создано',
      'Обновлено',
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.autoResizeColumns(1, 5);

  return sheet;
}

function getDataSheet_(spreadsheet) {
  const exactSheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (exactSheet) {
    return exactSheet;
  }

  const legacySheet = spreadsheet.getSheetByName(LEGACY_SHEET_NAME);

  if (legacySheet) {
    return legacySheet;
  }

  const sheets = spreadsheet.getSheets();
  const sheetWithTokenHeaders = sheets.find(sheet => hasTokenHeaders_(sheet));

  if (sheetWithTokenHeaders) {
    return sheetWithTokenHeaders;
  }

  return sheets[0] || null;
}

function hasTokenHeaders_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 3) {
    return false;
  }

  const headers = sheet
    .getRange(1, 1, 1, 3)
    .getDisplayValues()[0]
    .map(value => String(value || '').toLowerCase());

  return headers[0].includes('жетон') ||
    headers[0].includes('token') ||
    headers[1].includes('ник') ||
    headers[1].includes('nick') ||
    headers[2].includes('паспорт') ||
    headers[2].includes('passport');
}

function getTokenRows_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 1) {
    return [];
  }

  const hasHeaders = hasTokenHeaders_(sheet);
  const startRow = hasHeaders ? 2 : 1;

  if (lastRow < startRow) {
    return [];
  }

  return sheet
    .getRange(startRow, 1, lastRow - startRow + 1, Math.max(5, sheet.getLastColumn()))
    .getDisplayValues()
    .filter(row => String(row[0] || '').trim() !== '')
    .map(row => row.slice(0, 5));
}

function normalizeToken_(token) {
  const normalized = {
    tokenNumber: normalizeTokenNumber_(token && token.tokenNumber),
    nickname: String(token && token.nickname || '').trim(),
    passportNumber: String(token && token.passportNumber || '').trim(),
  };

  if (!normalized.nickname) {
    throw new Error('Никнейм обязателен');
  }

  if (!/^\d+$/.test(normalized.passportNumber)) {
    throw new Error('Номер паспорта должен быть числом');
  }

  return normalized;
}

function normalizeTokenNumber_(tokenNumber) {
  const value = String(tokenNumber || '').trim();

  if (!/^\d{6}$/.test(value)) {
    throw new Error('Номер жетона должен состоять ровно из 6 цифр');
  }

  return value;
}

function findTokenRow_(sheet, tokenNumber) {
  const rows = getTokenRows_(sheet);

  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]).trim().padStart(6, '0') === tokenNumber) {
      return index + (hasTokenHeaders_(sheet) ? 2 : 1);
    }
  }

  return -1;
}

function requireAdmin_(adminSession) {
  if (!adminSession) {
    throw new Error('Требуется авторизация администратора');
  }

  const sessionExists = CacheService
    .getScriptCache()
    .get(ADMIN_SESSION_PREFIX + adminSession);

  if (!sessionExists) {
    throw new Error('Сессия администратора истекла');
  }
}

function parseBody_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  return JSON.parse(event.postData.contents);
}

function json_(status, body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanError_(error) {
  return String(error && error.message ? error.message : error || 'Ошибка')
    .replace(/^Exception:\s*/, '');
}
