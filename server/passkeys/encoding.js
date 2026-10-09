export const bytesToBase64Url = (value) => Buffer.from(value).toString('base64url');
export const base64UrlToBytes = (value) => new Uint8Array(Buffer.from(value, 'base64url'));
